export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { read, utils } from 'xlsx/xlsx.mjs';
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
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
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

async function tableHasColumn(client: Client, tableName: string, columnName: string) {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS present;
    `,
    [tableName, columnName],
  );

  return Boolean(result.rows[0]?.present);
}

async function replaceInventoryWithStaging(rows: InventoryRow[], costCenterId?: string | null) {
  return withPgClient(async (client) => {
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

      const hasCostCenterColumn = costCenterId ? await tableHasColumn(client, 'bodega_inventory', 'cost_center_id') : false;
      const stageColumns = hasCostCenterColumn
        ? `
            sku,
            name,
            category,
            description,
            quantity,
            unit_cost,
            min_stock,
            max_stock,
            location,
            cost_center_id
          `
        : `
            sku,
            name,
            category,
            description,
            quantity,
            unit_cost,
            min_stock,
            max_stock,
            location
          `;
      const recordsetColumns = hasCostCenterColumn
        ? `
            sku text,
            name text,
            category text,
            description text,
            quantity numeric,
            unit_cost numeric,
            min_stock numeric,
            max_stock numeric,
            location text,
            cost_center_id uuid
          `
        : `
            sku text,
            name text,
            category text,
            description text,
            quantity numeric,
            unit_cost numeric,
            min_stock numeric,
            max_stock numeric,
            location text
          `;

      const dedupedRows = Array.from(
        rows.reduce((acc, row) => {
          acc.set(row.sku, row);
          return acc;
        }, new Map<string, InventoryRow>()).values()
      );

      await client.query(
        `
          INSERT INTO inventory_stage (${stageColumns})
          SELECT
            sku,
            name,
            category,
            description,
            quantity,
            unit_cost,
            min_stock,
            max_stock,
            location${hasCostCenterColumn ? ', cost_center_id' : ''}
          FROM jsonb_to_recordset($1::jsonb) AS item(${recordsetColumns});
        `,
        [
          JSON.stringify(
            dedupedRows.map((item) => ({
              sku: item.sku,
              name: item.name,
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              min_stock: item.min_stock,
              max_stock: item.max_stock,
              location: item.location,
              ...(hasCostCenterColumn && costCenterId ? { cost_center_id: costCenterId } : {}),
            })),
          ),
        ],
      );

      const updateColumns = [
        'name = stage.name',
        'category = stage.category',
        'description = stage.description',
        'quantity = stage.quantity',
        'unit_cost = stage.unit_cost',
        'min_stock = stage.min_stock',
        'max_stock = stage.max_stock',
        'location = stage.location',
      ];

      if (hasCostCenterColumn) {
        updateColumns.push('cost_center_id = stage.cost_center_id');
      }

      const updateResult = await client.query(`
        UPDATE public.bodega_inventory AS target
        SET ${updateColumns.join(', ')}
        FROM inventory_stage AS stage
        WHERE target.sku = stage.sku;
      `);

      const insertColumns = [
        'sku',
        'name',
        'category',
        'description',
        'quantity',
        'unit_cost',
        'min_stock',
        'max_stock',
        'location',
      ];
      const insertSelectColumns = [
        'stage.sku',
        'stage.name',
        'stage.category',
        'stage.description',
        'stage.quantity',
        'stage.unit_cost',
        'stage.min_stock',
        'stage.max_stock',
        'stage.location',
      ];

      if (hasCostCenterColumn) {
        insertColumns.push('cost_center_id');
        insertSelectColumns.push('stage.cost_center_id');
      }

      const insertResult = await client.query(`
        INSERT INTO public.bodega_inventory (${insertColumns.join(', ')})
        SELECT ${insertSelectColumns.join(', ')}
        FROM inventory_stage AS stage
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.bodega_inventory AS target
          WHERE target.sku = stage.sku
        );
      `);

      await client.query('COMMIT');

      return {
        imported: dedupedRows.length,
        updated: updateResult.rowCount ?? 0,
        inserted: insertResult.rowCount ?? 0,
      };
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

    const costCenterId = String(formData.get('costCenterId') || '').trim() || null;
    const result = await replaceInventoryWithStaging(data, costCenterId);

    return NextResponse.json({
      success: true,
      message: `Se sincronizaron correctamente ${result.imported} items de inventario`,
      imported: result.imported,
      updated: result.updated,
      inserted: result.inserted,
    });
  } catch (error) {
    console.error('[v0] Bodega inventory import error:', error);
    return NextResponse.json(
      { error: 'No se pudo importar el inventario', details: formatError(error), imported: 0 },
      { status: 500 },
    );
  }
}
