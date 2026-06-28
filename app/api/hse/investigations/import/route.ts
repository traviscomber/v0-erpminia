export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseCsvRows(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    incident_id: pickIndex(headers, ['incident_id', 'incidente', 'codigo_incidente']),
    root_cause: pickIndex(headers, ['root_cause', 'causa', 'causa_raiz']),
    corrective_actions: pickIndex(headers, ['corrective_actions', 'acciones', 'acciones_correctivas']),
    assigned_to: pickIndex(headers, ['assigned_to', 'responsable', 'asignado']),
    target_date: pickIndex(headers, ['target_date', 'fecha', 'objetivo']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const incident_id = values[columns.incident_id] || '';
    const root_cause = values[columns.root_cause] || '';
    if (!incident_id || !root_cause) return [];

    return [
      {
        incident_id,
        root_cause,
        corrective_actions: values[columns.corrective_actions] || '',
        assigned_to: values[columns.assigned_to] || '',
        target_date: values[columns.target_date] || new Date().toISOString(),
      },
    ];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = (await import('xlsx')) as any;
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  if (!rows.length) return [];

  const csvText = [rows[0].map((value) => normalizeText(value)).join(';'), ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';'))].join('\n');
  return parseCsvRows(csvText);
}

async function parseImportFile(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.csv')) return parseCsvRows(await file.text());
  if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) return parseWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Se requiere archivo CSV, XLS o XLSX' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    const rows = await parseImportFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron investigaciones validas en el archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

    for (const row of rows) {
      const payload = {
        organization_id: context.organizationId,
        incident_id: row.incident_id,
        root_cause: row.root_cause,
        corrective_actions: row.corrective_actions,
        assigned_to: row.assigned_to,
        target_date: row.target_date,
        status: 'open',
        created_at: new Date().toISOString(),
      };

      const { data: existing, error: lookupError } = await context.supabase
        .from('hse_investigations')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('incident_id', row.incident_id)
        .eq('root_cause', row.root_cause)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing?.id) {
        const { error } = await context.supabase
          .from('hse_investigations')
          .update(payload)
          .eq('id', existing.id)
          .eq('organization_id', context.organizationId);
        if (error) throw error;
        updated += 1;
      } else {
        const { error } = await context.supabase.from('hse_investigations').insert(payload);
        if (error) throw error;
        imported += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se procesaron ${rows.length} investigaciones`,
      imported,
      updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron importar las investigaciones';
    console.error('[hse][investigations][import] error:', message);
    return NextResponse.json({ error: message, imported: 0, updated: 0 }, { status: 500 });
  }
}
