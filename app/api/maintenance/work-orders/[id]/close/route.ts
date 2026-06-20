export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { actual_duration_hours, root_cause } = body;

    // Obtener la orden de trabajo para calcular la detención
    const { data: workOrder, error: woError } = await context.supabase
      .from('maintenance_work_orders')
      .select('*, asset:maintenance_assets(id, asset_name)')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .single();

    if (woError || !workOrder) {
      return NextResponse.json({ error: 'No se encontró la orden de trabajo' }, { status: 404 });
    }

    // Calcular detención en horas (desde start_date hasta cierre)
    let downtime = 0;
    if (workOrder.start_date) {
      const startTime = new Date(workOrder.start_date);
      const endTime = new Date();
      downtime = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    }

    // Actualizar orden de trabajo
    const { data: updatedOT, error: updateError } = await context.supabase
      .from('maintenance_work_orders')
      .update({
        status: 'closed',
        completion_date: new Date().toISOString(),
        actual_duration_hours: actual_duration_hours || downtime,
        root_cause: root_cause,
        down_time_hours: downtime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Actualizar disponibilidad del equipo
    const today = new Date().toISOString().split('T')[0];
    const availabilityPercent = Math.max(0, 100 - (downtime / 24) * 100);

    const { error: availError } = await context.supabase
      .from('equipment_availability')
      .upsert({
        equipment_id: workOrder.asset_id,
        date: today,
        availability_percentage: availabilityPercent,
        downtime_minutes: Math.round(downtime * 60),
        total_minutes: 24 * 60,
      }, { onConflict: 'equipment_id,date' });

    if (availError) console.error('[v0] Availability update error:', availError);

    return NextResponse.json({
      data: updatedOT,
      mttr: actual_duration_hours || downtime,
      downtime_hours: downtime,
      availability_percentage: availabilityPercent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cerrar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
