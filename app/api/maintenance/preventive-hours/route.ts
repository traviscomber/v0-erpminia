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
      context.supabase
        .from('preventive_maintenance_hour_summary_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .maybeSingle(),
      context.supabase
        .from('preventive_maintenance_hour_status_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .order('alert_due', { ascending: false })
        .order('remaining_hours', { ascending: true, nullsFirst: false })
        .order('asset_code', { ascending: true })
        .order('task_name', { ascending: true }),
    ]);

    const error = summaryResult.error || tasksResult.error;
    if (error) throw error;

    return NextResponse.json({
      summary: summaryResult.data || {
        configured_tasks: 0,
        configured_assets: 0,
        overdue_tasks: 0,
        pending_tasks: 0,
        missing_meter_tasks: 0,
        meter_review_tasks: 0,
        tasks_using_runtime_reading: 0,
      },
      tasks: tasksResult.data || [],
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
