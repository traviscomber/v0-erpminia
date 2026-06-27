export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { getHseModuleData } from '@/lib/api/hse-data';

type ImportTrainingRow = {
  nombre_capacitacion: string;
  tipo: string;
  tema: string;
  programa_hse: string;
  proveedor_instructor: string;
  fecha_programada: string;
  hora_inicio: string | null;
  hora_termino: string | null;
  duracion_horas: number;
  cantidad_asistentes: number;
  faenas_cargos: string[];
  estado: 'programada' | 'realizada' | 'cancelada';
};

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

function parseList(value: unknown) {
  return normalizeText(value)
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEstado(value: unknown): ImportTrainingRow['estado'] {
  const text = normalizeText(value).toLowerCase();
  if (text === 'realizada' || text === 'realizado') return 'realizada';
  if (text === 'cancelada' || text === 'cancelado') return 'cancelada';
  return 'programada';
}

function parseCsvRows(text: string): ImportTrainingRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    nombre_capacitacion: headers.findIndex((h) => h.includes('nombre') && h.includes('capacit')),
    tipo: headers.findIndex((h) => h.includes('tipo')),
    tema: headers.findIndex((h) => h.includes('tema')),
    programa_hse: headers.findIndex((h) => h.includes('programa')),
    proveedor_instructor: headers.findIndex((h) => h.includes('proveedor') || h.includes('instructor')),
    fecha_programada: headers.findIndex((h) => h.includes('fecha') && h.includes('program')),
    hora_inicio: headers.findIndex((h) => h.includes('hora') && h.includes('inicio')),
    hora_termino: headers.findIndex((h) => h.includes('hora') && (h.includes('termino') || h.includes('tÃ©rmino'))),
    duracion_horas: headers.findIndex((h) => h.includes('duracion')),
    cantidad_asistentes: headers.findIndex((h) => h.includes('asistente')),
    faenas_cargos: headers.findIndex((h) => h.includes('faena') || h.includes('cargo')),
    estado: headers.findIndex((h) => h.includes('estado')),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const nombre_capacitacion = values[columns.nombre_capacitacion] || values[0] || '';
    const fecha_programada = values[columns.fecha_programada] || '';

    if (!nombre_capacitacion || !fecha_programada) return [];

    return [{
      nombre_capacitacion,
      tipo: values[columns.tipo] || 'HSE',
      tema: values[columns.tema] || '',
      programa_hse: values[columns.programa_hse] || '',
      proveedor_instructor: values[columns.proveedor_instructor] || '',
      fecha_programada,
      hora_inicio: values[columns.hora_inicio] || null,
      hora_termino: values[columns.hora_termino] || null,
      duracion_horas: Number(values[columns.duracion_horas] || 0),
      cantidad_asistentes: Number(values[columns.cantidad_asistentes] || 0),
      faenas_cargos: parseList(values[columns.faenas_cargos]),
      estado: normalizeEstado(values[columns.estado]),
    }];
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
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    return parseCsvRows(await file.text());
  }

  if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
    return parseWorkbook(file);
  }

  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const estado = request.nextUrl.searchParams.get('estado');
    const data = await getHseModuleData(context.organizationId, context.supabase);

    const capacitaciones = estado
      ? data.trainings.filter(
          (training: any) => String(training.estado || '').toLowerCase() === estado.toLowerCase()
        )
      : data.trainings;

    return NextResponse.json({
      capacitaciones,
      total: capacitaciones.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch HSE trainings';
    console.error('[hse][capacitaciones] GET fallback:', message);
    return NextResponse.json({ capacitaciones: [], total: 0 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
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
      return NextResponse.json({ error: 'No se encontraron capacitaciones validas en el archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

    for (const row of rows) {
      const { data: existing } = await context.supabase
        .from('sostenibilidad_capacitaciones')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('nombre_capacitacion', row.nombre_capacitacion)
        .eq('fecha_programada', row.fecha_programada)
        .maybeSingle();

      const payload = {
        organization_id: context.organizationId,
        nombre_capacitacion: row.nombre_capacitacion,
        tipo: row.tipo,
        tema: row.tema,
        programa_hse: row.programa_hse,
        proveedor_instructor: row.proveedor_instructor,
        fecha_programada: row.fecha_programada,
        hora_inicio: row.hora_inicio,
        hora_termino: row.hora_termino,
        duracion_horas: row.duracion_horas,
        cantidad_asistentes: row.cantidad_asistentes,
        faenas_cargos: row.faenas_cargos,
        estado: row.estado,
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await context.supabase
          .from('sostenibilidad_capacitaciones')
          .update(payload)
          .eq('id', existing.id)
          .eq('organization_id', context.organizationId);
        if (error) throw error;
        updated += 1;
      } else {
        const { error } = await context.supabase
          .from('sostenibilidad_capacitaciones')
          .insert(payload);
        if (error) throw error;
        imported += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se procesaron ${rows.length} capacitaciones HSE`,
      imported,
      updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron importar capacitaciones HSE';
    console.error('[hse][capacitaciones][import] error:', message);
    return NextResponse.json({ error: message, imported: 0, updated: 0 }, { status: 500 });
  }
}
