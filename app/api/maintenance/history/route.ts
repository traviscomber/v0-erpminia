export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function toDateOnly(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

type AssetRow = {
  id: string;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  location: string | null;
  criticality: string | null;
};

type HistoryRow = {
  id: string;
  work_order_id: string | null;
  asset_id: string | null;
  maintenance_type: string | null;
  performed_by_name: string | null;
  start_time: string | null;
  end_time: string | null;
  parts_replaced: string | null;
  parts_cost: number | string | null;
  labor_hours: number | string | null;
  labor_cost: number | string | null;
  notes: string | null;
  created_at: string | null;
  work_order?: Array<{
    work_order_number: string | null;
    title: string | null;
    status: string | null;
    priority: string | null;
    scheduled_date: string | null;
  }> | null;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = new URL(request.url).searchParams;
    const assetId = searchParams.get('assetId');
    const pageSize = 1000;

    let assetQuery = context.supabase
      .from('maintenance_assets')
      .select('id, asset_code, asset_name, asset_type, location, status, criticality')
      .eq('organization_id', context.organizationId)
      .order('asset_name', { ascending: true });

    if (assetId) {
      assetQuery = assetQuery.eq('id', assetId);
    }

    const { data: assets, error: assetsError } = await assetQuery;
    if (assetsError) throw assetsError;

    const assetRows = (Array.isArray(assets) ? (assets as AssetRow[]) : []);
    const assetIds = assetRows.map((asset) => asset.id);
    if (assetIds.length === 0) {
      return NextResponse.json({ entries: [], assets: [], summary: { total: 0, assets: 0 } });
    }

    const historyRows: HistoryRow[] = [];
    let start = 0;

    while (true) {
      const end = start + pageSize - 1;
      const { data: batch, error: historyError } = await context.supabase
        .from('maintenance_history')
        .select(`
          id,
          work_order_id,
          asset_id,
          maintenance_type,
          performed_by_name,
          start_time,
          end_time,
          parts_replaced,
          parts_cost,
          labor_hours,
          labor_cost,
          notes,
          created_at,
          work_order:maintenance_work_orders(
            work_order_number,
            title,
            status,
            priority,
            scheduled_date
          )
        `)
        .in('asset_id', assetIds)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (historyError) throw historyError;

      const batchRows = Array.isArray(batch) ? (batch as HistoryRow[]) : [];
      historyRows.push(...batchRows);
      if (batchRows.length < pageSize) break;
      start += pageSize;
    }

    const assetById = new Map(assetRows.map((asset) => [asset.id, asset]));
    const entries = historyRows.map((row) => {
      const asset = row.asset_id ? assetById.get(row.asset_id) : null;
      const workOrder = Array.isArray(row.work_order) ? row.work_order[0] : null;
      return {
        id: row.id,
        workOrderId: row.work_order_id,
        assetId: row.asset_id,
        assetName: asset?.asset_name || 'Sin activo',
        assetCode: asset?.asset_code || null,
        assetType: asset?.asset_type || null,
        location: asset?.location || null,
        criticality: asset?.criticality || null,
        maintenanceType: row.maintenance_type || null,
        performedByName: row.performed_by_name || null,
        startTime: row.start_time ? new Date(row.start_time).toISOString() : null,
        endTime: row.end_time ? new Date(row.end_time).toISOString() : null,
        partsReplaced: row.parts_replaced || null,
        partsCost: Number(row.parts_cost || 0),
        laborHours: Number(row.labor_hours || 0),
        laborCost: Number(row.labor_cost || 0),
        notes: row.notes || null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        createdDate: toDateOnly(row.created_at),
        workOrder: workOrder
          ? {
              workOrderNumber: workOrder.work_order_number || null,
              title: workOrder.title || null,
              status: workOrder.status || null,
              priority: workOrder.priority || null,
              scheduledDate: toDateOnly(workOrder.scheduled_date),
            }
          : null,
      };
    });

    return NextResponse.json({
      entries,
      assets: assetRows,
      summary: {
        total: entries.length,
        assets: assetRows.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la bitacora';
    return NextResponse.json({ entries: [], assets: [], summary: { total: 0, assets: 0 }, error: message }, { status: 500 });
  }
}
