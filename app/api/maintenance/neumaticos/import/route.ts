export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { read, utils } from 'xlsx/xlsx.mjs';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { normalizeText } from '@/lib/bodega-normalization';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ParsedRow = {
  partCode: string;
  partName: string;
  quantityOnHand: number;
  quantityReserved: number;
  unitCost: number;
  reorderLevel: number;
  reorderQuantity: number;
  familia: string;
  equipo: string;
};

type ColumnMap = {
  code: number;
  family: number;
  subFamily: number;
  team: number;
  product: number;
  stock: number;
  unitCost: number;
  value: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseNum(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')   // thousands separator (Chilean: 1.850.000)
    .replace(',', '.');   // decimal comma → dot
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

/** Ensure part_code always starts with NEU- so the neumaticos query picks it up. */
function normalizeCode(raw: string, product: string): string {
  const upper = raw.toUpperCase();
  if (upper.startsWith('NEU-') || upper.startsWith('LLANTA-')) return raw;
  // Derive a code from the product name when the raw code isn't tire-specific
  const slug = normalizeText(product)
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 20)
    .toUpperCase();
  return `NEU-${raw || slug}`;
}

function buildColumnMap(headers: string[]): ColumnMap {
  const idx = (pred: (h: string) => boolean) => headers.findIndex(pred);
  return {
    code:      idx(h => h.includes('codigo') || h.includes('code') || h === 'cod'),
    family:    idx(h => h.includes('familia') && !h.includes('sub')),
    subFamily: idx(h => h.includes('sub')),
    team:      idx(h => h.includes('equipo') || h.includes('maquina')),
    product:   idx(h => h.includes('producto') || h.includes('descripcion') || h.includes('nombre')),
    stock:     idx(h => h.includes('stock') || h.includes('cantidad') || h === 'qty'),
    unitCost:  idx(h => h.includes('valor unit') || h.includes('costo unit') || h.includes('precio unit')),
    value:     idx(h => h === 'valor' || h === 'total' || h.includes('valor total')),
  };
}

function parseRowValues(values: string[], cols: ColumnMap): ParsedRow | null {
  const product = cols.product >= 0 ? clean(values[cols.product]) : '';
  const codeRaw = cols.code >= 0 ? clean(values[cols.code]) : '';

  if (!product) return null;

  const stock    = cols.stock >= 0 ? parseNum(values[cols.stock]) : 0;
  const total    = cols.value >= 0 ? parseNum(values[cols.value]) : 0;
  let unitCost   = cols.unitCost >= 0 ? parseNum(values[cols.unitCost]) : 0;

  // Derive unit cost from total when not explicit
  if (unitCost === 0 && total > 0 && stock > 0) unitCost = total / stock;

  const familia  = cols.family >= 0 ? clean(values[cols.family]) : 'Neumaticos';
  const equipo   = cols.team >= 0   ? clean(values[cols.team])   : '';

  return {
    partCode:         normalizeCode(codeRaw, product),
    partName:         product,
    quantityOnHand:   stock,
    quantityReserved: 0,
    unitCost,
    reorderLevel:     stock > 0 ? Math.max(1, Math.floor(stock * 0.15)) : 0,
    reorderQuantity:  stock > 0 ? Math.max(2, Math.floor(stock * 0.3))  : 0,
    familia,
    equipo,
  };
}

async function parseXlsx(file: File): Promise<ParsedRow[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as unknown[][];
  if (rows.length < 2) return [];

  const rawHeaders = rows[0] as unknown[];
  const headers = rawHeaders.map(h => normalizeText(h));
  const cols = buildColumnMap(headers);

  return rows.slice(1).flatMap(row => {
    const values = (row as unknown[]).map(clean);
    const parsed = parseRowValues(values, cols);
    return parsed ? [parsed] : [];
  });
}

async function parseCsv(file: File): Promise<ParsedRow[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(h => normalizeText(h));
  const cols = buildColumnMap(headers);

  return lines.slice(1).flatMap(line => {
    const values = line.split(';').map(clean);
    const parsed = parseRowValues(values, cols);
    return parsed ? [parsed] : [];
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) {
      return context.response;
    }
    const orgContext = context;

    const formData = await request.formData();
    const file = formData.get('file');
    const previewOnly = formData.get('preview') === '1';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    let rows: ParsedRow[];

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      rows = await parseXlsx(file);
    } else if (name.endsWith('.csv')) {
      rows = await parseCsv(file);
    } else {
      return NextResponse.json({ error: 'Formato no soportado. Usa CSV, XLS o XLSX.' }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron filas válidas en el archivo. Verifica que tenga columnas CODIGO, PRODUCTO y STOCK.' }, { status: 400 });
    }

    // Deduplicate by partCode (last wins)
    const deduped = Array.from(
      rows.reduce((m, r) => { m.set(r.partCode, r); return m; }, new Map<string, ParsedRow>()).values()
    );

    // Preview mode: return parsed rows without writing to DB
    if (previewOnly) {
      return NextResponse.json({
        preview: deduped.slice(0, 20).map(r => ({
          partCode: r.partCode,
          partName: r.partName,
          familia: r.familia,
          equipo: r.equipo,
          stock: r.quantityOnHand,
          unitCost: r.unitCost,
        })),
        total: deduped.length,
      });
    }

    // Write to warehouse_stock
    const orgId = orgContext.organizationId;
    let inserted = 0;
    let updated = 0;

    for (const row of deduped) {
      // Try update first
      const { data: existing } = await orgContext.supabase
        .from('warehouse_stock')
        .select('id')
        .eq('organization_id', orgId)
        .eq('part_code', row.partCode)
        .maybeSingle();

      if (existing?.id) {
        await orgContext.supabase
          .from('warehouse_stock')
          .update({
            part_name:         row.partName,
            quantity_on_hand:  row.quantityOnHand,
            quantity_reserved: row.quantityReserved,
            unit_cost:         row.unitCost,
            reorder_level:     row.reorderLevel,
            reorder_quantity:  row.reorderQuantity,
            updated_at:        new Date().toISOString(),
          })
          .eq('id', existing.id);
        updated++;
      } else {
        await orgContext.supabase
          .from('warehouse_stock')
          .insert({
            organization_id:   orgId,
            part_code:         row.partCode,
            part_name:         row.partName,
            quantity_on_hand:  row.quantityOnHand,
            quantity_reserved: row.quantityReserved,
            unit_cost:         row.unitCost,
            reorder_level:     row.reorderLevel,
            reorder_quantity:  row.reorderQuantity,
          });
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deduped.length} neumáticos sincronizados correctamente`,
      total: deduped.length,
      inserted,
      updated,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al importar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
