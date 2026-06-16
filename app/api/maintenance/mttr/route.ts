export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function getHours(row: any) {
  if (row.actual_duration_hours !== null && row.actual_duration_hours !== undefined) {
    const value = Number(row.actual_duration_hours);
    return Number.isFinite(value) ? value : null;
  }

  const start = new Date(row.created_at || row.createdAt || row.start_time || 0).getTime();
  const end = new Date(row.completion_date || row.completed_at || row.closed_at || 0).getTime();
  if (!start || !end || Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return (end - start) / (1000 * 60 * 60);
}

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [workOrdersResult, assetsResult] = await Promise.all([
      context.supabase
        .from('maintenance_work_orders')
        .select('status, actual_duration_hours, created_at, completion_date, completed_at, closed_at')
        .eq('organization_id', context.organizationId)
        .in('status', ['closed', 'completed', 'done', 'finalizado', 'cerrado', 'resuelto'])
        .gte('completion_date', since.toISOString()),
      context.supabase
        .from('maintenance_assets')
        .select('id, status')
        .eq('organization_id', context.organizationId),
    ]);

    const workOrders = workOrdersResult.data || [];
    const assets = assetsResult.data || [];
    const durations = workOrders.map(getHours).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const averageMTTR = durations.length > 0 ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
    const totalDowntime30d = durations.reduce((sum, value) => sum + value, 0);
    const availableAssets = assets.filter((asset: any) => String(asset.status || '').toLowerCase() === 'operational').length;
    const totalAssets = Math.max(assets.length, 1);
    const availability = (availableAssets / totalAssets) * 100;

    return NextResponse.json({
      averageMTTR: Number(averageMTTR.toFixed(1)),
      totalDowntime30d: Number(totalDowntime30d.toFixed(1)),
      availability: Number(availability.toFixed(1)),
      completedWorkOrders: workOrders.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
