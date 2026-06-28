export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

type ImportInspectionRow = {
  tipo: 'internas' | 'externas';
  numero_inspeccion: string;
  fecha_planificada: string;
  faena: string;
  inspector: string;
  hallazgos_count: number;
  estado: 'planificada' | 'realizada' | 'cerrada';
  empresa_externa?: string;
  contacto_externo?: string;
};

function resolveInspectionTable(tipo: string | null) {
  if (tipo === 'externas') return 'inspecciones_externas';
  return 'inspecciones_internas';
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeTipo(value: unknown): ImportInspectionRow['tipo'] {
  const text = normalizeText(value).toLowerCase();
  if (text === 'externa' || text === 'externas') return 'externas';
  return 'internas';
}

function normalizeNumero(value: unknown) {
  return normalizeText(value);
}

function normalizeEstado(value: unknown): ImportInspectionRow['estado'] {
  const text = normalizeText(value).toLowerCase();
  if (['realizada', 'realizado', 'ejecutada', 'ejecutado', 'completed'].includes(text)) return 'realizada';
  if (['cerrada', 'cerrado', 'close', 'closed'].includes(text)) return 'cerrada';
  return 'planificada';
}

function parseRows(text: string): ImportInspectionRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    tipo: headers.findIndex((h) => h.includes('tipo')),
    numero_inspeccion: headers.findIndex((h) => h.includes('numero') || h.includes('inspeccion')),
    fecha_planificada: headers.findIndex((h) => h.includes('fecha') && (h.includes('plan') || h.includes('program'))),
    faena: headers.findIndex((h) => h.includes('faena')),
    inspector: headers.findIndex((h) => h.includes('inspector')),
    hallazgos_count: headers.findIndex((h) => h.includes('hallazgo')),
    estado: headers.findIndex((h) => h.includes('estado')),
    empresa_externa: headers.findIndex((h) => h.includes('empresa')),
    contacto_externo: headers.findIndex((h) => h.includes('contacto')),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const numero_inspeccion = values[columns.numero_inspeccion] || '';
    const fecha_planificada = values[columns.fecha_planificada] || '';
    const faena = values[columns.faena] || '';
    const inspector = values[columns.inspector] || '';
    if (!numero_inspeccion || !fecha_planificada || !faena || !inspector) return [];

    return [
      {
        tipo: normalizeTipo(values[columns.tipo]),
        numero_inspeccion,
        fecha_planificada,
        faena,
        inspector,
        hallazgos_count: Number(values[columns.hallazgos_count] || 0),
        estado: normalizeEstado(values[columns.estado]),
        empresa_externa: values[columns.empresa_externa] || undefined,
        contacto_externo: values[columns.contacto_externo] || undefined,
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

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const tipo = request.nextUrl.searchParams.get('tipo');
    const estado = request.nextUrl.searchParams.get('estado');
    const table = resolveInspectionTable(tipo);

    let query = context.supabase
      .from(table)
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('fecha_planificada', { ascending: false });

    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;
    
    if (error) {
      console.error('[v0] Error fetching inspecciones:', error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('[v0] Error in inspecciones GET:', error);
    return NextResponse.json({ data: [] });
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
        return NextResponse.json({ error: 'No se encontraron inspecciones validas en el archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      let imported = 0;
      let updated = 0;

      for (const row of rows) {
        const table = resolveInspectionTable(row.tipo);
        const { data: existing } = await context.supabase
          .from(table)
          .select('id')
          .eq('organization_id', context.organizationId)
          .eq('numero_inspeccion', row.numero_inspeccion)
          .maybeSingle();

        const payload: Record<string, unknown> = {
          organization_id: context.organizationId,
          numero_inspeccion: normalizeNumero(row.numero_inspeccion),
          fecha_planificada: row.fecha_planificada,
          fecha_realizada: row.estado === 'realizada' ? row.fecha_planificada : null,
          faena: normalizeText(row.faena),
          inspector: normalizeText(row.inspector),
          hallazgos_count: row.hallazgos_count,
          estado: row.estado,
          updated_at: new Date().toISOString(),
        };

        if (table === 'inspecciones_externas') {
          payload.empresa_externa = row.empresa_externa ? normalizeText(row.empresa_externa) : null;
          payload.contacto_externo = row.contacto_externo ? normalizeText(row.contacto_externo) : null;
        }

        if (existing?.id) {
          const { error } = await context.supabase.from(table).update(payload).eq('id', existing.id);
          if (error) throw error;
          updated += 1;
        } else {
          payload.organization_id = context.organizationId;
          payload.created_by = context.userId;
          const { error } = await context.supabase.from(table).insert(payload);
          if (error) throw error;
          imported += 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${rows.length} inspecciones`,
        imported,
        updated,
      });
    }

    const body = await request.json();
    const table = resolveInspectionTable(normalizeTipo(body.tipo));

    const payload: Record<string, unknown> = {
      organization_id: context.organizationId,
      numero_inspeccion: normalizeNumero(body.numero_inspeccion),
      fecha_planificada: body.fecha_planificada,
      fecha_realizada: body.estado === 'realizada' ? body.fecha_planificada : null,
      faena: normalizeText(body.faena),
      inspector: normalizeText(body.inspector),
      hallazgos_count: Number(body.hallazgos_count || 0),
      estado: normalizeEstado(body.estado),
      created_by: context.userId,
      updated_at: new Date().toISOString(),
    };

    if (table === 'inspecciones_externas') {
      payload.empresa_externa = body.empresa_externa ? normalizeText(body.empresa_externa) : null;
      payload.contacto_externo = body.contacto_externo ? normalizeText(body.contacto_externo) : null;
    }

    const { data, error } = await context.supabase
      .from(table)
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la inspección';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const table = resolveInspectionTable(normalizeTipo(body.tipo));

    const payload: Record<string, unknown> = {
      fecha_planificada: body.fecha_planificada,
      fecha_realizada:
        normalizeEstado(body.estado) === 'realizada' ? body.fecha_realizada || body.fecha_planificada : null,
      faena: normalizeText(body.faena),
      inspector: normalizeText(body.inspector),
      hallazgos_count: Number(body.hallazgos_count || 0),
      estado: normalizeEstado(body.estado),
      updated_at: new Date().toISOString(),
    };

    if (table === 'inspecciones_externas') {
      payload.empresa_externa = body.empresa_externa ? normalizeText(body.empresa_externa) : null;
      payload.contacto_externo = body.contacto_externo ? normalizeText(body.contacto_externo) : null;
    }

    const { data, error } = await context.supabase
      .from(table)
      .update(payload)
      .eq('id', body.id)
      .eq('organization_id', context.organizationId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar la inspección';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const id = request.nextUrl.searchParams.get('id');
    const tipo = request.nextUrl.searchParams.get('tipo');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await context.supabase
      .from(resolveInspectionTable(normalizeTipo(tipo)))
      .delete()
      .eq('id', id)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la inspección';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
