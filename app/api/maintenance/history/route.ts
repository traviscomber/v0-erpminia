export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function toDateOnly(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = new URL(request.url).searchParams;
    const limit = Math.min(Number(searchParams.get('limit') || '120'), 500);
    const assetId = searchParams.get('assetId');

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

    const assetIds = (assets || []).map((asset: any) => asset.id);
    if (assetIds.length === 0) {
      return NextResponse.json({ entries: [], assets: [], summary: { total: 0, assets: 0 } });
    }

    let historyQuery = context.supabase
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
      .limit(limit);

    const { data: history, error: historyError } = await historyQuery;
    if (historyError) throw historyError;

    const entries = (history || []).map((row: any) => ({
      id: row.id,
      workOrderId: row.work_order_id,
      assetId: row.asset_id,
      assetName: (assets || []).find((asset: any) => asset.id === row.asset_id)?.asset_name || 'Sin activo',
      assetCode: (assets || []).find((asset: any) => asset.id === row.asset_id)?.asset_code || null,
      assetType: (assets || []).find((asset: any) => asset.id === row.asset_id)?.asset_type || null,
      location: (assets || []).find((asset: any) => asset.id === row.asset_id)?.location || null,
      criticality: (assets || []).find((asset: any) => asset.id === row.asset_id)?.criticality || null,
      maintenanceType: row.maintenance_type || null,
      performedByName: row.performed_by_name || null,
      startTime: row.start_time ? new Date(row.start_time).toISOString() : null,
      endTime: row.end_time ? new Date(row.end_time).toISOString() : null,
      partsReplaced: row.parts_replaced || null,
      partsCost: row.parts_cost || 0,
      laborHours: row.labor_hours || 0,
      laborCost: row.labor_cost || 0,
      notes: row.notes || null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      createdDate: toDateOnly(row.created_at),
      workOrder: row.work_order
        ? {
            workOrderNumber: row.work_order.work_order_number || null,
            title: row.work_order.title || null,
            status: row.work_order.status || null,
            priority: row.work_order.priority || null,
            scheduledDate: toDateOnly(row.work_order.scheduled_date),
          }
        : null,
    }));

    return NextResponse.json({
      entries,
      assets,
      summary: {
        total: entries.length,
        assets: assets.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la bitacora';
    return NextResponse.json({ entries: [], assets: [], summary: { total: 0, assets: 0 }, error: message }, { status: 500 });
  }
}
