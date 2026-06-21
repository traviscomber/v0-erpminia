export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { asset_id, alert_type, sensor_data } = await request.json();

    if (!asset_id || !sensor_data) {
      return NextResponse.json({ error: 'asset_id y sensor_data son requeridos' }, { status: 400 });
    }

    const { data: asset } = await context.supabase
      .from('maintenance_assets')
      .select('id, asset_name, asset_code')
      .eq('id', asset_id)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    if (!asset) {
      return NextResponse.json({ error: 'Activo no encontrado' }, { status: 404 });
    }

    const { data: alert, error: alertError } = await context.supabase
      .from('hse_alerts')
      .insert([
        {
          organization_id: context.organizationId,
          asset_id,
          alert_type: alert_type || 'telemetria_sensor',
          severity: sensor_data.temperature > 75 ? 'high' : 'medium',
          description: `${alert_type || 'telemetria_sensor'}: temp=${sensor_data.temperature ?? 'sin dato'} C`,
          created_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (alertError) {
      throw alertError;
    }

    const { count } = await context.supabase
      .from('maintenance_work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId);

    const workOrderNumber = `WO-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data: workOrder, error: workOrderError } = await context.supabase
      .from('maintenance_work_orders')
      .insert([
        {
          organization_id: context.organizationId,
          work_order_number: workOrderNumber,
          asset_id,
          title: `Alerta de telemetria: ${alert_type || 'sensor'}`,
          work_type: 'predictive',
          priority: 'high',
          status: 'open',
          created_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (workOrderError) {
      throw workOrderError;
    }

    return NextResponse.json({
      workflow_complete: true,
      alert_id: alert.id,
      work_order_number: workOrder.work_order_number,
      asset_name: asset.asset_name,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
