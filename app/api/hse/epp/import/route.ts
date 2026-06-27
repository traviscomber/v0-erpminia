export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

type ImportEppRow = {
  cargo: string;
  tarea: string;
  faena: string;
  epp_elemento: string;
  cantidad: number;
  frecuencia_reemplazo: string;
  marca_modelo: string;
  fecha_entrega: string;
  activo: boolean;
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

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/\./g, '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBoolean(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  if (['false', '0', 'no', 'inactivo', 'inactive', 'falso'].includes(text)) return false;
  return true;
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseCsvRows(text: string): ImportEppRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    cargo: pickIndex(headers, ['cargo', 'puesto', 'rol']),
    tarea: pickIndex(headers, ['tarea', 'actividad', 'proceso']),
    faena: pickIndex(headers, ['faena', 'ubicacion', 'area', 'sede']),
    epp_elemento: pickIndex(headers, ['epp', 'elemento', 'insumo']),
    cantidad: pickIndex(headers, ['cantidad', 'qty', 'unidades']),
    frecuencia_reemplazo: pickIndex(headers, ['frecuencia', 'reemplazo']),
    marca_modelo: pickIndex(headers, ['marca', 'modelo']),
    fecha_entrega: pickIndex(headers, ['fecha', 'entrega']),
    activo: pickIndex(headers, ['activo', 'status', 'estado']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const cargo = values[columns.cargo] || '';
    const epp_elemento = values[columns.epp_elemento] || '';
    if (!cargo || !epp_elemento) return [];

    return [
      {
        cargo,
        tarea: values[columns.tarea] || '',
        faena: values[columns.faena] || '',
        epp_elemento,
        cantidad: parseNumber(values[columns.cantidad]),
        frecuencia_reemplazo: values[columns.frecuencia_reemplazo] || '',
        marca_modelo: values[columns.marca_modelo] || '',
        fecha_entrega: values[columns.fecha_entrega] || new Date().toISOString(),
        activo: normalizeBoolean(values[columns.activo]),
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
  if (filename.endsWith('.csv')) {
    return parseCsvRows(await file.text());
  }

  if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) {
    return parseWorkbook(file);
  }

  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
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
      return NextResponse.json({ error: 'No se encontraron registros validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

    for (const row of rows) {
      const payload = {
        organization_id: context.organizationId,
        cargo: row.cargo,
        tarea: row.tarea,
        faena: row.faena,
        epp_elemento: row.epp_elemento,
        cantidad: row.cantidad,
        frecuencia_reemplazo: row.frecuencia_reemplazo,
        marca_modelo: row.marca_modelo,
        fecha_entrega: row.fecha_entrega,
        activo: row.activo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: existing, error: lookupError } = await context.supabase
        .from('hse_epp')
        .select('id')
        .eq('organization_id', context.organizationId)
        .eq('cargo', row.cargo)
        .eq('tarea', row.tarea)
        .eq('faena', row.faena)
        .eq('epp_elemento', row.epp_elemento)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing?.id) {
        const { error } = await context.supabase
          .from('hse_epp')
          .update(payload)
          .eq('id', existing.id)
          .eq('organization_id', context.organizationId);
        if (error) throw error;
        updated += 1;
      } else {
        const { error } = await context.supabase.from('hse_epp').insert(payload);
        if (error) throw error;
        imported += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se procesaron ${rows.length} registros de EPP`,
      imported,
      updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron importar los datos de EPP';
    console.error('[hse][epp][import] error:', message);
    return NextResponse.json({ error: message, imported: 0, updated: 0 }, { status: 500 });
  }
}