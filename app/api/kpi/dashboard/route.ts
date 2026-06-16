export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: workOrders } = await context.supabase
      .from('maintenance_work_orders')
      .select('status, actual_duration_hours, planned_duration_hours, completion_date')
      .eq('organization_id', context.organizationId)
      .eq('status', 'closed')
      .gte('completion_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: assets } = await context.supabase
      .from('maintenance_assets')
      .select('id, status')
      .eq('organization_id', context.organizationId);

    const closedWorkOrders = workOrders || [];
    const totalWO = closedWorkOrders.length || 0;
    const mttr = totalWO > 0 
      ? (closedWorkOrders.reduce((sum: number, wo: any) => sum + (wo.actual_duration_hours || 0), 0) || 0) / totalWO
      : 0;
    
    const assetRows = assets || [];
    const availableAssets = assetRows.filter(a => a.status === 'operational').length || 0;
    const totalAssets = assetRows.length || 1;
    const availability = ((availableAssets / totalAssets) * 100).toFixed(1);

    return NextResponse.json({
      kpis: {
        work_orders_closed_30d: totalWO,
        mttr_hours: parseFloat(mttr.toFixed(2)),
        equipment_availability_pct: parseFloat(availability as string),
        critical_alerts: 0,
      },
      period: '30_days',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch KPIs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
