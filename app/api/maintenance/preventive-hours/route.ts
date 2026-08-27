export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [summaryResult, tasksResult] = await Promise.all([
      context.supabase.from('preventive_maintenance_hour_summary_v1').select('*').eq('organization_id', context.organizationId).maybeSingle(),
      context.supabase.from('preventive_maintenance_hour_status_v1').select('*').eq('organization_id', context.organizationId).order('alert_due', { ascending: false }).order('remaining_hours', { ascending: true, nullsFirst: false }).order('asset_code', { ascending: true }).order('task_name', { ascending: true }),
    ]);
    const error = summaryResult.error || tasksResult.error;
    if (error) throw error;
    return NextResponse.json({
      summary: summaryResult.data || { configured_tasks: 0, configured_assets: 0, overdue_tasks: 0, pending_tasks: 0, missing_meter_tasks: 0, meter_review_tasks: 0, tasks_using_runtime_reading: 0 },
      tasks: tasksResult.data || [],
      canEdit: access.canWrite,
      rules: {
        source: 'Pautas configuradas en preventive_maintenance_schedules.',
        alert: 'Sólo se alerta cuando el horómetro efectivo alcanza o supera el vencimiento configurado.',
        conflict: 'Si una lectura nueva queda bajo el snapshot importado, la pauta pasa a revisión y no genera alerta automática.',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el preventivo por horas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  try {
    const body = await request.json();
    const scheduleId = String(body?.scheduleId || '').trim();
    if (!scheduleId) return NextResponse.json({ error: 'Pauta requerida' }, { status: 400 });
    const { data: schedule, error: scheduleError } = await context.supabase
      .from('preventive_maintenance_hour_status_v1')
      .select('schedule_id,hour_status,generated_work_order_id')
      .eq('organization_id', context.organizationId)
      .eq('schedule_id', scheduleId)
      .maybeSingle();
    if (scheduleError) throw scheduleError;
    if (!schedule) return NextResponse.json({ error: 'Pauta no pertenece a la organización' }, { status: 404 });
    if (schedule.generated_work_order_id) return NextResponse.json({ workOrderId: schedule.generated_work_order_id, existing: true });
    if (schedule.hour_status !== 'overdue') return NextResponse.json({ error: 'La pauta no está vencida' }, { status: 409 });
    const { data, error } = await context.supabase.rpc('plan_due_hour_preventive_work_order_v1', { p_schedule_id: scheduleId });
    if (error) throw error;
    return NextResponse.json({ workOrderId: data, existing: false }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo generar la OT preventiva' }, { status: 500 });
  }
}
