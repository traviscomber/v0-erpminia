export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for large file processing

import { NextRequest, NextResponse } from 'next/server';
import { del, get } from '@vercel/blob';
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

async function parseWorkbookFromBlob(blobUrlOrPath: string, fileName: string) {
  // The Blob store is configured for private access, so we must read it via the
  // SDK's get() with access: 'private' (a plain fetch would 401). The token
  // defaults to BLOB_READ_WRITE_TOKEN, passed explicitly for robustness.
  const result = await get(blobUrlOrPath, {
    access: 'private',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error('No se pudo leer el archivo subido');
  }

  const arrayBuffer = await new Response(result.stream).arrayBuffer();
  const file = new File([arrayBuffer], fileName, {
    type: result.blob.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return parseWorkbook(file);
}

/** Delete one blob URL or a JSON array of blob URLs. Swallows errors. */
async function cleanupBlobs(path: string | null) {
  if (!path) return;
  try {
    const urls: string[] = JSON.parse(path);
    if (Array.isArray(urls)) {
      await Promise.all(urls.map((u) => del(u).catch(() => null)));
      return;
    }
  } catch {
    // Not JSON — treat as a single URL
  }
  await del(path).catch(() => null);
}

async function combineChunksAndParse(
  chunkUrls: string[],
  fileName: string,
): Promise<Awaited<ReturnType<typeof parseWorkbook>>> {
  // Download all chunks in parallel and combine them
  const chunks: Uint8Array[] = [];
  const downloadPromises = chunkUrls.map(async (url) => {
    const result = await get(url, {
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || !result.stream) throw new Error(`Failed to download chunk: ${url}`);
    const ab = await new Response(result.stream).arrayBuffer();
    return new Uint8Array(ab);
  });

  for (const chunk of await Promise.all(downloadPromises)) {
    chunks.push(chunk);
  }

  // Combine chunks into single buffer
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  // Create File and parse
  const file = new File([combined], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return parseWorkbook(file);
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
  supabase: any,
  organizationId: string,
  userId: string | null,
  suppliers: SupplierRow[],
  stock: StockRow[],
  purchases: PurchaseAggregate[],
) {
  try {
    const { error: purchaseDeleteError } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('organization_id', organizationId)
      .ilike('po_number', 'EX-%');
    if (purchaseDeleteError) throw purchaseDeleteError;

    const { error: stockDeleteError } = await supabase
      .from('warehouse_stock')
      .delete()
      .eq('organization_id', organizationId)
      .eq('batch_number', 'MINMAX');
    if (stockDeleteError) throw stockDeleteError;

    if (suppliers.length > 0) {
      const suppliersWithRut = suppliers.filter((item) => item.rut);
      const suppliersWithoutRut = suppliers.filter((item) => !item.rut);

      if (suppliersWithRut.length > 0) {
        for (const batch of chunkArray(
          suppliersWithRut.map((item) => ({
            organization_id: organizationId,
            ...item,
            created_by: null,
          })),
          500,
        )) {
          const { error } = await supabase
            .from('suppliers')
            .upsert(batch, { onConflict: 'organization_id,rut' });
          if (error) throw error;
        }
      }

      if (suppliersWithoutRut.length > 0) {
        const { data: existingNames, error: existingNamesError } = await supabase
          .from('suppliers')
          .select('name')
          .eq('organization_id', organizationId);
        if (existingNamesError) throw existingNamesError;

        const existingNameSet = new Set(
          (existingNames || []).map((row: any) => normalizeText(row.name)),
        );

        const pending = suppliersWithoutRut.filter((item) => !existingNameSet.has(normalizeText(item.name)));
        for (const batch of chunkArray(
          pending.map((supplier) => ({
            organization_id: organizationId,
            ...supplier,
            created_by: null,
          })),
          500,
        )) {
          const { error } = await supabase.from('suppliers').insert(batch);
          if (error) throw error;
        }
      }
    }

    if (stock.length > 0) {
      for (const batch of chunkArray(
        stock.map((item) => ({
          organization_id: organizationId,
          ...item,
        })),
        500,
      )) {
        const { error } = await supabase
          .from('warehouse_stock')
          .upsert(batch, { onConflict: 'organization_id,part_code,batch_number' });
        if (error) throw error;
      }
    }

    if (purchases.length > 0) {
      for (const batch of chunkArray(
        purchases.map((item) => ({
          organization_id: organizationId,
          ...item,
          created_by: null,
        })),
        500,
      )) {
        const { error } = await supabase
          .from('purchase_orders')
          .upsert(batch, { onConflict: 'organization_id,po_number' });
        if (error) throw error;
      }
    }

    return;
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  let uploadedBlobPath: string | null = null;

  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) return context.response;

    const contentType = request.headers.get('content-type') || '';
    let parsed: Awaited<ReturnType<typeof parseWorkbook>>;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const chunkRefs: Array<{ url: string; index: number }> | undefined = body.chunks;
      const blobUrl = String(body.blobUrl || body.url || '').trim();
      const fileName = String(body.fileName || 'existencias.xlsx').trim();

      if (chunkRefs && Array.isArray(chunkRefs) && chunkRefs.length > 0) {
        // Assemble chunks uploaded by the client via /chunk endpoint
        const token = process.env.BLOB_READ_WRITE_TOKEN;
        const sorted = chunkRefs.sort((a, b) => a.index - b.index);
        const chunkBuffers = await Promise.all(
          sorted.map(async ({ url }) => {
            const result = await get(url, { access: 'private', token });
            if (!result?.stream) throw new Error(`No se pudo leer chunk: ${url}`);
            return new Uint8Array(await new Response(result.stream).arrayBuffer());
          }),
        );

        // Combine into a single buffer
        const totalLength = chunkBuffers.reduce((n, c) => n + c.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunkBuffers) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        // Store chunk URLs for cleanup
        uploadedBlobPath = JSON.stringify(sorted.map((c) => c.url));

        const assembledFile = new File([combined], fileName, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        parsed = await parseWorkbook(assembledFile);
      } else if (blobUrl) {
        uploadedBlobPath = blobUrl;
        parsed = await parseWorkbookFromBlob(blobUrl, fileName);
      } else {
        return NextResponse.json({ error: 'No se proporciono una referencia del archivo cargado' }, { status: 400 });
      }
    } else {
      // FormData multipart file upload
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        return NextResponse.json({ error: 'El archivo debe ser XLS o XLSX' }, { status: 400 });
      }

      parsed = await parseWorkbook(file);
    }

    await importData(
      context.supabase,
      context.organizationId,
      context.userId,
      parsed.suppliers,
      parsed.stock,
      parsed.purchases,
    );

    // Clean up uploaded blob(s)
    await cleanupBlobs(uploadedBlobPath);

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
    await cleanupBlobs(uploadedBlobPath);
    console.error('[v0] import-existencias error:', error);
    return NextResponse.json(
      { error: 'No se pudo importar el Excel', details: await formatError(error) },
      { status: 500 },
    );
  }
}
