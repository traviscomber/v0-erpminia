export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { canonicalCategory, normalizeText } from '@/lib/bodega-normalization';

type SupplierRow = {
  name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  business_type: string | null;
  contact_person: string | null;
  payment_terms: string | null;
  status: 'active';
};

type StockRow = {
  part_code: string;
  part_name: string;
  quantity_on_hand: number;
  reorder_level: number;
  reorder_quantity: number;
  unit_cost: number;
  batch_number: string;
  supplier_lot: string;
};

type PurchaseAggregate = {
  po_number: string;
  vendor_name: string;
  item_code: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  delivery_date: string | null;
  status: string;
};

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim();
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanValue(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function parseDateValue(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return null;
}

function getSheetByName(workbook: any, contains: string) {
  const target = normalizeHeader(contains);
  const name = workbook.SheetNames.find((sheetName: string) => normalizeHeader(sheetName).includes(target));
  return name ? workbook.Sheets[name] : null;
}

function toRows(sheet: any) {
  const xlsx = (globalThis as any).__xlsxModule as any;
  return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
}

function parseSuppliers(sheet: any): SupplierRow[] {
  if (!sheet) return [];
  const rows = toRows(sheet);
  if (!rows.length) return [];

  const headers = rows[0].map((value) => normalizeHeader(value));
  const idx = {
    city: headers.findIndex((h) => h.includes('ciudad')),
    comuna: headers.findIndex((h) => h.includes('comuna')),
    countryCode: headers.findIndex((h) => h.includes('country code')),
    address: headers.findIndex((h) => h.includes('direccion')),
    fax: headers.findIndex((h) => h.includes('fax')),
    paymentTerms: headers.findIndex((h) => h.includes('forma de pago')),
    businessType: headers.findIndex((h) => h.includes('giro')),
    name: headers.findIndex((h) => h === 'nombre'),
    country: headers.findIndex((h) => h === 'pais' || h.includes('pais')),
    rut: headers.findIndex((h) => h.includes('rut')),
    legalName: headers.findIndex((h) => h.includes('razon social')),
    region: headers.findIndex((h) => h.includes('region')),
    phone: headers.findIndex((h) => h.includes('telefono')),
    email: headers.findIndex((h) => h.includes('email')),
  };

  return rows.slice(1).flatMap((row) => {
    const name = cleanValue(row[idx.legalName] || row[idx.name] || '');
    const rut = cleanValue(row[idx.rut] || '');
    if (!name && !rut) return [];

    const phone = cleanValue(row[idx.phone] || row[idx.fax] || '');
    const country = cleanValue(row[idx.countryCode] || row[idx.country] || '');

    return [
      {
        name,
        rut: rut || null,
        email: cleanValue(row[idx.email] || '') || null,
        phone: phone || null,
        address: cleanValue(row[idx.address] || '') || null,
        city: cleanValue(row[idx.city] || row[idx.comuna] || '') || null,
        region: cleanValue(row[idx.region] || '') || null,
        country: country || 'CL',
        business_type: cleanValue(row[idx.businessType] || '') || null,
        contact_person: cleanValue(row[idx.name] || '') || null,
        payment_terms: cleanValue(row[idx.paymentTerms] || '') || null,
        status: 'active' as const,
      },
    ];
  });
}

function deriveStockCategory(partCode: string, partName: string) {
  const normalizedCode = normalizeText(partCode);
  const normalizedName = normalizeText(partName);

  if (normalizedCode.startsWith('epp') || normalizedName.includes('seguridad')) return 'EPP';
  if (normalizedCode.startsWith('lub') || normalizedName.includes('lubric')) return 'Lubricante';
  if (normalizedCode.startsWith('son') || normalizedName.includes('sond')) return 'Sondaje';
  if (normalizedCode.startsWith('ele') || normalizedName.includes('electr')) return 'Electrico';
  if (normalizedCode.startsWith('fer') || normalizedName.includes('ferreter')) return 'Ferreteria';
  if (normalizedCode.startsWith('bom') || normalizedName.includes('bomba')) return 'Bomba';
  if (normalizedCode.startsWith('viv') || normalizedName.includes('viver')) return 'Viveres';
  if (normalizedCode.startsWith('neu') || normalizedName.includes('neumatic')) return 'Neumatico';
  if (normalizedCode.startsWith('rod') || normalizedName.includes('rodamiento')) return 'Rodamiento';

  return canonicalCategory(partName || partCode || 'Sin categoria');
}

function parseStock(sheet: any): StockRow[] {
  if (!sheet) return [];
  const rows = toRows(sheet);
  if (!rows.length) return [];

  const headers = rows[0].map((value) => normalizeHeader(value));
  const idx = {
    discontinuado: headers.findIndex((h) => h.includes('discontinuado')),
    cost: headers.findIndex((h) => h.includes('costo unitario')),
    description: headers.findIndex((h) => h.includes('descripcion')),
    batchNumber: headers.findIndex((h) => h.includes('nombre codigo')),
    maxStock: headers.findIndex((h) => h.includes('stock maximo')),
    minStock: headers.findIndex((h) => h.includes('stock minimo')),
    unitMeasure: headers.findIndex((h) => h.includes('unidad de medida') && !h.includes('adicional')),
    additionalMeasure: headers.findIndex((h) => h.includes('unidad de medida adicional')),
    notes: headers.findIndex((h) => h.includes('notas')),
    class: headers.findIndex((h) => h === 'clase'),
  };

  return rows.slice(1).flatMap((row) => {
    const isDiscontinued = normalizeText(row[idx.discontinuado] || '').startsWith('si');
    if (isDiscontinued) return [];

    const partCode = cleanValue(row[idx.batchNumber] || '');
    const partName = cleanValue(row[idx.description] || '');
    if (!partCode || !partName) return [];

    const minStock = Math.max(0, Math.round(parseNumber(row[idx.minStock])));
    const maxStock = Math.max(minStock, Math.round(parseNumber(row[idx.maxStock]) || minStock));
    const unitCost = parseNumber(row[idx.cost]);
    const category = deriveStockCategory(partCode, partName);
    const notes = cleanValue(row[idx.notes] || '');
    const className = cleanValue(row[idx.class] || '');
    const unitMeasure = cleanValue(row[idx.unitMeasure] || row[idx.additionalMeasure] || '');

    return [
      {
        part_code: partCode,
        part_name: partName,
        quantity_on_hand: 0,
        reorder_level: minStock,
        reorder_quantity: maxStock,
        unit_cost: unitCost,
        batch_number: 'MINMAX',
        supplier_lot: [category, className, unitMeasure, notes].filter(Boolean).join(' | ') || 'EXISTENCIAS',
      },
    ];
  });
}

function parsePurchases(sheet: any): PurchaseAggregate[] {
  if (!sheet) return [];
  const rows = toRows(sheet);
  if (!rows.length) return [];

  const headers = rows[0].map((value) => normalizeHeader(value));
  const idx = {
    number: headers.findIndex((h) => h.includes('numero')),
    date: headers.findIndex((h) => h === 'fecha'),
    vendor: headers.findIndex((h) => h.includes('proveedor')),
    costCenter: headers.findIndex((h) => h.includes('centro costo')),
    product: headers.findIndex((h) => h.includes('producto')),
    description: headers.findIndex((h) => h.includes('descripcion')),
    quantity: headers.findIndex((h) => h.includes('cantidad')),
    originalCost: headers.findIndex((h) => h.includes('costo uni original')),
    unitCost: headers.findIndex((h) => h.includes('costo unitario')),
    net: headers.findIndex((h) => h.includes('neto')),
  };

  const groups = new Map<
    string,
    {
      number: string;
      vendor: string;
      date: string | null;
      items: Set<string>;
      quantity: number;
      totalAmount: number;
      weightedPriceTotal: number;
      weightedPriceQty: number;
    }
  >();

  for (const row of rows.slice(1)) {
    const number = cleanValue(row[idx.number] || '');
    const vendor = cleanValue(row[idx.vendor] || '');
    if (!number || !vendor) continue;

    const key = number;
    const quantity = parseNumber(row[idx.quantity]);
    const unitCost = parseNumber(row[idx.unitCost]) || parseNumber(row[idx.originalCost]);
    const net = parseNumber(row[idx.net]) || quantity * unitCost;
    const product = cleanValue(row[idx.product] || '');
    const date = parseDateValue(row[idx.date]);

    if (!groups.has(key)) {
      groups.set(key, {
        number,
        vendor,
        date,
        items: new Set(),
        quantity: 0,
        totalAmount: 0,
        weightedPriceTotal: 0,
        weightedPriceQty: 0,
      });
    }

    const group = groups.get(key)!;
    group.items.add(product || normalizeText(row[idx.description] || ''));
    group.quantity += quantity;
    group.totalAmount += net;
    group.weightedPriceTotal += quantity > 0 ? quantity * unitCost : net;
    group.weightedPriceQty += quantity > 0 ? quantity : 1;
    if (!group.date && date) group.date = date;
  }

  return Array.from(groups.values()).map((group) => {
    const itemCodes = Array.from(group.items).filter(Boolean);
    const itemCode = itemCodes.length === 1 ? itemCodes[0] : 'VARIOS';
    const unitPrice = group.quantity > 0 ? group.totalAmount / group.quantity : 0;

    return {
      po_number: `EX-${group.number}`,
      vendor_name: group.vendor,
      item_code: itemCode,
      quantity: Number(group.quantity.toFixed(2)),
      unit_price: Number(unitPrice.toFixed(2)),
      total_amount: Number(group.totalAmount.toFixed(0)),
      delivery_date: group.date,
      status: 'received',
    };
  });
}

async function parseWorkbook(file: File) {
  const xlsx = (await import('xlsx')) as any;
  (globalThis as any).__xlsxModule = xlsx;

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });

  return {
    workbook,
    suppliers: parseSuppliers(getSheetByName(workbook, 'proveedores')),
    stock: parseStock(getSheetByName(workbook, 'stock min-max')),
    purchases: parsePurchases(getSheetByName(workbook, 'compras')),
  };
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

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function formatError(error: unknown) {
  if (!error) return 'Unknown error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function importData(
  client: Client,
  organizationId: string,
  userId: string | null,
  suppliers: SupplierRow[],
  stock: StockRow[],
  purchases: PurchaseAggregate[],
) {
  await client.query('BEGIN');

  try {
    await client.query(
      `DELETE FROM public.purchase_orders WHERE organization_id = $1 AND po_number LIKE 'EX-%'`,
      [organizationId],
    );

    await client.query(
      `DELETE FROM public.warehouse_stock WHERE organization_id = $1 AND batch_number = 'MINMAX'`,
      [organizationId],
    );

    if (suppliers.length > 0) {
      const suppliersWithRut = suppliers.filter((item) => item.rut);
      const suppliersWithoutRut = suppliers.filter((item) => !item.rut);

      if (suppliersWithRut.length > 0) {
        await client.query(
          `
            INSERT INTO public.suppliers (
              organization_id,
              name,
              rut,
              email,
              phone,
              address,
              city,
              region,
              country,
              business_type,
              contact_person,
              payment_terms,
              status,
              created_by
            )
            SELECT
              x.organization_id,
              x.name,
              x.rut,
              x.email,
              x.phone,
              x.address,
              x.city,
              x.region,
              x.country,
              x.business_type,
              x.contact_person,
              x.payment_terms,
              x.status,
              x.created_by
            FROM jsonb_to_recordset($1::jsonb) AS x(
              organization_id uuid,
              name text,
              rut text,
              email text,
              phone text,
              address text,
              city text,
              region text,
              country text,
              business_type text,
              contact_person text,
              payment_terms text,
              status text,
              created_by uuid
            )
            ON CONFLICT (organization_id, rut) DO UPDATE SET
              name = EXCLUDED.name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              address = EXCLUDED.address,
              city = EXCLUDED.city,
              region = EXCLUDED.region,
              country = EXCLUDED.country,
              business_type = EXCLUDED.business_type,
              contact_person = EXCLUDED.contact_person,
              payment_terms = EXCLUDED.payment_terms,
              status = EXCLUDED.status,
              updated_at = NOW(),
              created_by = EXCLUDED.created_by;
          `,
          [
            JSON.stringify(
              suppliersWithRut.map((item) => ({
                organization_id: organizationId,
                ...item,
                created_by: userId,
              })),
            ),
          ],
        );
      }

      if (suppliersWithoutRut.length > 0) {
        const existingNames = await client.query(
          `SELECT name FROM public.suppliers WHERE organization_id = $1`,
          [organizationId],
        );
        const existingNameSet = new Set(
          existingNames.rows.map((row: any) => normalizeText(row.name)),
        );

        const pending = suppliersWithoutRut.filter((item) => !existingNameSet.has(normalizeText(item.name)));

        for (const supplier of pending) {
          await client.query(
            `
              INSERT INTO public.suppliers (
                organization_id,
                name,
                rut,
                email,
                phone,
                address,
                city,
                region,
                country,
                business_type,
                contact_person,
                payment_terms,
                status,
                created_by
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            `,
            [
              organizationId,
              supplier.name,
              supplier.rut,
              supplier.email,
              supplier.phone,
              supplier.address,
              supplier.city,
              supplier.region,
              supplier.country,
              supplier.business_type,
              supplier.contact_person,
              supplier.payment_terms,
              supplier.status,
              userId,
            ],
          );
        }
      }
    }

    if (stock.length > 0) {
      for (const batch of chunkArray(stock, 500)) {
        await client.query(
          `
            INSERT INTO public.warehouse_stock (
              organization_id,
              part_code,
              part_name,
              quantity_on_hand,
              quantity_reserved,
              reorder_level,
              reorder_quantity,
              unit_cost,
              batch_number,
              supplier_lot,
              updated_at
            )
            SELECT
              x.organization_id,
              x.part_code,
              x.part_name,
              x.quantity_on_hand,
              0,
              x.reorder_level,
              x.reorder_quantity,
              x.unit_cost,
              x.batch_number,
              x.supplier_lot,
              NOW()
            FROM jsonb_to_recordset($1::jsonb) AS x(
              organization_id uuid,
              part_code text,
              part_name text,
              quantity_on_hand integer,
              reorder_level integer,
              reorder_quantity integer,
              unit_cost numeric,
              batch_number text,
              supplier_lot text
            )
            ON CONFLICT (organization_id, part_code, batch_number) DO UPDATE SET
              part_name = EXCLUDED.part_name,
              quantity_on_hand = EXCLUDED.quantity_on_hand,
              reorder_level = EXCLUDED.reorder_level,
              reorder_quantity = EXCLUDED.reorder_quantity,
              unit_cost = EXCLUDED.unit_cost,
              supplier_lot = EXCLUDED.supplier_lot,
              updated_at = NOW();
          `,
          [
            JSON.stringify(
              batch.map((item) => ({
                organization_id: organizationId,
                ...item,
              })),
            ),
          ],
        );
      }
    }

    if (purchases.length > 0) {
      for (const batch of chunkArray(purchases, 500)) {
        await client.query(
          `
            INSERT INTO public.purchase_orders (
              organization_id,
              po_number,
              vendor_name,
              item_code,
              quantity,
              unit_price,
              total_amount,
              delivery_date,
              status,
              created_by
            )
            SELECT
              x.organization_id,
              x.po_number,
              x.vendor_name,
              x.item_code,
              x.quantity,
              x.unit_price,
              x.total_amount,
              x.delivery_date,
              x.status,
              x.created_by
            FROM jsonb_to_recordset($1::jsonb) AS x(
              organization_id uuid,
              po_number text,
              vendor_name text,
              item_code text,
              quantity numeric,
              unit_price numeric,
              total_amount numeric,
              delivery_date date,
              status text,
              created_by uuid
            )
            ON CONFLICT (organization_id, po_number) DO UPDATE SET
              vendor_name = EXCLUDED.vendor_name,
              item_code = EXCLUDED.item_code,
              quantity = EXCLUDED.quantity,
              unit_price = EXCLUDED.unit_price,
              total_amount = EXCLUDED.total_amount,
              delivery_date = EXCLUDED.delivery_date,
              status = EXCLUDED.status,
              updated_at = NOW();
          `,
          [
            JSON.stringify(
              batch.map((item) => ({
                organization_id: organizationId,
                ...item,
                created_by: userId,
              })),
            ),
          ],
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 });
    }

    const parsed = await parseWorkbook(file);
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ error: 'El archivo debe ser XLS o XLSX' }, { status: 400 });
    }

    await withPgClient(async (client) => {
      await importData(
        client,
        context.organizationId,
        context.userId,
        parsed.suppliers,
        parsed.stock,
        parsed.purchases,
      );
    });

    return NextResponse.json({
      success: true,
      message: 'Excel importado correctamente',
      suppliersImported: parsed.suppliers.length,
      stockImported: parsed.stock.length,
      purchasesImported: parsed.purchases.length,
      samples: {
        suppliers: parsed.suppliers.slice(0, 3),
        stock: parsed.stock.slice(0, 3),
        purchases: parsed.purchases.slice(0, 3),
      },
    });
  } catch (error) {
    console.error('[v0] import-existencias error:', error);
    return NextResponse.json(
      { error: 'No se pudo importar el Excel', details: await formatError(error) },
      { status: 500 },
    );
  }
}
