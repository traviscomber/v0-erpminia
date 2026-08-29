export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type MaintenanceWorkOrderRow = {
  id: string;
  asset_id: string | null;
  canonical_asset_id: string | null;
  start_date: string | null;
};

type CloseWorkOrderPayload = {
  actual_duration_hours?: number | string | null;
  root_cause?: string | null;
  preventive_actions?: string | null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { id } = await params;

  try {
    const body = (await request.json()) as CloseWorkOrderPayload;
    const { actual_duration_hours, root_cause, preventive_actions } = body;

    const { data: workOrder, error: woError } = await context.supabase
      .from('maintenance_work_orders')
      .select('*')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .single();

    const typedWorkOrder = workOrder as MaintenanceWorkOrderRow | null;

    if (woError || !typedWorkOrder) {
      return NextResponse.json({ error: 'No se encontró la orden de trabajo' }, { status: 404 });
    }

    let downtime = 0;
    if (typedWorkOrder.start_date) {
      const startTime = new Date(typedWorkOrder.start_date);
      const endTime = new Date();
      downtime = Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
    }

    const normalizedHours = Number(actual_duration_hours);
    const effectiveHours = Number.isFinite(normalizedHours) && normalizedHours > 0 ? normalizedHours : downtime;
    const closureData: Record<string, unknown> = {
      actual_duration_hours: effectiveHours,
      down_time_hours: downtime,
      updated_at: new Date().toISOString(),
    };
    if (root_cause !== undefined) closureData.root_cause = root_cause;
    if (preventive_actions !== undefined) closureData.preventive_actions = preventive_actions;

    const { error: detailError } = await context.supabase
      .from('maintenance_work_orders')
      .update(closureData)
      .eq('id', id)
      .eq('organization_id', context.organizationId);

    if (detailError) throw detailError;

    const { error: closeError } = await context.supabase.rpc('close_work_order_safely', {
      p_work_order_id: id,
    });

    if (closeError) {
      const status = closeError.code === '55000' || closeError.code === 'P0001' ? 409 : 500;
      return NextResponse.json({ error: closeError.message || 'No se pudo cerrar la orden de trabajo' }, { status });
    }

    const { data: updatedOT, error: reloadError } = await context.supabase
      .from('maintenance_work_orders')
      .select('*')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .single();

    if (reloadError) throw reloadError;

    const availabilityEquipmentId = typedWorkOrder.canonical_asset_id || typedWorkOrder.asset_id;
    if (availabilityEquipmentId) {
      const today = new Date().toISOString().split('T')[0];
      const availabilityPercent = Math.max(0, 100 - (downtime / 24) * 100);
      const { error: availError } = await context.supabase
        .from('equipment_availability')
        .upsert({
          equipment_id: availabilityEquipmentId,
          date: today,
          availability_percentage: availabilityPercent,
          downtime_minutes: Math.round(downtime * 60),
          total_minutes: 24 * 60,
        }, { onConflict: 'equipment_id,date' });

      if (availError) console.error('[maintenance] Availability update error:', availError);
    }

    const availabilityPercentage = Math.max(0, 100 - (downtime / 24) * 100);
    return NextResponse.json({
      data: updatedOT,
      mttr: effectiveHours,
      downtime_hours: downtime,
      availability_percentage: availabilityPercentage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cerrar la orden de trabajo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
