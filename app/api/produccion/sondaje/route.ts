export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_SONDAJE_PRODUCCION);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const rig = request.nextUrl.searchParams.get('rig')?.trim() || null;

  const [summary, monthly, assets, schedules, plan, planLines, locationQueue] = await Promise.all([
    context.supabase.from('production_drilling_operational_summary_v1').select('*').eq('organization_id', context.organizationId).maybeSingle(),
    context.supabase.from('production_drilling_monthly_metrics').select('month,rig_name_raw,mine_name_raw,shift_code_raw,report_count,drilled_meters,meter_rows,out_of_service_reports,no_crew_reports,power_outage_reports,water_shortage_reports,hole_count,operator_count').eq('organization_id', context.organizationId).order('month', { ascending: false }).limit(120),
    context.supabase.from('maintenance_assets').select('id,asset_code,asset_name,status,lifecycle_state').eq('organization_id', context.organizationId).like('asset_code', 'DRILL-%').order('asset_name'),
    context.supabase.from('preventive_maintenance_schedules').select('id,asset_id,task_name,frequency_hours,last_executed_meter,current_meter_snapshot,next_due_meter,meter_unit,enabled').eq('organization_id', context.organizationId).like('source_reference', 'Mantención Sondajes%').order('next_due_meter'),
    context.supabase.from('production_monthly_plans').select('*').eq('organization_id', context.organizationId).eq('status', 'active').order('period_start', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_monthly_plan_lines').select('*').eq('organization_id', context.organizationId).order('line_type'),
    context.supabase.from('production_drill_hole_location_review_queue_v2').select('drill_hole_id,hole_code,resolution_state,report_count,last_report_date,source_site,candidate_mine_name,review_lane,review_priority,recommended_action').eq('organization_id', context.organizationId).order('review_priority', { ascending: false }).order('last_report_date', { ascending: false }).limit(300),
  ]);

  const error = summary.error || monthly.error || assets.error || schedules.error || plan.error || planLines.error || locationQueue.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let reports: Array<Record<string, unknown>> = [];
  if (rig) {
    const reportResult = await context.supabase.from('production_drilling_source_reports').select('id,operation_date,hole_code_raw,rig_name_raw,mine_raw,sector_raw,shift_code_raw,operator_name_raw,meter_initial,meter_final,drilled_meters,equipment_status_raw,machine_observations,drilling_observations').eq('organization_id', context.organizationId).eq('rig_name_raw', rig).order('operation_date', { ascending: false }).order('source_row', { ascending: false }).limit(80);
    if (reportResult.error) return NextResponse.json({ error: reportResult.error.message }, { status: 500 });
    reports = reportResult.data || [];
  }

  const activePlan = plan.data || null;
  const activePlanLines = activePlan ? (planLines.data || []).filter((line) => line.plan_id === activePlan.id) : [];
  const scheduleRows = schedules.data || [];
  const overdueSchedules = scheduleRows.filter((row) => row.current_meter_snapshot !== null && row.next_due_meter !== null && Number(row.current_meter_snapshot) >= Number(row.next_due_meter)).length;
  const locationRows = locationQueue.data || [];
  const locationSummary = {
    total: locationRows.length,
    mineKnownMissingSector: locationRows.filter((row) => row.review_lane === 'mina_conocida_falta_sector').length,
    insufficientLocation: locationRows.filter((row) => row.review_lane === 'sin_ubicacion_suficiente').length,
    recentHighPriority: locationRows.filter((row) => Number(row.review_priority) >= 90).length,
  };

  return NextResponse.json({
    summary: summary.data || null,
    monthly: monthly.data || [],
    maintenance: { assets: assets.data || [], schedules: scheduleRows, overdueSchedules },
    plan: activePlan,
    planLines: activePlanLines,
    locationReview: { summary: locationSummary, rows: locationRows.slice(0, 60) },
    selectedRig: rig,
    reports,
    lineage: {
      drillingSource: 'Reporte_Sondajes_I_A.xlsx / BaseDatos',
      maintenanceSource: 'Mantención Sondajes - copia.xlsx',
      planSource: 'PROGRAMA DE PRODUCCION AGOSTO 2026.pdf',
      note: 'ACTUAL y PLAN se mantienen separados. La ubicación de pozos sólo se promueve con evidencia verificable; los casos ambiguos permanecen en revisión.',
    },
  });
}
