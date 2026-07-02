export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  buildOrgSequence,
  getSustainabilityContext,
  isPastDue,
  normalizeNcStatus,
} from '@/lib/api/sostenibilidad-mvp';
import { loadXlsxModule, sheetToMatrix } from '@/lib/xlsx';

type ImportNcRow = {
  title: string;
  description: string | null;
  category: string;
  severity: string;
  source: string;
  discovered_date: string;
  root_cause: string | null;
  impact_description: string | null;
  target_closure_date: string | null;
  status: string;
};

type NonconformanceDbRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  severity?: string | null;
  source?: string | null;
  discovered_date?: string | null;
  root_cause?: string | null;
  impact_description?: string | null;
  target_closure_date?: string | null;
  status?: string | null;
};

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const text = normalizeText(value);
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dayMonthYearMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayMonthYearMatch) {
    const day = dayMonthYearMatch[1].padStart(2, '0');
    const month = dayMonthYearMatch[2].padStart(2, '0');
    return `${dayMonthYearMatch[3]}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return text;
}

function normalizeCategory(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['environment', 'ambiental', 'medio ambiente', 'medio_ambiente'].includes(text)) return 'environment';
  if (['quality', 'calidad'].includes(text)) return 'quality';
  if (['process', 'proceso', 'operational', 'operacional'].includes(text)) return 'process';
  return 'safety';
}

function normalizeSeverity(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['critical', 'critico', 'crítico'].includes(text)) return 'critical';
  if (['high', 'alta'].includes(text)) return 'high';
  if (['low', 'baja'].includes(text)) return 'low';
  return 'medium';
}

function normalizeSource(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['inspection', 'inspeccion', 'inspección'].includes(text)) return 'inspection';
  if (['audit', 'auditoria', 'auditoría'].includes(text)) return 'internal_audit';
  if (['complaint', 'queja', 'reclamo'].includes(text)) return 'complaint';
  if (['incident', 'incidente'].includes(text)) return 'incident';
  return 'internal_audit';
}

function normalizeStatus(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['open', 'abierta', 'abierto'].includes(text)) return 'open';
  if (['in_progress', 'en progreso', 'en_progreso', 'progress'].includes(text)) return 'in_progress';
  if (['closed', 'cerrada', 'cerrado', 'resolved', 'resuelta', 'resuelto'].includes(text)) return 'closed';
  return 'open';
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseRows(text: string): ImportNcRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    title: headers.findIndex((h) => h.includes('title') || h.includes('titulo')),
    description: headers.findIndex((h) => h.includes('description') || h.includes('descripcion')),
    category: headers.findIndex((h) => h.includes('category') || h.includes('categoria')),
    severity: headers.findIndex((h) => h.includes('severity') || h.includes('severidad')),
    source: headers.findIndex((h) => h.includes('source') || h.includes('origen')),
    discovered_date: headers.findIndex((h) => h.includes('discovered') || h.includes('detect') || h.includes('fecha')),
    root_cause: headers.findIndex((h) => h.includes('root') || h.includes('causa')),
    impact_description: headers.findIndex((h) => h.includes('impact')),
    target_closure_date: headers.findIndex((h) => h.includes('closure') || h.includes('cierre')),
    status: headers.findIndex((h) => h.includes('status') || h.includes('estado')),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const title = values[columns.title] || '';
    if (!title) return [];

    return [
      {
        title,
        description: values[columns.description] || null,
        category: normalizeCategory(values[columns.category]),
        severity: normalizeSeverity(values[columns.severity]),
        source: normalizeSource(values[columns.source]),
        discovered_date: normalizeDate(values[columns.discovered_date]) || new Date().toISOString().split('T')[0],
        root_cause: values[columns.root_cause] || null,
        impact_description: values[columns.impact_description] || null,
        target_closure_date: normalizeDate(values[columns.target_closure_date]),
        status: normalizeStatus(values[columns.status]),
      },
    ];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = await loadXlsxModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = sheetToMatrix(xlsx, sheet, true);
  if (!rows.length) return [];

  const csvText = [rows[0].map((value) => normalizeText(value)).join(';'), ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';'))].join('\n');
  return parseRows(csvText);
}

async function parseImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseRows(await file.text());
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return parseWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

type NonconformanceStatsRow = {
  status: string | null;
  target_closure_date?: string | null;
};

function buildStats(rows: NonconformanceStatsRow[]) {
  const normalized = rows.map((row) => ({
    status: normalizeNcStatus(row.status),
    target_closure_date: row.target_closure_date ?? null,
  }));

  return {
    total: normalized.length,
    open: normalized.filter((row) => row.status === 'open').length,
    in_progress: normalized.filter((row) => row.status === 'in_progress').length,
    closed: normalized.filter((row) => row.status === 'closed').length,
    overdue: normalized.filter(
      (row) => row.status !== 'closed' && isPastDue(row.target_closure_date)
    ).length,
  };
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');

    let query = context.supabase
      .from('sostenibilidad_nonconformances')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (severity) query = query.eq('severity', severity);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (Array.isArray(data) ? (data as NonconformanceDbRow[]) : []).map((row) => ({
      ...row,
      status: normalizeNcStatus(row.status),
    }));

    return NextResponse.json({
      data: rows,
      nonconformances: rows,
      stats: buildStats(rows),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las no conformidades';
    console.error('[sostenibilidad][nonconformances] GET fallback:', message);
    return NextResponse.json({
      data: [],
      nonconformances: [],
      stats: {
        total: 0,
        open: 0,
        in_progress: 0,
        closed: 0,
        overdue: 0,
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No se proporciono archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      const rows = await parseImportFile(file);
      if (rows.length === 0) {
        return NextResponse.json({ error: 'No se encontraron no conformidades validas', imported: 0, updated: 0 }, { status: 400 });
      }

      let imported = 0;
      let updated = 0;

      for (const row of rows) {
        const { data: existing } = await context.supabase
          .from('sostenibilidad_nonconformances')
          .select('id')
          .eq('organization_id', context.organizationId)
          .eq('title', row.title)
          .eq('category', normalizeCategory(row.category))
          .eq('source', normalizeSource(row.source))
          .maybeSingle();

        const payload = {
          organization_id: context.organizationId,
          title: normalizeText(row.title),
          description: row.description ? normalizeText(row.description) : null,
          category: normalizeCategory(row.category),
          severity: normalizeSeverity(row.severity),
          source: normalizeSource(row.source),
          discovered_date: normalizeDate(row.discovered_date) || new Date().toISOString().split('T')[0],
          reported_by: context.userId,
          assigned_to: context.userId,
          status: normalizeStatus(row.status),
          root_cause: row.root_cause ? normalizeText(row.root_cause) : null,
          impact_description: row.impact_description ? normalizeText(row.impact_description) : null,
          target_closure_date: normalizeDate(row.target_closure_date),
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await context.supabase.from('sostenibilidad_nonconformances').update(payload).eq('id', existing.id);
          if (error) throw error;
          updated += 1;
        } else {
          const ncNumber = await buildOrgSequence(
            context.supabase,
            'sostenibilidad_nonconformances',
            context.organizationId,
            'NC'
          );

          const { error } = await context.supabase.from('sostenibilidad_nonconformances').insert({
            ...payload,
            nc_number: ncNumber,
            reported_by: context.userId,
            assigned_to: context.userId,
            status: normalizeNcStatus(row.status),
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
          imported += 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${rows.length} no conformidades`,
        imported,
        updated,
      });
    }

    const body = await request.json();
    const ncNumber = await buildOrgSequence(
      context.supabase,
      'sostenibilidad_nonconformances',
      context.organizationId,
      'NC'
    );

    const { data, error } = await context.supabase
      .from('sostenibilidad_nonconformances')
      .insert({
        organization_id: context.organizationId,
        nc_number: ncNumber,
        title: normalizeText(body.title),
        description: body.description ? normalizeText(body.description) : null,
        category: normalizeCategory(body.category),
        severity: normalizeSeverity(body.severity),
        source: normalizeSource(body.source),
        discovered_date:
          normalizeDate(body.discoveredDate || body.discovered_date) ||
          new Date().toISOString().split('T')[0],
        reported_by: context.userId,
        assigned_to: context.userId,
        status: normalizeStatus(body.status),
        root_cause: normalizeText(body.rootCause || body.root_cause) || null,
        impact_description: normalizeText(body.impactDescription || body.impact_description) || null,
        target_closure_date: normalizeDate(body.targetClosureDate || body.target_closure_date),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data, id: data.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la no conformidad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from('sostenibilidad_nonconformances')
      .update({
        title: body.title ? normalizeText(body.title) : undefined,
        description: body.description !== undefined ? normalizeText(body.description) : undefined,
        category: body.category ? normalizeCategory(body.category) : undefined,
        severity: body.severity ? normalizeSeverity(body.severity) : undefined,
        source: body.source ? normalizeSource(body.source) : undefined,
        root_cause:
          body.root_cause !== undefined || body.rootCause !== undefined
            ? normalizeText(body.root_cause || body.rootCause) || null
            : undefined,
        impact_description:
          body.impact_description !== undefined || body.impactDescription !== undefined
            ? normalizeText(body.impact_description || body.impactDescription) || null
            : undefined,
        status: body.status ? normalizeStatus(body.status) : undefined,
        target_closure_date:
          body.target_closure_date !== undefined || body.targetClosureDate !== undefined
            ? normalizeDate(body.target_closure_date || body.targetClosureDate)
            : undefined,
        actual_closure_date:
          body.actual_closure_date !== undefined ? normalizeDate(body.actual_closure_date) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('organization_id', context.organizationId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la no conformidad';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
