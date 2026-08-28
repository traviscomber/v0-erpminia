export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireModuleAccess(request, MODULE_KEYS.MANT_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;

  try {
    const { data: asset, error: assetError } = await context.supabase
      .from('maintenance_canonical_assets_v1')
      .select('id,asset_code,name,asset_type,category,manufacturer,model,serial_number,license_plate,cost_center_code,is_active,validation_status')
      .eq('organization_id', context.organizationId)
      .eq('id', id)
      .maybeSingle();
    if (assetError) throw assetError;
    if (!asset) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

    const [ordersResult, closeResult, preventiveResult, runtimeResult, reliabilityResult, runtimeReliabilityResult] = await Promise.all([
      context.supabase
        .from('maintenance_operational_work_order_flow_v1')
        .select('work_order_id,work_order_number,status,priority,work_type,scheduled_date,assigned_person_name,flow_status,open_purchase_order_count,quantity_requested,quantity_issued,quantity_installed,total_cost')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .neq('status', 'completed')
        .order('scheduled_date', { ascending: true, nullsFirst: false }),
      context.supabase
        .from('work_order_close_readiness_v2')
        .select('work_order_id,work_order_number,next_action,ready_to_close,open_procurement_orders,pending_parts,unmet_material_requirements,pending_external_services,open_labor_entries,standard_plan_steps_pending,missing_runtime_evidence')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id),
      context.supabase
        .from('preventive_maintenance_hour_status_v1')
        .select('schedule_id,task_name,priority,frequency_hours,due_meter,effective_current_meter,meter_evidence_source,hour_status,remaining_hours,alert_due,generated_work_order_id')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .eq('enabled', true),
      context.supabase
        .from('asset_runtime_summary_v1')
        .select('reading_count,last_reading_at,latest_meter_hours,observed_operating_hours,reset_count,usable_for_rate_metrics')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
      context.supabase
        .from('maintenance_reliability_by_asset_v1')
        .select('audited_closures,recurring_cause_count,max_same_cause_occurrences,audited_total_cost,audited_avg_cost,total_actual_hours,total_downtime_hours,avg_days_between_audited_interventions,has_recurring_root_cause,last_audited_closure_at')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
      context.supabase
        .from('maintenance_runtime_reliability_by_asset_v1')
        .select('audited_corrective_events,corrective_events_with_meter,valid_mtbf_intervals,mtbf_operating_hours,mttr_hours,audited_corrective_cost,audited_downtime_hours,meter_event_coverage_percent,last_corrective_close_at')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .maybeSingle(),
    ]);

    const error = ordersResult.error || closeResult.error || preventiveResult.error || runtimeResult.error || reliabilityResult.error || runtimeReliabilityResult.error;
    if (error) throw error;

    const closeRows = closeResult.data || [];
    const preventives = [...(preventiveResult.data || [])].sort((a: any, b: any) => {
      if (Boolean(a.alert_due) !== Boolean(b.alert_due)) return a.alert_due ? -1 : 1;
      const ar = a.remaining_hours == null ? Number.POSITIVE_INFINITY : Number(a.remaining_hours);
      const br = b.remaining_hours == null ? Number.POSITIVE_INFINITY : Number(b.remaining_hours);
      return ar - br;
    });

    const summary = {
      activeWorkOrders: (ordersResult.data || []).length,
      criticalOpen: (ordersResult.data || []).filter((row: any) => String(row.priority || '').toLowerCase() === 'critical').length,
      operationalBlockers: closeRows.filter((row: any) => Number(row.open_procurement_orders || 0) > 0 || Number(row.pending_parts || 0) > 0 || Number(row.unmet_material_requirements || 0) > 0 || Number(row.pending_external_services || 0) > 0 || Number(row.open_labor_entries || 0) > 0).length,
      readyToClose: closeRows.filter((row: any) => Boolean(row.ready_to_close)).length,
      pendingPlanSteps: closeRows.reduce((sum: number, row: any) => sum + Number(row.standard_plan_steps_pending || 0), 0),
      overduePreventives: preventives.filter((row: any) => Boolean(row.alert_due)).length,
    };

    return NextResponse.json({
      asset,
      summary,
      workOrders: ordersResult.data || [],
      closeReadiness: closeRows,
      preventives,
      nextPreventive: preventives[0] || null,
      runtime: runtimeResult.data || null,
      reliability: reliabilityResult.data || null,
      runtimeReliability: runtimeReliabilityResult.data || null,
      canEdit: access.canWrite,
      evidence: {
        mtbf: 'Sólo desde intervalos correctivos auditados con horómetro válido.',
        mttr: 'Sólo desde horas reales de correctivos auditados.',
        cost: 'Sólo desde snapshots auditados de cierre.',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la Ficha 360 operacional' }, { status: 500 });
  }
}
