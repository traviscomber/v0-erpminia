export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type InventoryRow = {
  sku: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  unit_cost: number;
  min_stock: number;
  max_stock: number;
  location: string;
};

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function formatError(error: unknown) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

async function runSqlStatement(supabase: any, sql: string) {
  const attempts = ['exec_sql', 'execute_sql'];

  for (const fn of attempts) {
    const { error } = await supabase.rpc(fn, { sql });
    if (!error) {
      return;
    }

    const message = formatError(error).toLowerCase();
    const functionMissing =
      message.includes('function') &&
      (message.includes(fn) || message.includes('does not exist') || message.includes('not found'));

    if (!functionMissing) {
      throw error;
    }
  }

  throw new Error('No se encontró una función SQL disponible para ajustar el esquema');
}

async function ensureInventoryPrecision(supabase: any) {
  await runSqlStatement(
    supabase,
    `
      ALTER TABLE public.bodega_inventory
        ALTER COLUMN unit_cost TYPE numeric(20,2)
        USING COALESCE(unit_cost, 0)::numeric(20,2);
    `
  );
}

function parseCsvText(text: string): InventoryRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    code: headers.findIndex((header) => header.includes('codigo') || header.includes('code')),
    family: headers.findIndex((header) => header.includes('familia') && !header.includes('sub')),
    subFamily: headers.findIndex((header) => header.includes('sub-familia') || header.includes('subfamilia')),
    team: headers.findIndex((header) => header.includes('equipo')),
    product: headers.findIndex((header) => header.includes('producto')),
    stock: headers.findIndex((header) => header.includes('stock') || header.includes('cantidad')),
    unitCost: headers.findIndex((header) => header.includes('valor unit') || header.includes('precio') || header.includes('costo unit')),
    value: headers.findIndex((header) => header === 'valor' || header.includes('total')),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(cleanText);
    const sku = values[columns.code] || '';
    const name = values[columns.product] || '';
    if (!sku || !name) return [];

    const stock = parseNumber(values[columns.stock]);
    const unitCost = parseNumber(values[columns.unitCost]) || (stock > 0 ? parseNumber(values[columns.value]) / stock : 0);
    const family = values[columns.family] || '';
    const subFamily = values[columns.subFamily] || '';
    const team = values[columns.team] || '';

    return [{
      sku,
      name,
      category: family || 'General',
      description: [subFamily, team].filter(Boolean).join(' - ') || name,
      quantity: stock,
      unit_cost: unitCost,
      min_stock: stock > 0 ? Math.max(0, Math.round(stock * 0.1)) : 0,
      max_stock: stock > 0 ? Math.max(stock, Math.round(stock * 1.5)) : 0,
      location: '',
    }];
  });
}

async function parseWorkbook(file: File): Promise<InventoryRow[]> {
  const xlsx = (await import('xlsx')) as any;
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  if (!rows.length) return [];

  const headers = (rows[0] as unknown[]).map(normalizeHeader);
  const columns = {
    code: headers.findIndex((header) => header.includes('codigo') || header.includes('code')),
    family: headers.findIndex((header) => header.includes('familia') && !header.includes('sub')),
    subFamily: headers.findIndex((header) => header.includes('sub-familia') || header.includes('subfamilia')),
    team: headers.findIndex((header) => header.includes('equipo')),
    product: headers.findIndex((header) => header.includes('producto')),
    stock: headers.findIndex((header) => header.includes('stock') || header.includes('cantidad')),
    unitCost: headers.findIndex((header) => header.includes('valor unit') || header.includes('precio') || header.includes('costo unit')),
    value: headers.findIndex((header) => header === 'valor' || header.includes('total')),
  };

  return rows.slice(1).flatMap((row) => {
    const values = row.map(cleanText);
    const sku = values[columns.code] || '';
    const name = values[columns.product] || '';
    if (!sku || !name) return [];

    const stock = parseNumber(values[columns.stock]);
    const unitCost = parseNumber(values[columns.unitCost]) || (stock > 0 ? parseNumber(values[columns.value]) / stock : 0);
    const family = values[columns.family] || '';
    const subFamily = values[columns.subFamily] || '';
    const team = values[columns.team] || '';

    return [{
      sku,
      name,
      category: family || 'General',
      description: [subFamily, team].filter(Boolean).join(' - ') || name,
      quantity: stock,
      unit_cost: unitCost,
      min_stock: stock > 0 ? Math.max(0, Math.round(stock * 0.1)) : 0,
      max_stock: stock > 0 ? Math.max(stock, Math.round(stock * 1.5)) : 0,
      location: '',
    }];
  });
}

async function parseInventoryFile(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    return parseWorkbook(file);
  }

  if (filename.endsWith('.csv')) {
    const text = await file.text();
    return parseCsvText(text);
  }

  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Falta la configuracion de Supabase' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 });
    }

    const data = await parseInventoryFile(file);
    if (data.length === 0) {
      return NextResponse.json({ error: 'No se encontraron datos validos en el archivo' }, { status: 400 });
    }

    await ensureInventoryPrecision(supabase);

    await supabase.from('bodega_inventory').delete().neq('sku', '__import_replace__');

    const batchSize = 500;
    let imported = 0;

    for (let index = 0; index < data.length; index += batchSize) {
      const batch = data.slice(index, index + batchSize);
    const { error } = await supabase.from('bodega_inventory').insert(
        batch.map((item) => ({
          sku: item.sku,
          name: item.name,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          min_stock: item.min_stock,
          max_stock: item.max_stock,
          location: item.location,
        }))
      );

      if (error) {
        throw new Error(`Batch ${Math.floor(index / batchSize) + 1}: ${formatError(error)}`);
      }
      imported += batch.length;
    }

    return NextResponse.json({
      success: true,
      message: `Se importaron correctamente ${imported} items de inventario`,
      imported,
      sampleItems: data.slice(0, 3),
    });
  } catch (error) {
    console.error('[v0] Bodega inventory import error:', error);
    return NextResponse.json(
      { error: 'No se pudo importar el inventario', details: formatError(error) },
      { status: 500 }
    );
  }
}
