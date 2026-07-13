export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { loadXlsxModule } from '@/lib/xlsx';
import {
  buildEquipmentCostSignature,
  matchEquipmentCostRow,
  parseEquipmentCostWorkbook,
  toEquipmentCostDisplayLabel,
  type MaintenanceCostCenterRow,
  type MaintenanceEquipmentAssetRow,
} from '@/lib/maintenance/equipment-cost-ledger';

async function parseImportFile(file: File) {
  const filename = file.name.toLowerCase();
  if (filename.endsWith('.csv')) {
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => line.split(';').map((cell) => cell.replace(/^"|"$/g, '').trim()));
    return parseEquipmentCostWorkbook(rows, 'CSV');
  }

  if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) {
    const xlsx = await loadXlsxModule();
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName =
      workbook.SheetNames.find((name) => name.toLowerCase() === 'base') ||
      workbook.SheetNames.find((name) => name.toLowerCase().includes('base')) ||
      workbook.SheetNames[0];
    if (!sheetName) {
      return parseEquipmentCostWorkbook([], '');
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return parseEquipmentCostWorkbook([], sheetName);

    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
    return parseEquipmentCostWorkbook(rows, sheetName);
  }

  throw new Error('Formato no soportado. Usa CSV, XLS o XLSX.');
}

function buildPreviewLabel(row: { accountName: string; equipmentName: string; category: string; amount: number }) {
  return `${toEquipmentCostDisplayLabel(row.accountName)} | ${toEquipmentCostDisplayLabel(row.equipmentName)} | ${toEquipmentCostDisplayLabel(row.category)} | ${row.amount.toLocaleString('es-CL')}`;
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

    const parsed = await parseImportFile(file);
    if (parsed.rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron costos validos en el archivo', imported: 0, updated: 0 }, { status: 400 });
    }

    const [assetsResult, costCentersResult] = await Promise.all([
      context.supabase
        .from('maintenance_assets')
        .select('id, asset_code, asset_name, asset_type, model, manufacturer, status, criticality')
        .eq('organization_id', context.organizationId),
      context.supabase
        .from('cost_centers')
        .select('id, code, name, description, status')
        .eq('organization_id', context.organizationId),
    ]);

    if (assetsResult.error) throw assetsResult.error;
    if (costCentersResult.error) throw costCentersResult.error;

    const assets = (Array.isArray(assetsResult.data) ? (assetsResult.data as MaintenanceEquipmentAssetRow[]) : []).filter(Boolean);
    const costCenters = (Array.isArray(costCentersResult.data) ? (costCentersResult.data as MaintenanceCostCenterRow[]) : []).filter(Boolean);

    const payloads = parsed.rows.map((row) => {
      const match = matchEquipmentCostRow(row, assets, costCenters);
      return {
        organization_id: context.organizationId,
        source_type: 'equipment_excel',
        source_sheet: parsed.sheetName,
        source_row: row.rowNumber,
        row_signature: buildEquipmentCostSignature(row),
        cost_date: row.costDate || `${row.year || new Date().getFullYear()}-01-01`,
        recorded_at: new Date().toISOString(),
        account_code: row.accountCode || null,
        account_name: row.accountName || null,
        document_number: row.documentNumber || null,
        concept: row.detailConcept || null,
        category_snapshot: row.category || null,
        equipment_name_snapshot: row.equipmentName || null,
        asset_code_snapshot: match.assetCodeSnapshot,
        asset_id: match.assetId,
        cost_center_id: match.costCenterId,
        matched_by: match.matchedBy,
        match_confidence: match.matchConfidence,
        parts_cost: 0,
        labor_cost: 0,
        total_cost: row.amount,
        raw_payload: {
          accountName: row.accountName,
          documentType: row.documentType,
          month: row.month,
          year: row.year,
          detailConcept: row.detailConcept,
          category: row.category,
          rut: row.rut,
          rutName: row.rutName,
          sheetName: parsed.sheetName,
        },
      };
    });

    const imported = payloads.length;
    const matchedAssets = payloads.filter((item) => item.asset_id).length;
    const matchedCostCenters = payloads.filter((item) => item.cost_center_id).length;
    const unmatched = payloads.length - matchedAssets;
    const totalCost = payloads.reduce((sum, item) => sum + Number(item.total_cost || 0), 0);

    if (!dryRun) {
      const chunkSize = 250;
      for (let index = 0; index < payloads.length; index += chunkSize) {
        const chunk = payloads.slice(index, index + chunkSize);
        const { error } = await context.supabase
          .from('maintenance_costs')
          .upsert(chunk, { onConflict: 'organization_id,row_signature' });
        if (error) throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? 'Validacion completada sin escribir datos'
        : 'Costos de equipos importados correctamente',
      dry_run: dryRun,
      imported,
      matched_assets: matchedAssets,
      matched_cost_centers: matchedCostCenters,
      unmatched,
      total_cost: Number(totalCost.toFixed(2)),
      preview: payloads.slice(0, 20).map((item) => ({
        account_name: item.account_name,
        equipment_name: item.equipment_name_snapshot,
        category: item.category_snapshot,
        total_cost: item.total_cost,
        match_source: item.matched_by,
        match_confidence: item.match_confidence,
        label: buildPreviewLabel({
          accountName: item.account_name || '',
          equipmentName: item.equipment_name_snapshot || '',
          category: item.category_snapshot || '',
          amount: Number(item.total_cost || 0),
        }),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron importar los costos de equipos';
    console.error('[maintenance/equipment-costs/import]', error);
    return NextResponse.json({ error: message, imported: 0, updated: 0 }, { status: 500 });
  }
}
