export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { loadXlsxModule } from '@/lib/xlsx';

type ImportCostRow = {
  work_order_number: string;
  asset_code?: string;
  completion_date?: string;
  actual_cost?: number;
  parts_cost?: number;
  labor_cost?: number;
  notes?: string;
};

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeHeader(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value ?? '').replace(/\./g, '').replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function pickIndex(headers: string[], variants: string[]) {
  return headers.findIndex((header) => variants.some((variant) => header.includes(variant)));
}

function parseCsvRows(text: string): ImportCostRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(normalizeHeader);
  const columns = {
    work_order_number: pickIndex(headers, ['ot', 'orden_trabajo', 'work_order', 'wo']),
    asset_code: pickIndex(headers, ['codigo_activo', 'asset_code', 'activo', 'codigo']),
    completion_date: pickIndex(headers, ['fecha_cierre', 'completion_date', 'fecha']),
    actual_cost: pickIndex(headers, ['costo_total', 'actual_cost', 'costo_real', 'costo']),
    parts_cost: pickIndex(headers, ['partes', 'parts_cost', 'repuestos']),
    labor_cost: pickIndex(headers, ['mano_obra', 'labor_cost', 'labor']),
    notes: pickIndex(headers, ['observaciones', 'notes', 'comentarios', 'detalle']),
  };

  return lines.slice(1).flatMap((line) => {
    const values = line.split(';').map(normalizeText);
    const workOrderNumber = values[columns.work_order_number] || '';
    if (!workOrderNumber) return [];

    return [
      {
        work_order_number: workOrderNumber,
        asset_code: values[columns.asset_code] || '',
        completion_date: parseDate(values[columns.completion_date]),
        actual_cost: parseNumber(values[columns.actual_cost]),
        parts_cost: parseNumber(values[columns.parts_cost]),
        labor_cost: parseNumber(values[columns.labor_cost]),
        notes: values[columns.notes] || '',
      },
    ];
  });
}

async function parseWorkbook(file: File) {
  const xlsx = await loadXlsxModule();
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  if (rows.length < 2) return [];

  const csvText = [
    rows[0].map((value) => normalizeText(value)).join(';'),
    ...rows.slice(1).map((row) => row.map((value) => normalizeText(value)).join(';')),
  ].join('\n');

  return parseCsvRows(csvText);
}

async function parseImportFile(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.csv')) return parseCsvRows(await file.text());
  if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) return parseWorkbook(file);
  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Se requiere archivo CSV, XLS o XLSX' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 });
    }

    const rows = await parseImportFile(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron costos validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    let updatedOrders = 0;
    let insertedHistory = 0;
    let updatedHistory = 0;
    let skipped = 0;
    const preview: Array<{
      work_order_number: string;
      asset_code: string | null;
      action: 'update_order' | 'insert_history' | 'update_history' | 'skip';
    }> = [];

    for (const row of rows) {
      const actualCost = row.actual_cost || 0;
      const partsCost = row.parts_cost || 0;
      const laborCost = row.labor_cost || 0;
      const { data: workOrder, error: workOrderError } = await context.supabase
        .from('maintenance_work_orders')
        .select('id, work_order_number, asset_id, completion_date, actual_cost')
        .eq('organization_id', context.organizationId)
        .eq('work_order_number', row.work_order_number)
        .maybeSingle();

      if (workOrderError) throw workOrderError;
      if (!workOrder?.id) {
        skipped += 1;
        if (preview.length < 20) {
          preview.push({ work_order_number: row.work_order_number, asset_code: row.asset_code || null, action: 'skip' });
        }
        continue;
      }

      const updatePayload: Record<string, unknown> = {};
      if (actualCost > 0) updatePayload.actual_cost = actualCost;
      if (row.completion_date) updatePayload.completion_date = row.completion_date;
      if (Object.keys(updatePayload).length > 0) {
        updatedOrders += 1;
        if (preview.length < 20) {
          preview.push({ work_order_number: row.work_order_number, asset_code: row.asset_code || null, action: 'update_order' });
        }
        if (!dryRun) {
          const { error: updateError } = await context.supabase
            .from('maintenance_work_orders')
            .update(updatePayload)
            .eq('id', workOrder.id)
            .eq('organization_id', context.organizationId);
          if (updateError) throw updateError;
        }
      }

      const hasHistoryValues = partsCost > 0 || laborCost > 0 || Boolean(row.notes);
      if (!hasHistoryValues) continue;

      let assetId = workOrder.asset_id || null;
      if (!assetId && row.asset_code) {
        const { data: asset, error: assetError } = await context.supabase
          .from('maintenance_assets')
          .select('id')
          .eq('organization_id', context.organizationId)
          .eq('asset_code', row.asset_code)
          .maybeSingle();
        if (assetError) throw assetError;
        assetId = asset?.id || null;
      }

      const historyTime = row.completion_date || workOrder.completion_date || new Date().toISOString();
      const historyPayload = {
        work_order_id: workOrder.id,
        asset_id: assetId,
        maintenance_type: 'cost_import',
        performed_by_name: 'Importacion Excel',
        start_time: historyTime,
        end_time: historyTime,
        parts_cost: partsCost,
        labor_cost: laborCost,
        notes: row.notes || `Importado desde ${file.name}`,
      };

      const { data: existingHistory, error: historyLookupError } = await context.supabase
        .from('maintenance_history')
        .select('id')
        .eq('work_order_id', workOrder.id)
        .eq('start_time', historyTime)
        .maybeSingle();

      if (historyLookupError) throw historyLookupError;

      if (existingHistory?.id) {
        updatedHistory += 1;
        if (preview.length < 20) {
          preview.push({ work_order_number: row.work_order_number, asset_code: row.asset_code || null, action: 'update_history' });
        }
        if (!dryRun) {
          const { error: historyUpdateError } = await context.supabase
            .from('maintenance_history')
            .update(historyPayload)
            .eq('id', existingHistory.id);
          if (historyUpdateError) throw historyUpdateError;
        }
      } else {
        insertedHistory += 1;
        if (preview.length < 20) {
          preview.push({ work_order_number: row.work_order_number, asset_code: row.asset_code || null, action: 'insert_history' });
        }
        if (!dryRun) {
          const { error: historyInsertError } = await context.supabase.from('maintenance_history').insert(historyPayload);
          if (historyInsertError) throw historyInsertError;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Validacion completada sin escribir datos' : 'Costos de mantenimiento importados correctamente',
      updated_orders: updatedOrders,
      inserted_history: insertedHistory,
      updated_history: updatedHistory,
      skipped,
      total: rows.length,
      dry_run: dryRun,
      preview,
    });
  } catch (error) {
    console.error('[maintenance/costs/import]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron importar los costos' },
      { status: 500 }
    );
  }
}

