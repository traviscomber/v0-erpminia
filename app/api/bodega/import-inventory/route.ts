export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { canonicalCategory, normalizeText } from '@/lib/bodega-normalization';

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

type ParsedColumns = {
  code: number;
  family: number;
  subFamily: number;
  team: number;
  product: number;
  stock: number;
  unitCost: number;
  value: number;
};

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

function parseRow(values: unknown[], columns: ParsedColumns): InventoryRow | null {
  const sku = cleanText(values[columns.code]);
  const name = cleanText(values[columns.product]);
  if (!sku || !name) return null;

  const stock = parseNumber(values[columns.stock]);
  const unitCost = parseNumber(values[columns.unitCost]) || (stock > 0 ? parseNumber(values[columns.value]) / stock : 0);
  const family = canonicalCategory(values[columns.family]);
  const subFamily = cleanText(values[columns.subFamily]);
  const team = cleanText(values[columns.team]);

  return {
    sku,
    name,
    category: family,
    description: [subFamily, team].filter(Boolean).join(' - ') || name,
    quantity: stock,
    unit_cost: unitCost,
    min_stock: stock > 0 ? Math.max(0, Math.round(stock * 0.1)) : 0,
    max_stock: stock > 0 ? Math.max(stock, Math.round(stock * 1.5)) : 0,
    location: '',
  };
}

function parseCsvText(text: string): InventoryRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map((header) => normalizeText(header));
  const columns: ParsedColumns = {
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
    const row = parseRow(values, columns);
    return row ? [row] : [];
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

  const headers = (rows[0] as unknown[]).map((header) => normalizeText(header));
  const columns: ParsedColumns = {
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
    const parsed = parseRow(values, columns);
    return parsed ? [parsed] : [];
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

function getPgConnectionString() {
  return process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
}

async function withPgClient<T>(handler: (client: Client) => Promise<T>) {
  const connectionString = getPgConnectionString();
  if (!connectionString) {
    throw new Error('No se encontro una conexion de Postgres disponible para el import');
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  const previousTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  await client.connect();

  try {
    return await handler(client);
  } finally {
    await client.end();
    if (previousTlsSetting === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting;
    }
  }
}

async function replaceInventoryWithStaging(rows: InventoryRow[]) {
  await withPgClient(async (client) => {
    await client.query('BEGIN');

    try {
      await client.query(`
        ALTER TABLE public.bodega_inventory
          ALTER COLUMN unit_cost TYPE numeric(20,2)
          USING COALESCE(unit_cost, 0)::numeric(20,2);
      `);

      await client.query(`
        CREATE TEMP TABLE inventory_stage (
          LIKE public.bodega_inventory INCLUDING DEFAULTS INCLUDING CONSTRAINTS
        ) ON COMMIT DROP;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS public.bodega_inventory_backup (
          LIKE public.bodega_inventory INCLUDING DEFAULTS INCLUDING CONSTRAINTS
        );
      `);

      await client.query(`
        ALTER TABLE public.bodega_inventory_backup
          ADD COLUMN IF NOT EXISTS backup_created_at timestamptz DEFAULT now();
      `);

      await client.query(`
        INSERT INTO public.bodega_inventory_backup (
          sku,
          name,
          category,
          description,
          quantity,
          unit_cost,
          min_stock,
          max_stock,
          location
        )
        SELECT
          sku,
          name,
          category,
          description,
          quantity,
          unit_cost,
          min_stock,
          max_stock,
          location
        FROM public.bodega_inventory;
      `);

      await client.query(
        `
          INSERT INTO inventory_stage (
            sku,
            name,
            category,
            description,
            quantity,
            unit_cost,
            min_stock,
            max_stock,
            location
          )
          SELECT
            sku,
            name,
            category,
            description,
            quantity,
            unit_cost,
            min_stock,
            max_stock,
            location
          FROM jsonb_to_recordset($1::jsonb) AS item(
            sku text,
            name text,
            category text,
            description text,
            quantity numeric,
            unit_cost numeric,
            min_stock numeric,
            max_stock numeric,
            location text
          );
        `,
        [
          JSON.stringify(
            rows.map((item) => ({
              sku: item.sku,
              name: item.name,
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              min_stock: item.min_stock,
              max_stock: item.max_stock,
              location: item.location,
            })),
          ),
        ],
      );

      await client.query('DELETE FROM public.bodega_inventory');

      await client.query(`
        INSERT INTO public.bodega_inventory (
          sku,
          name,
          category,
          description,
          quantity,
          unit_cost,
          min_stock,
          max_stock,
          location
        )
        SELECT
          sku,
          name,
          category,
          description,
          quantity,
          unit_cost,
          min_stock,
          max_stock,
          location
        FROM inventory_stage;
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 });
    }

    const data = await parseInventoryFile(file);
    if (data.length === 0) {
      return NextResponse.json({ error: 'No se encontraron datos válidos en el archivo' }, { status: 400 });
    }

    await replaceInventoryWithStaging(data);

    return NextResponse.json({
      success: true,
      message: `Se importaron correctamente ${data.length} items de inventario`,
      imported: data.length,
      sampleItems: data.slice(0, 3),
    });
  } catch (error) {
    console.error('[v0] Bodega inventory import error:', error);
    return NextResponse.json(
      { error: 'No se pudo importar el inventario', details: formatError(error) },
      { status: 500 },
    );
  }
}
