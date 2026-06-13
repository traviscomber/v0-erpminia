import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { asset_id, alert_type, sensor_data } = await request.json();
    const { data: asset } = await context.supabase.from('maintenance_assets').select('id, asset_name, asset_code').eq('id', asset_id).eq('organization_id', context.organizationId).single();
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    const { data: alert } = await context.supabase.from('hse_alerts').insert([{organization_id: context.organizationId, asset_id, alert_type, severity: sensor_data.temperature > 75 ? 'high' : 'medium', description: `${alert_type}: Temp=${sensor_data.temperature}°C`, created_at: new Date().toISOString()}]).select('*').single();

    const po_number = `WO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const { data: workOrder } = await context.supabase.from('maintenance_work_orders').insert([{organization_id: context.organizationId, work_order_number: po_number, asset_id, title: `Alert: ${alert_type}`, work_type: 'predictive', priority: 'high', status: 'open', created_at: new Date().toISOString()}]).select('*').single();

    return NextResponse.json({ workflow_complete: true, alert_id: alert.id, work_order_number: workOrder.work_order_number });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
