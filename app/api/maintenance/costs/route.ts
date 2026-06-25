export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

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

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const since30d = new Date();
    since30d.setDate(since30d.getDate() - 30);
    const since12m = new Date();
    since12m.setMonth(since12m.getMonth() - 12);

    const [workOrdersResult, historyResult, assetsResult] = await Promise.all([
      context.supabase
        .from('maintenance_work_orders')
        .select(`
          id,
          asset_id,
          title,
          status,
          priority,
          work_type,
          actual_cost,
          planned_duration_hours,
          actual_duration_hours,
          completion_date,
          created_at,
          asset:maintenance_assets(id, asset_code, asset_name, criticality)
        `)
        .eq('organization_id', context.organizationId)
        .order('completion_date', { ascending: false }),
      context.supabase
        .from('maintenance_history')
        .select(`
          id,
          asset_id,
          parts_cost,
          labor_cost,
          labor_hours,
          created_at,
          work_order_id,
          work_order:maintenance_work_orders(id, work_order_number, title, status, completion_date)
        `)
        .order('created_at', { ascending: false }),
      context.supabase
        .from('maintenance_assets')
        .select('id, asset_code, asset_name, criticality, status')
        .eq('organization_id', context.organizationId),
    ]);

    const workOrders = workOrdersResult.data || [];
    const history = historyResult.data || [];
    const assets = assetsResult.data || [];

    const assetMap = new Map(
      assets.map((asset: any) => [
        asset.id,
        {
          id: asset.id,
          assetCode: asset.asset_code || null,
          assetName: asset.asset_name || 'Sin activo',
          criticality: asset.criticality || null,
          status: asset.status || null,
          totalCost: 0,
          workOrderCost: 0,
          partsCost: 0,
          laborCost: 0,
          workOrders: 0,
          records: 0,
          lastDate: null as string | null,
        },
      ]),
    );

    const monthlyTotals = new Map<string, number>();

    for (const order of workOrders as any[]) {
      const assetId = order.asset_id || order.asset?.id || null;
      if (!assetId) continue;
      const bucket = assetMap.get(assetId) || {
        id: assetId,
        assetCode: order.asset?.asset_code || null,
        assetName: order.asset?.asset_name || 'Sin activo',
        criticality: order.asset?.criticality || null,
        status: null,
        totalCost: 0,
        workOrderCost: 0,
        partsCost: 0,
        laborCost: 0,
        workOrders: 0,
        records: 0,
        lastDate: null,
      };
      const orderCost = toNumber(order.actual_cost);
      bucket.workOrderCost += orderCost;
      bucket.totalCost += orderCost;
      bucket.workOrders += 1;
      if (order.completion_date && (!bucket.lastDate || String(order.completion_date) > bucket.lastDate)) {
        bucket.lastDate = String(order.completion_date);
      }
      assetMap.set(assetId, bucket);

      const key = monthKey(order.completion_date);
      if (key) monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + orderCost);
    }

    for (const record of history as any[]) {
      const assetId = record.asset_id || null;
      if (!assetId) continue;
      const bucket = assetMap.get(assetId) || {
        id: assetId,
        assetCode: null,
        assetName: 'Sin activo',
        criticality: null,
        status: null,
        totalCost: 0,
        workOrderCost: 0,
        partsCost: 0,
        laborCost: 0,
        workOrders: 0,
        records: 0,
        lastDate: null,
      };
      const partsCost = toNumber(record.parts_cost);
      const laborCost = toNumber(record.labor_cost);
      const recordCost = partsCost + laborCost;
      bucket.partsCost += partsCost;
      bucket.laborCost += laborCost;
      bucket.totalCost += recordCost;
      bucket.records += 1;
      if (record.created_at && (!bucket.lastDate || String(record.created_at) > bucket.lastDate)) {
        bucket.lastDate = String(record.created_at);
      }
      assetMap.set(assetId, bucket);

      const key = monthKey(record.created_at);
      if (key) monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + recordCost);
    }

    const assetCosts = Array.from(assetMap.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .map((item) => ({
        ...item,
        totalCost: Number(item.totalCost.toFixed(2)),
        workOrderCost: Number(item.workOrderCost.toFixed(2)),
        partsCost: Number(item.partsCost.toFixed(2)),
        laborCost: Number(item.laborCost.toFixed(2)),
      }));

    const totalCost = assetCosts.reduce((sum, item) => sum + item.totalCost, 0);
    const totalWorkOrders = workOrders.length;
    const totalRecords = history.length;
    const recentMonths = Array.from(monthlyTotals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({ month, value: Number(value.toFixed(2)) }));

    return NextResponse.json({
      summary: {
        totalCost: Number(totalCost.toFixed(2)),
        totalWorkOrders,
        totalRecords,
        assets: assetCosts.length,
        averageCostPerAsset: assetCosts.length > 0 ? Number((totalCost / assetCosts.length).toFixed(2)) : 0,
      },
      assetCosts: assetCosts.slice(0, 20),
      monthlyCosts: recentMonths,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo calcular el costo por equipo';
    return NextResponse.json(
      { summary: { totalCost: 0, totalWorkOrders: 0, totalRecords: 0, assets: 0, averageCostPerAsset: 0 }, assetCosts: [], monthlyCosts: [], error: message },
      { status: 500 },
    );
  }
}
