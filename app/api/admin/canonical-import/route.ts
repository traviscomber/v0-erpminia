export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { read, utils } from 'xlsx/xlsx.mjs';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

// Canonical data belongs to the real (non-demo) organization.
const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

type DatasetKey = 'lines' | 'asset_costs' | 'assets' | 'products';

type FileSpec = {
  relPath: string;
  blobUrl: string;
  logicalName: string;
};

const FILES: Record<string, FileSpec> = {
  costos: {
    relPath: 'data/Costos-equipos-Mayo-2026-1-187d08.xlsx',
    blobUrl:
      'https://blobs.vusercontent.net/blob/Costos%20equipos%20Mayo%202026%20%281%29-6REHc5Ry9EvpMaoD3n2xmU6dpy5srA.xlsx',
    logicalName: 'Costos equipos Mayo 2026 (1).xlsx',
  },
  baseExistencias: {
    relPath: 'data/Base-Existencias-1-a6346f.xlsx',
    blobUrl:
      'https://blobs.vusercontent.net/blob/Base%20Existencias%20%281%29-PL8uqM44MgBj0hXRXICWT0jgf01TvN.xlsx',
    logicalName: 'Base Existencias (1).xlsx',
  },
  existencias2: {
    relPath: 'data/Existencias-2-9efed1.xlsx',
    blobUrl:
      'https://blobs.vusercontent.net/blob/Existencias%20%282%29-GD84YFb8UDyI4Ibov8PFcSBuiGiX7r.xlsx',
    logicalName: 'Existencias (2).xlsx',
  },
};

// ---------- helpers ----------

function isAuthorized(req: NextRequest) {
  const token = process.env.ADMIN_INIT_TOKEN;
  if (!token) return false;
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const xToken = req.headers.get('x-admin-token') || '';
  return bearer === token || xToken === token;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text || text === '---') return null;
  // Chilean formatting: thousands "." decimals ","
  const normalized = text.replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === '---') return null;
  return text;
}

function toDateString(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = cleanText(value);
  if (!text) return null;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function hashRow(file: string, sheet: string, row: number): string {
  return createHash('sha256').update(`${file}::${sheet}::${row}`).digest('hex');
}

// Normalize object keys by trimming whitespace (XLS headers have stray spaces).
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) out[key.trim()] = row[key];
  return out;
}

// ---------- workbook cache & loading ----------

const workbookCache = new Map<string, ReturnType<typeof read>>();

async function loadWorkbook(spec: FileSpec) {
  if (workbookCache.has(spec.relPath)) return workbookCache.get(spec.relPath)!;
  let buffer: Buffer;
  try {
    buffer = readFileSync(path.join(process.cwd(), spec.relPath));
  } catch {
    const res = await fetch(spec.blobUrl);
    if (!res.ok) throw new Error(`No se pudo leer ${spec.logicalName} (fs y blob fallaron)`);
    buffer = Buffer.from(await res.arrayBuffer());
  }
  const wb = read(buffer, { type: 'buffer', cellDates: true });
  workbookCache.set(spec.relPath, wb);
  return wb;
}

function sheetRows(wb: ReturnType<typeof read>, sheet: string): Record<string, unknown>[] {
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`Hoja "${sheet}" no encontrada`);
  return (utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[]).map(normalizeRow);
}

// ---------- pg client ----------

async function withPgClient<T>(handler: (client: Client) => Promise<T>) {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('No hay conexión Postgres disponible');
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  await client.connect();
  try {
    return await handler(client);
  } finally {
    await client.end();
    if (prevTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
  }
}

async function createBatch(
  client: Client,
  logicalName: string,
  sourceType: string,
  totalRows: number,
): Promise<string> {
  const sha = createHash('sha256').update(`${logicalName}:${sourceType}:${Date.now()}`).digest('hex');
  const res = await client.query(
    `INSERT INTO staging.import_batches
       (organization_id, source_file, source_file_sha256, source_type, status, total_rows)
     VALUES ($1,$2,$3,$4,'staged',$5)
     RETURNING id`,
    [ORG_ID, logicalName, sha, sourceType, totalRows],
  );
  return res.rows[0].id as string;
}

// ---------- dataset builders ----------

type LineRecord = {
  order_number: string;
  line_number: number;
  product_code: string | null;
  description: string | null;
  quantity: number | null;
  unit_cost: number | null;
  net_amount: number | null;
  cost_center_code: string | null;
  asset_reference: string | null;
  validation_status: string;
  validation_notes: string[] | null;
  source_row: number;
  source_hash: string;
  source_payload: Record<string, unknown>;
};

function buildLineRecords(wb: ReturnType<typeof read>): LineRecord[] {
  const rows = sheetRows(wb, 'compras');
  const counters = new Map<string, number>();
  const out: LineRecord[] = [];
  rows.forEach((row, idx) => {
    const orderNumber = cleanText(row['NÚMERO']);
    if (!orderNumber) return;
    const next = (counters.get(orderNumber) ?? 0) + 1;
    counters.set(orderNumber, next);
    const productCode = cleanText(row['PRODUCTO']);
    const notes: string[] = [];
    if (!productCode) notes.push('Línea sin código de producto');
    out.push({
      order_number: orderNumber,
      line_number: next,
      product_code: productCode,
      description: cleanText(row['DESCRIPCIÓN']),
      quantity: parseNumber(row['CANTIDAD']),
      unit_cost: parseNumber(row['COSTO UNITARIO']),
      net_amount: parseNumber(row['NETO']),
      cost_center_code: cleanText(row['CENTRO COSTO']),
      asset_reference: cleanText(row['PATENTE VEHÍCULO']),
      validation_status: notes.length ? 'warning' : 'valid',
      validation_notes: notes.length ? notes : null,
      source_row: idx + 2,
      source_hash: hashRow(FILES.existencias2.logicalName, 'compras', idx + 2),
      source_payload: {
        NUMERO: orderNumber,
        FECHA: row['FECHA'] instanceof Date ? (row['FECHA'] as Date).toISOString().slice(0, 10) : row['FECHA'],
        PROVEEDOR: row['PROVEEDOR'],
        PRODUCTO: productCode,
        DESCRIPCION: row['DESCRIPCIÓN'],
        CANTIDAD: row['CANTIDAD'],
        COSTO_UNITARIO: row['COSTO UNITARIO'],
        NETO: row['NETO'],
      },
    });
  });
  return out;
}

type AssetCostRecord = {
  transaction_date: string | null;
  asset_code: string | null;
  asset_name: string | null;
  category: string | null;
  document_number: string | null;
  description: string | null;
  total_cost: number;
  currency: string;
  validation_status: string;
  validation_notes: string[] | null;
  source_row: number;
  source_hash: string;
  source_payload: Record<string, unknown>;
};

function buildAssetCostRecords(wb: ReturnType<typeof read>): AssetCostRecord[] {
  const rows = sheetRows(wb, 'Base');
  const out: AssetCostRecord[] = [];
  rows.forEach((row, idx) => {
    const equipo = cleanText(row['EQUIPO / VEHÍCULO']);
    const cost = parseNumber(row['COSTO']) ?? 0;
    const notes: string[] = [];
    if (!equipo) notes.push('Movimiento sin equipo/vehículo');
    if (cost === 0) notes.push('Costo cero');
    out.push({
      transaction_date: toDateString(row['FECHA']),
      asset_code: equipo,
      asset_name: equipo,
      category: cleanText(row['CATEGORÍA']),
      document_number: cleanText(row['COMPROBANTE']),
      description: cleanText(row['CONCEPTO_1']) ?? cleanText(row['CONCEPTO']),
      total_cost: cost,
      currency: 'CLP',
      validation_status: notes.length ? 'warning' : 'valid',
      validation_notes: notes.length ? notes : null,
      source_row: idx + 2,
      source_hash: hashRow(FILES.costos.logicalName, 'Base', idx + 2),
      source_payload: {
        CUENTA: row['CUENTA'],
        COMPROBANTE: row['COMPROBANTE'],
        FECHA: row['FECHA'] instanceof Date ? (row['FECHA'] as Date).toISOString().slice(0, 10) : row['FECHA'],
        CONCEPTO: row['CONCEPTO_1'],
        COSTO: cost,
        EQUIPO: equipo,
        CATEGORIA: row['CATEGORÍA'],
      },
    });
  });
  return out;
}

type ProductRecord = {
  product_code: string;
  name: string;
  description: string | null;
  family: string | null;
  subfamily: string | null;
  unit: string | null;
  standard_cost: number | null;
  tax_rate: number | null;
  minimum_stock: number | null;
  maximum_stock: number | null;
  is_purchasable: boolean;
  is_sellable: boolean;
  is_active_on_insert: boolean;
  source_row: number;
  source_hash: string;
  source_payload: Record<string, unknown>;
};

function buildProductRecords(
  existencias2: ReturnType<typeof read>,
  baseExistencias: ReturnType<typeof read>,
): ProductRecord[] {
  // family lookup from Base Existencias "Productos"
  const familyMap = new Map<string, { family: string | null; subfamily: string | null }>();
  for (const row of sheetRows(baseExistencias, 'Productos')) {
    const code = cleanText(row['CÓDIGO']);
    if (!code) continue;
    familyMap.set(code, {
      family: cleanText(row['FAMILIA']),
      subfamily: cleanText(row['SUB-FAMILIA']),
    });
  }

  const rows = sheetRows(existencias2, 'Stock min-max');
  const byCode = new Map<string, ProductRecord>();
  rows.forEach((row, idx) => {
    const code = cleanText(row['NOMBRE CÓDIGO']);
    if (!code) return;
    const fam = familyMap.get(code);
    byCode.set(code, {
      product_code: code,
      name: cleanText(row['DESCRIPCIÓN']) ?? code,
      description: cleanText(row['DESCRIPCIÓN']),
      family: fam?.family ?? cleanText(row['CLASE']),
      subfamily: fam?.subfamily ?? null,
      unit: cleanText(row['UNIDAD DE MEDIDA']),
      standard_cost: parseNumber(row['COSTO UNITARIO']),
      tax_rate: parseNumber(row['TASA DE IVA']),
      minimum_stock: parseNumber(row['STOCK MÍNIMO']),
      maximum_stock: parseNumber(row['STOCK MÁXIMO']),
      is_purchasable: cleanText(row['SE COMPRA']) === 'Sí',
      is_sellable: cleanText(row['SE VENDE']) === 'Sí',
      is_active_on_insert: false, // XLS-exclusive products are inserted inactive per spec
      source_row: idx + 2,
      source_hash: hashRow(FILES.existencias2.logicalName, 'Stock min-max', idx + 2),
      source_payload: {
        CODIGO: code,
        DESCRIPCION: row['DESCRIPCIÓN'],
        COSTO_UNITARIO: row['COSTO UNITARIO'],
        STOCK_MIN: row['STOCK MÍNIMO'],
        STOCK_MAX: row['STOCK MÁXIMO'],
        UNIDAD: row['UNIDAD DE MEDIDA'],
        DISCONTINUADO: row['DISCONTINUADO'],
      },
    });
  });
  return Array.from(byCode.values());
}

// ---------- slice upserts ----------

async function upsertLines(client: Client, batchId: string, slice: LineRecord[]) {
  const payload = slice.map((r) => ({
    ...r,
    validation_notes: r.validation_notes,
    source_payload: r.source_payload,
  }));
  const res = await client.query(
    `INSERT INTO canonical.purchase_order_lines
       (organization_id, purchase_order_id, order_number, line_number, product_code, description,
        quantity, unit, unit_cost, net_amount, cost_center_code, asset_reference,
        validation_status, validation_notes, source_file, source_sheet, source_row,
        import_batch_id, source_hash, source_payload, imported_at)
     SELECT $1, po.id, r.order_number, r.line_number, r.product_code, r.description,
        r.quantity, NULL, r.unit_cost, r.net_amount, r.cost_center_code, r.asset_reference,
        r.validation_status,
        CASE WHEN r.validation_notes IS NULL THEN NULL
             ELSE ARRAY(SELECT jsonb_array_elements_text(r.validation_notes)) END,
        $2, 'compras', r.source_row, $3, r.source_hash, r.source_payload, now()
     FROM jsonb_to_recordset($4::jsonb) AS r(
        order_number text, line_number int, product_code text, description text,
        quantity numeric, unit_cost numeric, net_amount numeric, cost_center_code text,
        asset_reference text, validation_status text, validation_notes jsonb,
        source_row int, source_hash text, source_payload jsonb)
     LEFT JOIN canonical.purchase_orders po
        ON po.organization_id = $1 AND po.order_number = r.order_number
     ON CONFLICT (organization_id, order_number, line_number) DO UPDATE SET
        purchase_order_id = EXCLUDED.purchase_order_id,
        product_code = EXCLUDED.product_code,
        description = EXCLUDED.description,
        quantity = EXCLUDED.quantity,
        unit_cost = EXCLUDED.unit_cost,
        net_amount = EXCLUDED.net_amount,
        cost_center_code = EXCLUDED.cost_center_code,
        asset_reference = EXCLUDED.asset_reference,
        validation_status = EXCLUDED.validation_status,
        validation_notes = EXCLUDED.validation_notes,
        source_hash = EXCLUDED.source_hash,
        source_payload = EXCLUDED.source_payload`,
    [ORG_ID, FILES.existencias2.logicalName, batchId, JSON.stringify(payload)],
  );
  return res.rowCount ?? 0;
}

async function upsertAssetCosts(client: Client, batchId: string, slice: AssetCostRecord[]) {
  const res = await client.query(
    `INSERT INTO canonical.asset_costs
       (organization_id, transaction_date, asset_code, asset_name, category, document_number,
        description, quantity, unit_cost, total_cost, currency,
        validation_status, validation_notes, source_file, source_sheet, source_row,
        import_batch_id, source_hash, source_payload, imported_at)
     SELECT $1, r.transaction_date, r.asset_code, r.asset_name, r.category, r.document_number,
        r.description, NULL, NULL, r.total_cost, r.currency,
        r.validation_status,
        CASE WHEN r.validation_notes IS NULL THEN NULL
             ELSE ARRAY(SELECT jsonb_array_elements_text(r.validation_notes)) END,
        $2, 'Base', r.source_row, $3, r.source_hash, r.source_payload, now()
     FROM jsonb_to_recordset($4::jsonb) AS r(
        transaction_date date, asset_code text, asset_name text, category text,
        document_number text, description text, total_cost numeric, currency text,
        validation_status text, validation_notes jsonb, source_row int,
        source_hash text, source_payload jsonb)
     ON CONFLICT (organization_id, source_hash) DO NOTHING`,
    [ORG_ID, FILES.costos.logicalName, batchId, JSON.stringify(slice)],
  );
  return res.rowCount ?? 0;
}

async function upsertProducts(client: Client, batchId: string, slice: ProductRecord[]) {
  const res = await client.query(
    `INSERT INTO canonical.products
       (organization_id, product_code, name, description, family, subfamily, unit,
        standard_cost, tax_rate, minimum_stock, maximum_stock, is_purchasable, is_sellable,
        is_active, validation_status, source_file, source_sheet, source_row,
        import_batch_id, source_hash, source_payload, imported_at, updated_at)
     SELECT $1, r.product_code, r.name, r.description, r.family, r.subfamily, r.unit,
        r.standard_cost, r.tax_rate, r.minimum_stock, r.maximum_stock, r.is_purchasable, r.is_sellable,
        r.is_active_on_insert, 'valid', $2, 'Stock min-max', r.source_row,
        $3, r.source_hash, r.source_payload, now(), now()
     FROM jsonb_to_recordset($4::jsonb) AS r(
        product_code text, name text, description text, family text, subfamily text, unit text,
        standard_cost numeric, tax_rate numeric, minimum_stock numeric, maximum_stock numeric,
        is_purchasable boolean, is_sellable boolean, is_active_on_insert boolean,
        source_row int, source_hash text, source_payload jsonb)
     ON CONFLICT (organization_id, product_code) DO UPDATE SET
        description = COALESCE(products.description, EXCLUDED.description),
        family = COALESCE(products.family, EXCLUDED.family),
        subfamily = COALESCE(products.subfamily, EXCLUDED.subfamily),
        unit = COALESCE(EXCLUDED.unit, products.unit),
        standard_cost = COALESCE(EXCLUDED.standard_cost, products.standard_cost),
        tax_rate = COALESCE(EXCLUDED.tax_rate, products.tax_rate),
        minimum_stock = COALESCE(EXCLUDED.minimum_stock, products.minimum_stock),
        maximum_stock = COALESCE(EXCLUDED.maximum_stock, products.maximum_stock),
        is_purchasable = EXCLUDED.is_purchasable,
        is_sellable = EXCLUDED.is_sellable,
        updated_at = now()`,
    [ORG_ID, FILES.existencias2.logicalName, batchId, JSON.stringify(slice)],
  );
  return res.rowCount ?? 0;
}

async function deriveAssets(client: Client, batchId: string) {
  const res = await client.query(
    `INSERT INTO canonical.assets
       (organization_id, asset_code, name, asset_type, category, is_active,
        validation_status, source_file, source_sheet, source_row,
        import_batch_id, source_hash, source_payload, imported_at, updated_at)
     SELECT DISTINCT ON (ac.asset_code)
        $1::uuid, ac.asset_code, ac.asset_name, NULL::text, ac.category, true,
        'valid', $2::text, 'Base', ac.source_row, $3::uuid,
        'asset:' || md5($1::text || '::' || ac.asset_code::text), '{}'::jsonb, now(), now()
     FROM canonical.asset_costs ac
     WHERE ac.organization_id = $1::uuid AND ac.asset_code IS NOT NULL AND ac.asset_code <> ''
     ORDER BY ac.asset_code, ac.source_row
     ON CONFLICT (organization_id, asset_code) DO NOTHING`,
    [ORG_ID, FILES.costos.logicalName, batchId],
  );
  return res.rowCount ?? 0;
}

// ---------- dataset dispatch ----------

async function getRecords(dataset: DatasetKey) {
  switch (dataset) {
    case 'lines':
      return buildLineRecords(await loadWorkbook(FILES.existencias2));
    case 'asset_costs':
      return buildAssetCostRecords(await loadWorkbook(FILES.costos));
    case 'products':
      return buildProductRecords(
        await loadWorkbook(FILES.existencias2),
        await loadWorkbook(FILES.baseExistencias),
      );
    case 'assets':
      return [];
  }
}

async function statusCounts(client: Client) {
  const q = await client.query(
    `SELECT
       (SELECT count(*) FROM canonical.purchase_order_lines WHERE organization_id=$1) AS lines,
       (SELECT count(*) FROM canonical.asset_costs WHERE organization_id=$1) AS asset_costs,
       (SELECT count(*) FROM canonical.assets WHERE organization_id=$1) AS assets,
       (SELECT count(*) FROM canonical.products WHERE organization_id=$1) AS products,
       (SELECT count(*) FROM canonical.products WHERE organization_id=$1 AND is_active=false) AS products_inactive,
       (SELECT count(*) FROM canonical.inventory_snapshots WHERE organization_id=$1) AS inventory`,
    [ORG_ID],
  );
  return q.rows[0];
}

// ---------- handlers ----------

export async function GET(req: NextRequest) {
  if (process.env.CANONICAL_IMPORT_DISABLED === 'true') {
    return NextResponse.json({ error: 'Importador deshabilitado' }, { status: 403 });
  }
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const counts = await withPgClient(statusCounts);
    return NextResponse.json({ ok: true, counts });
  } catch (error) {
    return NextResponse.json({ error: String((error as Error).message) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (process.env.CANONICAL_IMPORT_DISABLED === 'true') {
    return NextResponse.json({ error: 'Importador deshabilitado' }, { status: 403 });
  }
  if (!isAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: {
    dataset?: DatasetKey;
    action?: 'begin' | 'slice' | 'finish';
    batchId?: string;
    offset?: number;
    limit?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const dataset = body.dataset;
  const action = body.action ?? 'slice';
  if (!dataset || !['lines', 'asset_costs', 'assets', 'products'].includes(dataset)) {
    return NextResponse.json({ error: 'dataset inválido' }, { status: 400 });
  }

  try {
    return await withPgClient(async (client) => {
      // assets is a pure SQL derivation, single shot
      if (dataset === 'assets') {
        const batchId = await createBatch(client, FILES.costos.logicalName, 'assets', 0);
        const inserted = await deriveAssets(client, batchId);
        await client.query(
          `UPDATE staging.import_batches SET status='promoted', valid_rows=$2, promoted_at=now() WHERE id=$1`,
          [batchId, inserted],
        );
        return NextResponse.json({ ok: true, dataset, inserted, done: true, batchId });
      }

      if (action === 'begin') {
        const records = await getRecords(dataset);
        const total = records.length;

        // Placeholder replacement rules (explicit, scoped to the two datasets)
        if (dataset === 'lines') {
          await client.query(
            `DELETE FROM canonical.purchase_order_lines
             WHERE organization_id=$1 AND source_file='public.purchase_orders'`,
            [ORG_ID],
          );
        }
        if (dataset === 'asset_costs') {
          await client.query(
            `DELETE FROM canonical.asset_costs
             WHERE organization_id=$1 AND source_file='public.maintenance_assets'`,
            [ORG_ID],
          );
        }

        const sourceType = dataset === 'lines' ? 'compras' : dataset;
        const logical = dataset === 'asset_costs' ? FILES.costos.logicalName : FILES.existencias2.logicalName;
        const batchId = await createBatch(client, logical, sourceType, total);
        return NextResponse.json({ ok: true, dataset, batchId, total });
      }

      if (action === 'finish') {
        if (!body.batchId) return NextResponse.json({ error: 'batchId requerido' }, { status: 400 });
        const counts = await statusCounts(client);
        await client.query(
          `UPDATE staging.import_batches SET status='promoted', promoted_at=now() WHERE id=$1`,
          [body.batchId],
        );
        return NextResponse.json({ ok: true, dataset, done: true, counts });
      }

      // action === 'slice'
      if (!body.batchId) return NextResponse.json({ error: 'batchId requerido' }, { status: 400 });
      const offset = Math.max(0, body.offset ?? 0);
      const limit = Math.min(10000, Math.max(1, body.limit ?? 5000));
      const records = await getRecords(dataset);
      const slice = records.slice(offset, offset + limit);

      let affected = 0;
      if (slice.length > 0) {
        if (dataset === 'lines') affected = await upsertLines(client, body.batchId, slice as LineRecord[]);
        else if (dataset === 'asset_costs')
          affected = await upsertAssetCosts(client, body.batchId, slice as AssetCostRecord[]);
        else if (dataset === 'products')
          affected = await upsertProducts(client, body.batchId, slice as ProductRecord[]);
      }

      const nextOffset = offset + slice.length;
      const done = nextOffset >= records.length;
      return NextResponse.json({
        ok: true,
        dataset,
        processed: slice.length,
        affected,
        offset,
        nextOffset,
        total: records.length,
        done,
      });
    });
  } catch (error) {
    console.error('[v0] canonical-import error:', error);
    return NextResponse.json({ error: String((error as Error).message) }, { status: 500 });
  }
}
