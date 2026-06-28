export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  buildOrgSequence,
  getSustainabilityContext,
  isPastDue,
  normalizeNcStatus,
} from '@/lib/api/sostenibilidad-mvp';

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

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
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
        category: values[columns.category] || 'safety',
        severity: values[columns.severity] || 'medium',
        source: values[columns.source] || 'internal_audit',
        discovered_date: values[columns.discovered_date] || new Date().toISOString().split('T')[0],
        root_cause: values[columns.root_cause] || null,
        impact_description: values[columns.impact_description] || null,
        target_closure_date: values[columns.target_closure_date] || null,
        status: values[columns.status] || 'open',
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
  return parseRows(csvText);
}

async function parseImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseRows(await file.text());
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return parseWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

function buildStats(rows: Array<{ status: string | null; target_closure_date: string | null }>) {
  const normalized = rows.map((row) => ({
    ...row,
    status: normalizeNcStatus(row.status),
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

    const rows = (data || []).map((row) => ({
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
          .eq('discovered_date', row.discovered_date)
          .maybeSingle();

        const payload = {
          organization_id: context.organizationId,
          title: row.title,
          description: row.description,
          category: row.category,
          severity: row.severity,
          source: row.source,
          discovered_date: row.discovered_date,
          reported_by: context.userId,
          assigned_to: context.userId,
          status: normalizeNcStatus(row.status),
          root_cause: row.root_cause,
          impact_description: row.impact_description,
          target_closure_date: row.target_closure_date,
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
        title: body.title,
        description: body.description || null,
        category: body.category || 'safety',
        severity: body.severity || 'medium',
        source: body.source || 'internal_audit',
        discovered_date: body.discoveredDate || new Date().toISOString().split('T')[0],
        reported_by: context.userId,
        assigned_to: context.userId,
        status: 'open',
        root_cause: body.rootCause || null,
        impact_description: body.impactDescription || null,
        target_closure_date: body.targetClosureDate || null,
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
        title: body.title,
        description: body.description,
        category: body.category,
        severity: body.severity,
        source: body.source,
        root_cause: body.root_cause || body.rootCause || null,
        impact_description: body.impact_description || body.impactDescription || null,
        status: body.status ? normalizeNcStatus(body.status) : undefined,
        target_closure_date: body.target_closure_date || body.targetClosureDate || null,
        actual_closure_date: body.actual_closure_date || null,
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
