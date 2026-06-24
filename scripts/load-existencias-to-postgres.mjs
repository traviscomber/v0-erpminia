import fs from 'node:fs/promises';
import path from 'node:path';
import xlsx from 'xlsx';
import { Client } from 'pg';

const workbookPath = process.argv[2] || 'C:/Users/juanf/Downloads/Existencias (1).xlsx';
const dryRun = process.argv.includes('--dry-run');

function getConnectionString() {
  return process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || '';
}

function normalizeHeader(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .toLowerCase();
}

function cleanText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function parseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function fixMojibake(value) {
  const text = String(value ?? '');
  if (!/[ÃÂ]/.test(text)) return text;
  try {
    return Buffer.from(text, 'latin1').toString('utf8');
  } catch {
    return text;
  }
}

function exactText(value) {
  return fixMojibake(value).trim().replace(/\s+/g, ' ');
}

function getSheet(workbook, contains) {
  const target = normalizeHeader(contains);
  const sheetName = workbook.SheetNames.find((name) => normalizeHeader(name).includes(target));
  return sheetName ? workbook.Sheets[sheetName] : null;
}

function sheetToRows(sheet) {
  return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function parseSuppliers(sheet) {
  if (!sheet) return [];
  const rows = sheetToRows(sheet);
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
    const name = exactText(row[idx.legalName] || row[idx.name] || '');
    const rut = exactText(row[idx.rut] || '');
    if (!name && !rut) return [];
    return [{
      name,
      rut: rut || null,
      email: exactText(row[idx.email] || '') || null,
      phone: exactText(row[idx.phone] || row[idx.fax] || '') || null,
      address: exactText(row[idx.address] || '') || null,
      city: exactText(row[idx.city] || row[idx.comuna] || '') || null,
      region: exactText(row[idx.region] || '') || null,
      country: exactText(row[idx.countryCode] || row[idx.country] || '') || 'CL',
      business_type: exactText(row[idx.businessType] || '') || null,
      contact_person: exactText(row[idx.name] || '') || null,
      payment_terms: exactText(row[idx.paymentTerms] || '') || null,
      status: 'active',
    }];
  });
}

function deriveStockCategory(partCode, partName) {
  const code = String(partCode ?? '').toLowerCase();
  const name = String(partName ?? '').toLowerCase();
  if (code.startsWith('epp') || name.includes('seguridad')) return 'EPP';
  if (code.startsWith('lub') || name.includes('lubric')) return 'Lubricante';
  if (code.startsWith('son') || name.includes('sond')) return 'Sondaje';
  if (code.startsWith('ele') || name.includes('electr')) return 'Electrico';
  if (code.startsWith('fer') || name.includes('ferreter')) return 'Ferreteria';
  if (code.startsWith('bom') || name.includes('bomba')) return 'Bomba';
  if (code.startsWith('viv') || name.includes('viver')) return 'Viveres';
  if (code.startsWith('neu') || name.includes('neumatic')) return 'Neumatico';
  if (code.startsWith('rod') || name.includes('rodamiento')) return 'Rodamiento';
  return 'Otros';
}

function parseStock(sheet) {
  if (!sheet) return [];
  const rows = sheetToRows(sheet);
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
    const discontinuado = String(row[idx.discontinuado] ?? '').trim().toLowerCase().startsWith('si');
    if (discontinuado) return [];
    const partCode = exactText(row[idx.batchNumber] || '');
    const partName = exactText(row[idx.description] || '');
    if (!partCode || !partName) return [];
    const minStock = Math.max(0, Math.round(parseNumber(row[idx.minStock]) || 0));
    const maxStock = Math.max(minStock, Math.round(parseNumber(row[idx.maxStock]) || minStock));
    const unitCost = parseNumber(row[idx.cost]);
    const category = deriveStockCategory(partCode, partName);
    const notes = exactText(row[idx.notes] || '');
    const className = exactText(row[idx.class] || '');
    const unitMeasure = exactText(row[idx.unitMeasure] || row[idx.additionalMeasure] || '');
    return [{
      part_code: partCode,
      part_name: partName,
      quantity_on_hand: 0,
      reorder_level: minStock,
      reorder_quantity: maxStock,
      unit_cost: unitCost,
      batch_number: 'MINMAX',
      supplier_lot: [category, className, unitMeasure, notes].filter(Boolean).join(' | ') || 'EXISTENCIAS',
    }];
  });
}

function parsePurchases(sheet) {
  if (!sheet) return [];
  const rows = sheetToRows(sheet);
  if (!rows.length) return [];
  const headers = rows[0].map((value) => normalizeHeader(value));
  const idx = {
    number: headers.findIndex((h) => h.includes('numero')),
    date: headers.findIndex((h) => h === 'fecha'),
    vendor: headers.findIndex((h) => h.includes('proveedor')),
    product: headers.findIndex((h) => h.includes('producto')),
    quantity: headers.findIndex((h) => h.includes('cantidad')),
    originalCost: headers.findIndex((h) => h.includes('costo uni original')),
    unitCost: headers.findIndex((h) => h.includes('costo unitario')),
    net: headers.findIndex((h) => h.includes('neto')),
  };

  const groups = new Map();
  for (const row of rows.slice(1)) {
    const number = exactText(row[idx.number] || '');
    const vendor = exactText(row[idx.vendor] || '');
    if (!number || !vendor) continue;
    const quantity = parseNumber(row[idx.quantity]) || 0;
    const unitCost = parseNumber(row[idx.unitCost]) ?? parseNumber(row[idx.originalCost]) ?? 0;
    const net = parseNumber(row[idx.net]) ?? quantity * unitCost;
    const product = exactText(row[idx.product] || '');
    const date = parseDateValue(row[idx.date]);
    if (!groups.has(number)) {
      groups.set(number, {
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
    const group = groups.get(number);
    group.vendor = group.vendor || vendor;
    group.date = group.date || date;
    if (product) group.items.add(product);
    group.quantity += quantity;
    group.totalAmount += net;
    if (quantity > 0 && unitCost > 0) {
      group.weightedPriceTotal += quantity * unitCost;
      group.weightedPriceQty += quantity;
    }
  }

  return Array.from(groups.values()).map((group) => ({
    po_number: `EX-${group.number}`,
    vendor_name: group.vendor,
    item_code: group.items.size <= 1 ? (group.items.values().next().value || 'VARIOS') : 'VARIOS',
    quantity: Math.round(group.quantity),
    unit_price: group.weightedPriceQty > 0 ? group.weightedPriceTotal / group.weightedPriceQty : group.totalAmount / Math.max(group.quantity, 1),
    total_amount: group.totalAmount,
    delivery_date: group.date,
    status: 'received',
  }));
}

async function main() {
  const connectionString = getConnectionString();
  if (!connectionString && !dryRun) {
    throw new Error('Falta POSTGRES_URL o POSTGRES_URL_NON_POOLING en el entorno');
  }

  const workbook = xlsx.readFile(workbookPath, { cellDates: true });
  const suppliers = parseSuppliers(getSheet(workbook, 'Proveedores'));
  const stock = parseStock(getSheet(workbook, 'Stock min-max'));
  const purchases = parsePurchases(getSheet(workbook, 'compras'));

  const summary = {
    workbookPath,
    counts: {
      suppliers: suppliers.length,
      warehouse_stock: stock.length,
      purchase_orders: purchases.length,
    },
    sample: {
      suppliers: suppliers.slice(0, 2),
      warehouse_stock: stock.slice(0, 2),
      purchase_orders: purchases.slice(0, 2),
    },
  };

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM public.purchase_orders WHERE po_number LIKE 'EX-%' AND organization_id = (
        SELECT organization_id FROM public.profiles WHERE email = $1 ORDER BY created_at ASC NULLS LAST LIMIT 1
      )`,
      [process.env.SUPABASE_USER_EMAIL || 'juan@n3uralia.com'],
    );

    await client.query(
      `DELETE FROM public.warehouse_stock WHERE batch_number = 'MINMAX' AND organization_id = (
        SELECT organization_id FROM public.profiles WHERE email = $1 ORDER BY created_at ASC NULLS LAST LIMIT 1
      )`,
      [process.env.SUPABASE_USER_EMAIL || 'juan@n3uralia.com'],
    );

    const orgLookup = await client.query(
      `SELECT organization_id FROM public.profiles WHERE email = $1 ORDER BY created_at ASC NULLS LAST LIMIT 1`,
      [process.env.SUPABASE_USER_EMAIL || 'juan@n3uralia.com'],
    );
    if (!orgLookup.rows.length) throw new Error('No se encontro organization_id para el usuario');
    const organizationId = orgLookup.rows[0].organization_id;

    if (suppliers.length > 0) {
      for (const batch of chunkArray(suppliers, 500)) {
        await client.query(
          `
            INSERT INTO public.suppliers (
              organization_id, name, rut, email, phone, address, city, region, country, business_type, contact_person, payment_terms, status
            )
            SELECT
              x.organization_id, x.name, x.rut, x.email, x.phone, x.address, x.city, x.region, x.country, x.business_type, x.contact_person, x.payment_terms, x.status
            FROM jsonb_to_recordset($1::jsonb) AS x(
              organization_id uuid, name text, rut text, email text, phone text, address text, city text, region text, country text, business_type text, contact_person text, payment_terms text, status text
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
              updated_at = NOW();
          `,
          [JSON.stringify(batch.map((item) => ({ organization_id: organizationId, ...item })))],
        );
      }
    }

    if (stock.length > 0) {
      for (const batch of chunkArray(stock, 500)) {
        await client.query(
          `
            INSERT INTO public.warehouse_stock (
              organization_id, part_code, part_name, quantity_on_hand, quantity_reserved, reorder_level, reorder_quantity, unit_cost, batch_number, supplier_lot, updated_at
            )
            SELECT
              x.organization_id, x.part_code, x.part_name, x.quantity_on_hand, 0, x.reorder_level, x.reorder_quantity, x.unit_cost, x.batch_number, x.supplier_lot, NOW()
            FROM jsonb_to_recordset($1::jsonb) AS x(
              organization_id uuid, part_code text, part_name text, quantity_on_hand integer, reorder_level integer, reorder_quantity integer, unit_cost numeric, batch_number text, supplier_lot text
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
          [JSON.stringify(batch.map((item) => ({ organization_id: organizationId, ...item })))],
        );
      }
    }

    if (purchases.length > 0) {
      for (const batch of chunkArray(purchases, 500)) {
        await client.query(
          `
            INSERT INTO public.purchase_orders (
              organization_id, po_number, vendor_name, item_code, quantity, unit_price, total_amount, delivery_date, status
            )
            SELECT
              x.organization_id, x.po_number, x.vendor_name, x.item_code, x.quantity, x.unit_price, x.total_amount, x.delivery_date, x.status
            FROM jsonb_to_recordset($1::jsonb) AS x(
              organization_id uuid, po_number text, vendor_name text, item_code text, quantity numeric, unit_price numeric, total_amount numeric, delivery_date date, status text
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
          [JSON.stringify(batch.map((item) => ({ organization_id: organizationId, ...item })))],
        );
      }
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({ ok: true, counts: summary.counts }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
