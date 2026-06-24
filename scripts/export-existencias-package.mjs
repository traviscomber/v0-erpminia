import fs from 'node:fs/promises';
import path from 'node:path';
import xlsx from 'xlsx';

const workbookPath = process.argv[2] || 'C:/Users/juanf/Downloads/Existencias (1).xlsx';
const outputDir = process.argv[3] || path.resolve(process.cwd(), 'outputs/existencias-import');

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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

function cleanValue(value) {
  return fixMojibake(value).trim().replace(/\s+/g, ' ');
}

function cleanAscii(value) {
  return cleanValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateValue(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return '';
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function rowsToCsv(rows, headers) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header] ?? '')).join(','));
  }
  return lines.join('\n');
}

function normalizeHeader(value) {
  return normalizeText(value)
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim();
}

function getSheet(workbook, contains) {
  const target = normalizeHeader(contains);
  const sheetName = workbook.SheetNames.find((name) => normalizeHeader(name).includes(target));
  return sheetName ? workbook.Sheets[sheetName] : null;
}

function sheetToRows(sheet) {
  return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
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
    const name = cleanAscii(row[idx.legalName] || row[idx.name] || '');
    const rut = cleanAscii(row[idx.rut] || '');
    if (!name && !rut) return [];
    const phone = cleanAscii(row[idx.phone] || row[idx.fax] || '');
    const country = cleanAscii(row[idx.countryCode] || row[idx.country] || '');
    return [{
      name,
      rut: rut || '',
      email: cleanAscii(row[idx.email] || ''),
      phone: phone || '',
      address: cleanAscii(row[idx.address] || ''),
      city: cleanAscii(row[idx.city] || row[idx.comuna] || ''),
      region: cleanAscii(row[idx.region] || ''),
      country: country || 'CL',
      business_type: cleanAscii(row[idx.businessType] || ''),
      contact_person: cleanAscii(row[idx.name] || ''),
      payment_terms: cleanAscii(row[idx.paymentTerms] || ''),
      status: 'active',
    }];
  });
}

function deriveStockCategory(partCode, partName) {
  const code = normalizeText(partCode);
  const name = normalizeText(partName);
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
    const discontinuado = normalizeText(row[idx.discontinuado] || '').startsWith('si');
    if (discontinuado) return [];
    const partCode = cleanAscii(row[idx.batchNumber] || '');
    const partName = cleanAscii(row[idx.description] || '');
    if (!partCode || !partName) return [];
    const minStock = Math.max(0, Math.round(parseNumber(row[idx.minStock])));
    const maxStock = Math.max(minStock, Math.round(parseNumber(row[idx.maxStock]) || minStock));
    const unitCost = parseNumber(row[idx.cost]);
    const category = deriveStockCategory(partCode, partName);
    const notes = cleanAscii(row[idx.notes] || '');
    const className = cleanAscii(row[idx.class] || '');
    const unitMeasure = cleanAscii(row[idx.unitMeasure] || row[idx.additionalMeasure] || '');
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
    const number = cleanAscii(row[idx.number] || '');
    const vendor = cleanAscii(row[idx.vendor] || '');
    if (!number || !vendor) continue;
    const quantity = parseNumber(row[idx.quantity]);
    const unitCost = parseNumber(row[idx.unitCost]) || parseNumber(row[idx.originalCost]);
    const net = parseNumber(row[idx.net]) || quantity * unitCost;
    const product = cleanAscii(row[idx.product] || '');
    const date = parseDateValue(row[idx.date]) || '';
    if (!groups.has(number)) {
      groups.set(number, { number, vendor, date, items: new Set(), quantity: 0, totalAmount: 0, weightedPriceTotal: 0, weightedPriceQty: 0 });
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
  const workbook = xlsx.readFile(workbookPath, { cellDates: true });
  const suppliers = parseSuppliers(getSheet(workbook, 'Proveedores'));
  const stock = parseStock(getSheet(workbook, 'Stock min-max'));
  const purchases = parsePurchases(getSheet(workbook, 'compras'));

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'suppliers.csv'), rowsToCsv(suppliers, ['name', 'rut', 'email', 'phone', 'address', 'city', 'region', 'country', 'business_type', 'contact_person', 'payment_terms', 'status']), 'utf8');
  await fs.writeFile(path.join(outputDir, 'warehouse_stock.csv'), rowsToCsv(stock, ['part_code', 'part_name', 'quantity_on_hand', 'reorder_level', 'reorder_quantity', 'unit_cost', 'batch_number', 'supplier_lot']), 'utf8');
  await fs.writeFile(path.join(outputDir, 'purchase_orders.csv'), rowsToCsv(purchases, ['po_number', 'vendor_name', 'item_code', 'quantity', 'unit_price', 'total_amount', 'delivery_date', 'status']), 'utf8');
  await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify({
    workbookPath,
    generatedAt: new Date().toISOString(),
    counts: {
      suppliers: suppliers.length,
      warehouse_stock: stock.length,
      purchase_orders: purchases.length,
    },
  }, null, 2), 'utf8');

  process.stdout.write(JSON.stringify({
    outputDir,
    counts: { suppliers: suppliers.length, warehouse_stock: stock.length, purchase_orders: purchases.length },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
