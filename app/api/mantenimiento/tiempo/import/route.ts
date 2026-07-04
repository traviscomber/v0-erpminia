export const dynamic = 'force-dynamic';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { loadXlsxModule, sheetToMatrix } from '@/lib/xlsx';

type ImportTimeRow = {
  work_order_number: string;
  hours: number;
  description?: string;
  date?: string;
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

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseCsvRows(text: string): ImportTimeRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    work_order_number: pickIndex(headers, ['work_order_number', 'ot', 'orden_trabajo', 'orden', 'wo']),
    hours: pickIndex(headers, ['horas_trabajadas', 'horas', 'hours', 'hh']),
    description: pickIndex(headers, ['descripcion', 'description', 'detalle', 'observaciones']),
    date: pickIndex(headers, ['fecha', 'date']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const workOrderNumber = values[columns.work_order_number] || '';
    const hours = parseNumber(values[columns.hours]);
    if (!workOrderNumber || hours <= 0) return [];

    return [
      {
        work_order_number: workOrderNumber,
        hours,
        description: values[columns.description] || '',
        date: parseDate(values[columns.date]),
      },
    ];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = await loadXlsxModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = sheetToMatrix(xlsx, sheet, true);
  if (!rows.length) return [];

  const csvText = [
    rows[0].map((value) => normalizeText(value)).join(';'),
    ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';')),
  ].join('\n');

  return parseCsvRows(csvText);
}

async function parseImportFile(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCsvRows(await file.text());
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return parseWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

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
      return NextResponse.json({ error: 'No se encontraron registros validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const { data: workOrder, error: workOrderError } = await supabase
        .from('maintenance_work_orders')
        .select('id')
        .eq('work_order_number', row.work_order_number)
        .maybeSingle();
      if (workOrderError) throw workOrderError;
      if (!workOrder?.id) {
        skipped += 1;
        continue;
      }

      const fecha = row.date || new Date().toISOString().split('T')[0];
      const payload = {
        ot_id: workOrder.id,
        technician_id: user.id,
        horas_trabajadas: row.hours,
        descripcion: row.description || null,
        fecha,
      };

      const { data: existing, error: lookupError } = await supabase
        .from('mantenimiento_tiempo')
        .select('id')
        .eq('ot_id', workOrder.id)
        .eq('technician_id', user.id)
        .eq('fecha', fecha)
        .eq('horas_trabajadas', row.hours)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existing?.id) {
        const { error } = await supabase.from('mantenimiento_tiempo').update(payload).eq('id', existing.id);
        if (error) throw error;
        updated += 1;
      } else {
        const { error } = await supabase.from('mantenimiento_tiempo').insert(payload);
        if (error) throw error;
        imported += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Horas de personal importadas correctamente',
      imported,
      updated,
      skipped,
      total: rows.length,
    });
  } catch (error) {
    console.error('[maintenance/tiempo/import]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo importar el personal' },
      { status: 500 }
    );
  }
}
