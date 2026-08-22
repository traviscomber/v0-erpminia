export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [
    batches,
    movements,
    plantShifts,
    metallurgy,
    metallurgyAssayed,
    metallurgyPartial,
    metallurgyNoAssay,
    shipments,
    shipmentTonnage,
    allocations,
    allocationTonnage,
    reconciliation,
    latestMovement,
    latestPlant,
    latestShipment,
    drilling,
  ] = await Promise.all([
    context.supabase.from('production_import_batches').select('id, source_type, source_file, period_start, period_end, status, normalization_rule_version, created_at').eq('organization_id', context.organizationId).order('period_start', { ascending: false }),
    context.supabase.from('production_material_movements').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_plant_shifts').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('metallurgy_state', 'assayed'),
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('metallurgy_state', 'partial'),
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('metallurgy_state', 'no_assay'),
    context.supabase.from('production_concentrate_shipments').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_concentrate_shipments').select('normalized_metric_tons').eq('organization_id', context.organizationId),
    context.supabase.from('production_concentrate_shipment_allocations').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_concentrate_shipment_allocations').select('allocated_wet_metric_tons').eq('organization_id', context.organizationId),
    context.supabase.from('production_entity_reconciliation').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).in('status', ['pending', 'needs_review']),
    context.supabase.from('production_material_movements').select('movement_date').eq('organization_id', context.organizationId).order('movement_date', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_plant_shifts').select('operation_date').eq('organization_id', context.organizationId).order('operation_date', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_concentrate_shipments').select('shipment_date').eq('organization_id', context.organizationId).order('shipment_date', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_drilling_operational_summary_v1').select('*').eq('organization_id', context.organizationId).maybeSingle(),
  ]);

  const errors = [batches.error,movements.error,plantShifts.error,metallurgy.error,metallurgyAssayed.error,metallurgyPartial.error,metallurgyNoAssay.error,shipments.error,shipmentTonnage.error,allocations.error,allocationTonnage.error,reconciliation.error,latestMovement.error,latestPlant.error,latestShipment.error,drilling.error].filter(Boolean);
  if (errors.length) return NextResponse.json({ error: errors[0]?.message || 'No fue posible leer Producción canónica' }, { status: 500 });

  const dataThrough = latestPlant.data?.operation_date || latestMovement.data?.movement_date || null;
  let currentPeriod = null;

  if (dataThrough) {
    const throughDate = new Date(`${dataThrough}T12:00:00Z`);
    const periodStart = `${throughDate.getUTCFullYear()}-${String(throughDate.getUTCMonth() + 1).padStart(2, '0')}-01`;

    const [periodMovements, periodMetallurgy, activePlan] = await Promise.all([
      context.supabase
        .from('production_material_movements')
        .select('normalized_metric_tons')
        .eq('organization_id', context.organizationId)
        .gte('movement_date', periodStart)
        .lte('movement_date', dataThrough),
      context.supabase
        .from('production_metallurgy_deterministic_v2')
        .select('treated_metric_tons,head_grade,recovery_reported,recovery_by_grades_pct,fine_metal_reported')
        .eq('organization_id', context.organizationId)
        .gte('operation_date', periodStart)
        .lte('operation_date', dataThrough),
      context.supabase
        .from('production_monthly_plans')
        .select('id,plan_code,period_start,period_end,total_mineral_to_plant_tons,target_cu_grade_pct,planned_drilling_m,planned_advance_m,status')
        .eq('organization_id', context.organizationId)
        .eq('status', 'active')
        .lte('period_start', dataThrough)
        .gte('period_end', periodStart)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const periodError = periodMovements.error || periodMetallurgy.error || activePlan.error;
    if (periodError) return NextResponse.json({ error: periodError.message }, { status: 500 });

    const movementRows = periodMovements.data || [];
    const metallurgyRows = periodMetallurgy.data || [];
    const movementTons = movementRows.reduce((sum, row) => sum + Number(row.normalized_metric_tons || 0), 0);
    const treatedTons = metallurgyRows.reduce((sum, row) => sum + Number(row.treated_metric_tons || 0), 0);
    const gradeRows = metallurgyRows.map((row) => Number(row.head_grade)).filter((value) => Number.isFinite(value));
    const recoveryRows = metallurgyRows
      .map((row) => Number(row.recovery_reported ?? row.recovery_by_grades_pct))
      .filter((value) => Number.isFinite(value));
    const fineMetalTons = metallurgyRows.reduce((sum, row) => sum + Number(row.fine_metal_reported || 0), 0);
    const plan = activePlan.data || null;
    const planMineralTons = Number(plan?.total_mineral_to_plant_tons || 0);

    currentPeriod = {
      periodStart,
      dataThrough,
      movementRows: movementRows.length,
      movementTons,
      plantShifts: metallurgyRows.length,
      treatedTons,
      avgHeadGradePct: gradeRows.length ? gradeRows.reduce((sum, value) => sum + value, 0) / gradeRows.length : null,
      avgRecoveryPct: recoveryRows.length ? recoveryRows.reduce((sum, value) => sum + value, 0) / recoveryRows.length : null,
      fineMetalTons,
      plan: plan ? {
        code: plan.plan_code,
        periodStart: plan.period_start,
        periodEnd: plan.period_end,
        mineralToPlantTons: planMineralTons,
        targetCuGradePct: Number(plan.target_cu_grade_pct || 0),
        plannedDrillingM: Number(plan.planned_drilling_m || 0),
        plannedAdvanceM: Number(plan.planned_advance_m || 0),
        mineralProgressPct: planMineralTons > 0 ? (movementTons / planMineralTons) * 100 : null,
      } : null,
    };
  }

  const shipmentWetTons = (shipmentTonnage.data || []).reduce((sum, row) => sum + Number(row.normalized_metric_tons || 0), 0);
  const allocatedWetTons = (allocationTonnage.data || []).reduce((sum, row) => sum + Number(row.allocated_wet_metric_tons || 0), 0);
  const shipmentCount = shipments.count || 0;
  const allocationCount = allocations.count || 0;
  const drillingSummary = drilling.data || null;

  return NextResponse.json({
    batches: batches.data || [],
    counts: {
      materialMovements: movements.count || 0,
      plantShifts: plantShifts.count || 0,
      metallurgyResults: metallurgy.count || 0,
      metallurgyAssayed: metallurgyAssayed.count || 0,
      metallurgyPartial: metallurgyPartial.count || 0,
      metallurgyNoAssay: metallurgyNoAssay.count || 0,
      concentrateShipments: shipmentCount,
      concentrateAllocations: allocationCount,
      reconciliationPending: reconciliation.count || 0,
      drillingReports: Number(drillingSummary?.report_rows || 0),
      drillingHoles: Number(drillingSummary?.holes || 0),
    },
    freshness: {
      latestMaterialMovementDate: latestMovement.data?.movement_date || null,
      latestPlantOperationDate: latestPlant.data?.operation_date || null,
      latestShipmentDate: latestShipment.data?.shipment_date || null,
      latestDrillingDate: drillingSummary?.max_date || null,
    },
    currentPeriod,
    drilling: drillingSummary ? {
      meters: Number(drillingSummary.drilled_meters || 0),
      rigs: Number(drillingSummary.rigs || 0),
      operators: Number(drillingSummary.operators || 0),
      outOfServiceReports: Number(drillingSummary.out_of_service_reports || 0),
      meterCapturePct: Number(drillingSummary.meter_capture_pct || 0),
    } : null,
    dispatch: {
      status: shipmentCount > 0 ? 'available' : 'pending_reconciliation',
      wetMetricTons: shipmentWetTons,
      allocatedWetMetricTons: allocatedWetTons,
      allocationCoveragePct: shipmentWetTons > 0 ? (allocatedWetTons / shipmentWetTons) * 100 : 0,
      note: shipmentCount > 0 ? `${shipmentCount.toLocaleString('es-CL')} despachos canónicos con ${allocationCount.toLocaleString('es-CL')} asignaciones de linaje.` : 'La estructura canónica está preparada, pero los despachos históricos aún no han sido conciliados y no se muestran valores simulados.',
    },
    legacy: { produccionKpiIsCanonical: false, note: 'produccion_kpi se mantiene temporalmente como fuente legacy hasta reconstruir los KPI desde movimientos y planta validados.' },
  });
}
