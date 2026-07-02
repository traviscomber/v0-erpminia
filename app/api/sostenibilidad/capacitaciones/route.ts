export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';
import { loadXlsxModule, sheetToMatrix } from '@/lib/xlsx';

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
  estado: 'planificada' | 'realizada' | 'cancelada';
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

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const text = normalizeText(value);
  if (!text) return '';

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

function normalizeTipo(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['otec', 'organismo tecnico de capacitacion'].includes(text)) return 'OTEC';
  if (['achs', 'mutual', 'mutualidad'].includes(text)) return 'ACHS';
  if (['induccion'].includes(text)) return 'Induccion';
  if (['especifica'].includes(text)) return 'Especifica';
  if (['charla', 'charla de seguridad', 'seguridad'].includes(text)) return 'Charla de Seguridad';
  if (['simulacro'].includes(text)) return 'Simulacro';
  if (['curso', 'e-learning', 'elearning', 'curso e-learning'].includes(text)) return 'Curso E-Learning';
  if (['taller', 'taller practico'].includes(text)) return 'Taller Practico';
  if (['certificacion'].includes(text)) return 'Certificacion';
  if (['reentrenamiento'].includes(text)) return 'Reentrenamiento';
  if (['legal', 'normativa', 'legal/normativa'].includes(text)) return 'Legal/Normativa';
  if (['liderazgo', 'gestion', 'liderazgo y gestion'].includes(text)) return 'Liderazgo y Gestion';
  return 'ACHS';
}

function parseList(value: unknown) {
  return normalizeText(value)
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFaenasCargos(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  return parseList(value);
}

function normalizeEstado(value: unknown): ImportTrainingRow['estado'] {
  const text = normalizeText(value).toLowerCase();
  if (text === 'realizada' || text === 'realizado') return 'realizada';
  if (text === 'cancelada' || text === 'cancelado') return 'cancelada';
  return 'planificada';
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
    hora_termino: headers.findIndex((h) => h.includes('hora') && h.includes('termino')),
    duracion_horas: headers.findIndex((h) => h.includes('duracion')),
    cantidad_asistentes: headers.findIndex((h) => h.includes('asistente')),
    faenas_cargos: headers.findIndex((h) => h.includes('faena') || h.includes('cargo')),
    estado: headers.findIndex((h) => h.includes('estado')),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const nombreCapacitacion = values[columns.nombre_capacitacion] || values[0] || '';
    const fechaProgramada = normalizeDate(values[columns.fecha_programada]);

    if (!nombreCapacitacion || !fechaProgramada) return [];

    return [
      {
        nombre_capacitacion: nombreCapacitacion,
        tipo: normalizeTipo(values[columns.tipo]),
        tema: values[columns.tema] || '',
        programa_hse: values[columns.programa_hse] || '',
        proveedor_instructor: values[columns.proveedor_instructor] || '',
        fecha_programada: fechaProgramada,
        hora_inicio: values[columns.hora_inicio] || null,
        hora_termino: values[columns.hora_termino] || null,
        duracion_horas: Number(values[columns.duracion_horas] || 0),
        cantidad_asistentes: Number(values[columns.cantidad_asistentes] || 0),
        faenas_cargos: parseFaenasCargos(values[columns.faenas_cargos]),
        estado: normalizeEstado(values[columns.estado]),
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
    const { data, error } = await context.supabase
      .from('sostenibilidad_capacitaciones')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('fecha_programada', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las capacitaciones';
    console.error('[sostenibilidad][capacitaciones] GET fallback:', message);
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
        return NextResponse.json({ error: 'No se encontraron capacitaciones validas en el archivo', imported: 0, updated: 0 }, { status: 400 });
      }

      let imported = 0;
      let updated = 0;

      for (const row of rows) {
        const fechaProgramada = normalizeDate(row.fecha_programada);

        const { data: existing } = await context.supabase
          .from('sostenibilidad_capacitaciones')
          .select('id')
          .eq('organization_id', context.organizationId)
          .eq('nombre_capacitacion', row.nombre_capacitacion)
          .eq('fecha_programada', fechaProgramada)
          .maybeSingle();

        const payload = {
          organization_id: context.organizationId,
          nombre_capacitacion: row.nombre_capacitacion,
          tipo: normalizeTipo(row.tipo),
          tema: normalizeText(row.tema),
          programa_hse: normalizeText(row.programa_hse),
          proveedor_instructor: normalizeText(row.proveedor_instructor),
          fecha_programada: fechaProgramada,
          hora_inicio: row.hora_inicio ? normalizeText(row.hora_inicio) : null,
          hora_termino: row.hora_termino ? normalizeText(row.hora_termino) : null,
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
          const { error } = await context.supabase.from('sostenibilidad_capacitaciones').insert(payload);
          if (error) throw error;
          imported += 1;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se procesaron ${rows.length} capacitaciones`,
        imported,
        updated,
      });
    }

    const body = await request.json();
    const fechaProgramada = normalizeDate(body.fecha_programada);

    const { data, error } = await context.supabase
      .from('sostenibilidad_capacitaciones')
      .insert({
        organization_id: context.organizationId,
        nombre_capacitacion: normalizeText(body.nombre_capacitacion),
        tipo: normalizeTipo(body.tipo),
        tema: normalizeText(body.tema),
        programa_hse: normalizeText(body.programa_hse),
        proveedor_instructor: normalizeText(body.proveedor_instructor),
        fecha_programada: fechaProgramada,
        hora_inicio: normalizeText(body.hora_inicio) || null,
        hora_termino: normalizeText(body.hora_termino) || null,
        duracion_horas: Number(body.duracion_horas || 0),
        cantidad_asistentes: Number(body.cantidad_asistentes || 0),
        faenas_cargos: parseFaenasCargos(body.faenas_cargos),
        estado: normalizeEstado(body.estado),
        created_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la capacitacion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const capacitacionId = searchParams.get('id');

    if (!capacitacionId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await context.supabase
      .from('sostenibilidad_capacitaciones')
      .delete()
      .eq('id', capacitacionId)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la capacitacion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
