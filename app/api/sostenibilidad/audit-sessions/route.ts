export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { loadXlsxModule, sheetToMatrix } from '@/lib/xlsx';

type AuditImportRow = {
  audit_name: string;
  category: string;
  compliance_status: string;
  auditor: string;
  evidence_count: number;
};

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeComplianceStatus(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['compliant', 'conforme', 'cumple'].includes(text)) return 'compliant';
  if (['non_compliant', 'no_conforme', 'no cumple'].includes(text)) return 'non_compliant';
  return 'in_progress';
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseAuditRows(text: string): AuditImportRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    audit_name: pickIndex(headers, ['audit_name', 'audit name', 'nombre_auditoria', 'auditoria']),
    category: pickIndex(headers, ['category', 'categoria']),
    compliance_status: pickIndex(headers, ['compliance_status', 'compliance status', 'estado_cumplimiento', 'estado']),
    auditor: pickIndex(headers, ['auditor', 'responsable']),
    evidence_count: pickIndex(headers, ['evidence_count', 'evidence count', 'evidencias']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const auditName = values[columns.audit_name] || '';
    if (!auditName) return [];

    return [{
      audit_name: auditName,
      category: values[columns.category] || 'ISO',
      compliance_status: values[columns.compliance_status] || 'in_progress',
      auditor: values[columns.auditor] || 'Por asignar',
      evidence_count: parseNumber(values[columns.evidence_count]),
    }];
  });
}

async function parseAuditWorkbook(file: File) {
  const xlsx = await loadXlsxModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = sheetToMatrix(xlsx, sheet, true);
  if (!rows.length) return [];

  const csvText = [
    rows[0].map((value) => normalizeText(value)).join(';'),
    ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';')),
  ].join('\n');

  return parseAuditRows(csvText);
}

async function parseAuditImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseAuditRows(await file.text());
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return parseAuditWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

type SustainabilitySupabaseClient = Extract<Awaited<ReturnType<typeof getSustainabilityContext>>, { ok: true }>['supabase'];

async function selectAuditSessions(supabase: SustainabilitySupabaseClient, organizationId: string, limit: number) {
  const candidateColumns = ['organization_id', 'org_id'] as const;

  for (const column of candidateColumns) {
    const { data, error } = await supabase
      .from('compliance_audit_log')
      .select('*')
      .eq(column, organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error) {
      return { data, error: null };
    }

    const message = String(error.message || '').toLowerCase();
    const looksLikeMissingColumn =
      message.includes(column) && (message.includes('column') || message.includes('does not exist'));

    if (!looksLikeMissingColumn) {
      return { data: null, error };
    }
  }

  return supabase
    .from('compliance_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

async function insertAuditSession(
  supabase: SustainabilitySupabaseClient,
  organizationId: string,
  payload: Record<string, unknown>
) {
  const candidateColumns = ['organization_id', 'org_id'] as const;

  for (const column of candidateColumns) {
    const { data, error } = await supabase
      .from('compliance_audit_log')
      .insert({
        [column]: organizationId,
        ...payload,
      })
      .select('*')
      .single();

    if (!error) {
      return { data, error: null };
    }

    const message = String(error.message || '').toLowerCase();
    const looksLikeMissingColumn =
      message.includes(column) && (message.includes('column') || message.includes('does not exist'));

    if (!looksLikeMissingColumn) {
      return { data: null, error };
    }
  }

  return supabase
    .from('compliance_audit_log')
    .insert(payload)
    .select('*')
    .single();
}

export async function GET(request: NextRequest) {
  try {
    const context = await getSustainabilityContext(request);
    if (!context.ok) return context.response;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const { data, error } = await selectAuditSessions(context.supabase, context.organizationId, limit);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las auditorías';
    console.error('[sostenibilidad][audit-sessions] GET fallback:', message);
    return NextResponse.json({ data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getSustainabilityContext(request);
    if (!context.ok) return context.response;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No se proporcionó archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      const rows = await parseAuditImportFile(file);
      if (rows.length === 0) {
        return NextResponse.json({ error: 'No se encontraron auditorías válidas en el archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      let imported = 0;
      let updated = 0;
      const { data: existingRows, error: existingError } = await selectAuditSessions(context.supabase, context.organizationId, 500);
      if (existingError) throw existingError;

      for (const row of rows) {
        const auditName = normalizeText(row.audit_name) || 'Auditoría sin nombre';
        const category = normalizeText(row.category) || 'ISO';
        const auditor = normalizeText(row.auditor) || context.userName || 'Por asignar';
        const evidenceCount = Number.isFinite(row.evidence_count) ? row.evidence_count : 0;
        const complianceStatus = normalizeComplianceStatus(row.compliance_status);

        const match = Array.isArray(existingRows)
          ? existingRows.find((item) =>
              normalizeText(item.audit_name).toLowerCase() === auditName.toLowerCase()
              && normalizeText(item.category).toLowerCase() === category.toLowerCase()
            )
          : null;

        if (match?.id) {
          const { error } = await context.supabase
            .from('compliance_audit_log')
            .update({
              audit_name: auditName,
              category,
              compliance_status: complianceStatus,
              auditor,
              evidence_count: evidenceCount,
            })
            .eq('id', match.id);
          if (error) throw error;
          updated += 1;
        } else {
          const { error } = await insertAuditSession(context.supabase, context.organizationId, {
            audit_name: auditName,
            category,
            compliance_status: complianceStatus,
            auditor,
            evidence_count: evidenceCount,
          });
          if (error) throw error;
          imported += 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${rows.length} auditorías de cumplimiento`,
        imported,
        updated,
      });
    }

    const body = await request.json();
    const auditName =
      normalizeText(body.audit_name || body.name || body.auditName) || 'Auditoría sin nombre';
    const category = normalizeText(body.category || body.auditCategory) || 'ISO';
    const auditor =
      normalizeText(body.auditor || body.responsible || body.auditor_name || context.userName) ||
      'Por asignar';
    const evidenceCount = Number(body.evidence_count ?? body.evidenceCount ?? 0);
    const complianceStatus = normalizeComplianceStatus(body.compliance_status || body.status);

    const { data, error } = await insertAuditSession(context.supabase, context.organizationId, {
      audit_name: auditName,
      category,
      compliance_status: complianceStatus,
      auditor,
      evidence_count: Number.isFinite(evidenceCount) ? evidenceCount : 0,
    });

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo registrar la auditoría';
    console.error('[sostenibilidad][audit-sessions] POST fallback:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
