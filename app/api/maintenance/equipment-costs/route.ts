export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext, type OrganizationSuccessContext } from '@/lib/api/organization-context';
import {
  type MaintenanceEquipmentAssetRow,
  type MaintenanceCostCenterRow,
} from '@/lib/maintenance/equipment-cost-ledger';

type EquipmentCostLedgerRow = {
  id: string;
  asset_id: string | null;
  cost_center_id: string | null;
  cost_date: string | null;
  source_type: string | null;
  source_sheet: string | null;
  source_row: number | null;
  account_code: string | null;
  account_name: string | null;
  document_number: string | null;
  concept: string | null;
  category_snapshot: string | null;
  equipment_name_snapshot: string | null;
  asset_code_snapshot: string | null;
  matched_by: string | null;
  match_confidence: number | string | null;
  total_cost: number | string | null;
  asset?: MaintenanceEquipmentAssetRow | MaintenanceEquipmentAssetRow[] | null;
  cost_center?: MaintenanceCostCenterRow | MaintenanceCostCenterRow[] | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthKey(dateValue?: string | null) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function fetchLedgerRows(context: OrganizationSuccessContext) {
  const pageSize = 1000;
  let start = 0;
  const rows: EquipmentCostLedgerRow[] = [];

  while (true) {
    const end = start + pageSize - 1;
    const { data, error } = await context.supabase
      .from('maintenance_costs')
      .select(`
        id,
        asset_id,
        cost_center_id,
        cost_date,
        source_type,
        source_sheet,
        source_row,
        account_code,
        account_name,
        document_number,
        concept,
        category_snapshot,
        equipment_name_snapshot,
        asset_code_snapshot,
        matched_by,
        match_confidence,
        total_cost,
        asset:maintenance_assets(id, asset_code, asset_name, asset_type, model, manufacturer, criticality, status),
        cost_center:cost_centers(id, code, name, description, status)
      `)
      .eq('organization_id', context.organizationId)
      .eq('source_type', 'equipment_excel')
      .order('cost_date', { ascending: false })
      .range(start, end);

    if (error) throw error;

    const batch = Array.isArray(data) ? (data as unknown as EquipmentCostLedgerRow[]) : [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    start += pageSize;
  }

  return rows;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const ledgerRows = await fetchLedgerRows(context);

    const monthlyTotals = new Map<string, number>();
    const assetTotals = new Map<
      string,
      {
        id: string;
        assetName: string;
        assetCode: string | null;
        category: string;
        totalCost: number;
        rows: number;
        lastDate: string | null;
      }
    >();
    const categoryTotals = new Map<string, { totalCost: number; rows: number }>();

    let matchedRows = 0;
    let matchedCost = 0;
    let unmatchedRows = 0;
    let unmatchedCost = 0;

    for (const row of ledgerRows) {
      const cost = toNumber(row.total_cost);
      const key = monthKey(row.cost_date);
      if (key) monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + cost);

      const asset = Array.isArray(row.asset) ? row.asset[0] || null : row.asset || null;
      const costCenter = Array.isArray(row.cost_center) ? row.cost_center[0] || null : row.cost_center || null;

      if (asset?.id) {
        matchedRows += 1;
        matchedCost += cost;
        const assetKey = asset.id;
        const bucket = assetTotals.get(assetKey) || {
          id: assetKey,
          assetName: asset.asset_name || row.equipment_name_snapshot || 'Sin activo',
          assetCode: asset.asset_code || row.asset_code_snapshot || null,
          category: row.category_snapshot || asset.asset_type || 'Sin categoria',
          totalCost: 0,
          rows: 0,
          lastDate: null,
        };
        bucket.totalCost += cost;
        bucket.rows += 1;
        if (row.cost_date && (!bucket.lastDate || String(row.cost_date) > bucket.lastDate)) {
          bucket.lastDate = String(row.cost_date);
        }
        assetTotals.set(assetKey, bucket);
      } else {
        unmatchedRows += 1;
        unmatchedCost += cost;
      }

      const category = row.category_snapshot || costCenter?.name || 'Sin categoria';
      const categoryBucket = categoryTotals.get(category) || { totalCost: 0, rows: 0 };
      categoryBucket.totalCost += cost;
      categoryBucket.rows += 1;
      categoryTotals.set(category, categoryBucket);
    }

    const assetCosts = Array.from(assetTotals.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 20)
      .map((item) => ({
        ...item,
        totalCost: Number(item.totalCost.toFixed(2)),
      }));

    const categoryCosts = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1].totalCost - a[1].totalCost)
      .slice(0, 12)
      .map(([category, value]) => ({
        category,
        totalCost: Number(value.totalCost.toFixed(2)),
        rows: value.rows,
      }));

    const monthlyCosts = Array.from(monthlyTotals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({ month, value: Number(value.toFixed(2)) }));

    const totalCost = ledgerRows.reduce((sum, row) => sum + toNumber(row.total_cost), 0);

    return NextResponse.json({
      summary: {
        rows: ledgerRows.length,
        totalCost: Number(totalCost.toFixed(2)),
        matchedRows,
        matchedCost: Number(matchedCost.toFixed(2)),
        unmatchedRows,
        unmatchedCost: Number(unmatchedCost.toFixed(2)),
        assets: assetTotals.size,
        averageCostPerAsset: assetTotals.size > 0 ? Number((totalCost / assetTotals.size).toFixed(2)) : 0,
      },
      assetCosts,
      categoryCosts,
      monthlyCosts,
      recentRows: ledgerRows.slice(0, 12).map((row) => ({
        id: row.id,
        costDate: row.cost_date,
        accountName: row.account_name,
        documentNumber: row.document_number,
        equipmentName: row.equipment_name_snapshot,
        category: row.category_snapshot,
        totalCost: row.total_cost,
        assetName: (Array.isArray(row.asset) ? row.asset[0]?.asset_name : row.asset?.asset_name) || null,
        assetCode: (Array.isArray(row.asset) ? row.asset[0]?.asset_code : row.asset?.asset_code) || row.asset_code_snapshot || null,
        costCenterName: (Array.isArray(row.cost_center) ? row.cost_center[0]?.name : row.cost_center?.name) || null,
        matchedBy: row.matched_by,
        matchConfidence: row.match_confidence,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron leer los costos de equipos';
    return NextResponse.json(
      {
        summary: {
          rows: 0,
          totalCost: 0,
          matchedRows: 0,
          matchedCost: 0,
          unmatchedRows: 0,
          unmatchedCost: 0,
          assets: 0,
          averageCostPerAsset: 0,
        },
        assetCosts: [],
        categoryCosts: [],
        monthlyCosts: [],
        error: message,
      },
      { status: 500 },
    );
  }
}
