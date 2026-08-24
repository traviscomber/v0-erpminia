export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

function weightedAverage<T>(rows: T[], value: (row: T) => unknown, weight: (row: T) => unknown) {
  const valid = rows.filter((row) => {
    const v = value(row);
    const w = Number(weight(row) || 0);
    return v !== null && v !== undefined && Number.isFinite(Number(v)) && w > 0;
  });
  const totalWeight = valid.reduce((sum, row) => sum + Number(weight(row) || 0), 0);
  if (!totalWeight) return null;
  return valid.reduce((sum, row) => sum + Number(value(row)) * Number(weight(row) || 0), 0) / totalWeight;
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const latest = await context.supabase
    .from('production_metallurgy_deterministic_v2')
    .select('operation_date')
    .eq('organization_id', context.organizationId)
    .order('operation_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) return NextResponse.json({ error: latest.error.message }, { status: 500 });
  if (!latest.data?.operation_date) return NextResponse.json({ period: null, daily: [], recent: [], historical: null });

  const through = latest.data.operation_date;
  const date = new Date(`${through}T12:00:00Z`);
  const periodStart = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const [rowsResult, recentResult, historicalResult, fineDailyResult, flowResult, flowQualityResult, planResult] = await Promise.all([
    context.supabase
      .from('production_metallurgy_deterministic_v2')
      .select('plant_shift_id,operation_date,shift_code,treated_metric_tons,mineral_moisture_pct,head_grade,concentrate_grade,tailings_grade,recovery_reported,recovery_by_grades_pct,fine_metal_reported,concentrate_wet_metric_tons,concentrate_moisture_pct,metallurgy_state,source_file,source_row')
      .eq('organization_id', context.organizationId)
      .gte('operation_date', periodStart)
      .lte('operation_date', through)
      .order('operation_date')
      .order('shift_code'),
    context.supabase
      .from('production_metallurgy_deterministic_v2')
      .select('plant_shift_id,operation_date,shift_code,treated_metric_tons,mineral_moisture_pct,head_grade,concentrate_grade,tailings_grade,recovery_reported,recovery_by_grades_pct,metallurgy_state,source_file,source_row')
      .eq('organization_id', context.organizationId)
      .order('operation_date', { ascending: false })
      .order('shift_code', { ascending: false })
      .limit(20),
    context.supabase
      .from('production_metallurgy_deterministic_v2')
      .select('operation_date,treated_metric_tons,head_grade,recovery_reported,recovery_by_grades_pct,metallurgy_state')
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('production_fine_copper_daily_v1')
      .select('operation_date,shifts,deterministic_shifts,treated_wet_metric_tons,mineral_dry_metric_tons,contained_feed_cu_metric_tons,recovered_fine_cu_metric_tons,avg_head_grade_pct,effective_recovery_pct,treated_wet_tons_without_fine,fine_coverage_state')
      .eq('organization_id', context.organizationId)
      .gte('operation_date', periodStart)
      .lte('operation_date', through)
      .order('operation_date'),
    context.supabase
      .from('production_flow_daily_fidelity_v1')
      .select('operation_date,movement_source_cutoff,movement_source_state,movement_rows,transported_t,treated_wet_t,recovered_fine_cu_t,shipment_rows,valid_shipment_rows,review_shipment_rows,dispatched_concentrate_t,flow_source_state')
      .eq('organization_id', context.organizationId)
      .gte('operation_date', periodStart)
      .lte('operation_date', through)
      .order('operation_date'),
    context.supabase
      .from('production_flow_fidelity_quality_v1')
      .select('check_key,expected_value,actual_value,status')
      .eq('organization_id', context.organizationId)
      .order('check_key'),
    context.supabase
      .from('production_copper_plan_v1')
      .select('plan_id,plan_code,period_start,period_end,status,total_mineral_to_plant_tons,target_cu_grade_pct,planned_contained_cu_metric_tons,target_recovery_pct,planned_recovered_fine_cu_metric_tons,contained_cu_plan_state,planned_fine_semantic,source_reference')
      .eq('organization_id', context.organizationId)
      .eq('status', 'active')
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const error = rowsResult.error || recentResult.error || historicalResult.error || fineDailyResult.error || flowResult.error || flowQualityResult.error || planResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = rowsResult.data || [];
  const fineDaily = fineDailyResult.data || [];
  const flowRows = flowResult.data || [];
  const treatedTons = rows.reduce((sum, row) => sum + Number(row.treated_metric_tons || 0), 0);
  const comparableFlowRows = flowRows.filter((row) => row.movement_source_state === 'within_source_window');
  const transportedTons = comparableFlowRows.reduce((sum, row) => sum + Number(row.transported_t || 0), 0);
  const comparableTreatedTons = comparableFlowRows.reduce((sum, row) => sum + Number(row.treated_wet_t || 0), 0);
  const movements = comparableFlowRows.reduce((sum, row) => sum + Number(row.movement_rows || 0), 0);
  const transportTreatmentDeltaTons = transportedTons - comparableTreatedTons;
  const movementSourceCutoff = flowRows.find((row) => row.movement_source_cutoff)?.movement_source_cutoff || null;
  const movementCoverageState = movementSourceCutoff && movementSourceCutoff < through ? 'partial_source_window' : 'complete_source_window';
  const assayed = rows.filter((row) => row.metallurgy_state === 'assayed').length;
  const partial = rows.filter((row) => row.metallurgy_state === 'partial').length;
  const noAssay = rows.filter((row) => row.metallurgy_state === 'no_assay').length;

  const fineByDate = new Map(fineDaily.map((row) => [row.operation_date, row]));
  const flowByDate = new Map(flowRows.map((row) => [row.operation_date, row]));
  const byDate = new Map<string, typeof rows>();
  for (const row of rows) {
    const group = byDate.get(row.operation_date) || [];
    group.push(row);
    byDate.set(row.operation_date, group);
  }
  const daily = Array.from(byDate.entries()).map(([operationDate, dayRows]) => {
    const fine = fineByDate.get(operationDate);
    const flow = flowByDate.get(operationDate);
    const transported = flow?.transported_t == null ? null : Number(flow.transported_t);
    const treated = dayRows.reduce((sum, row) => sum + Number(row.treated_metric_tons || 0), 0);
    return {
      operationDate,
      shifts: dayRows.length,
      movements: flow?.movement_rows == null ? null : Number(flow.movement_rows),
      movementSourceState: flow?.movement_source_state || 'unknown',
      movementSourceCutoff: flow?.movement_source_cutoff || null,
      transportedTons: transported,
      treatedTons: treated,
      transportTreatmentDeltaTons: transported == null ? null : transported - treated,
      flowState: flow?.flow_source_state || 'unknown',
      headGradePct: fine?.avg_head_grade_pct == null ? weightedAverage(dayRows, (row) => row.head_grade, (row) => row.treated_metric_tons) : Number(fine.avg_head_grade_pct),
      concentrateGradePct: weightedAverage(dayRows, (row) => row.concentrate_grade, (row) => row.treated_metric_tons),
      tailingsGradePct: weightedAverage(dayRows, (row) => row.tailings_grade, (row) => row.treated_metric_tons),
      recoveryPct: fine?.effective_recovery_pct == null ? weightedAverage(dayRows, (row) => row.recovery_reported ?? row.recovery_by_grades_pct, (row) => row.treated_metric_tons) : Number(fine.effective_recovery_pct),
      containedCuTons: fine?.contained_feed_cu_metric_tons == null ? null : Number(fine.contained_feed_cu_metric_tons),
      fineCuTons: fine?.recovered_fine_cu_metric_tons == null ? null : Number(fine.recovered_fine_cu_metric_tons),
      fineCoverageState: fine?.fine_coverage_state || 'no_assay',
      shipmentRows: Number(flow?.shipment_rows || 0),
      validShipmentRows: Number(flow?.valid_shipment_rows || 0),
      reviewShipmentRows: Number(flow?.review_shipment_rows || 0),
      dispatchedConcentrateTons: flow?.dispatched_concentrate_t == null ? null : Number(flow.dispatched_concentrate_t),
      assayed: dayRows.filter((row) => row.metallurgy_state === 'assayed').length,
      noAssay: dayRows.filter((row) => row.metallurgy_state === 'no_assay').length,
    };
  });

  const historicalRows = historicalResult.data || [];
  const minDate = historicalRows.reduce<string | null>((min, row) => !min || row.operation_date < min ? row.operation_date : min, null);
  const recoveredFineCuTons = fineDaily.reduce((sum, row) => sum + Number(row.recovered_fine_cu_metric_tons || 0), 0);
  const containedFeedCuTons = fineDaily.reduce((sum, row) => sum + Number(row.contained_feed_cu_metric_tons || 0), 0);
  const dryTons = fineDaily.reduce((sum, row) => sum + Number(row.mineral_dry_metric_tons || 0), 0);
  const wetTonsWithoutFine = fineDaily.reduce((sum, row) => sum + Number(row.treated_wet_tons_without_fine || 0), 0);
  const deterministicShifts = fineDaily.reduce((sum, row) => sum + Number(row.deterministic_shifts || 0), 0);
  const dispatchedConcentrateTons = flowRows.reduce((sum, row) => sum + Number(row.dispatched_concentrate_t || 0), 0);
  const shipmentRows = flowRows.reduce((sum, row) => sum + Number(row.shipment_rows || 0), 0);
  const reviewShipmentRows = flowRows.reduce((sum, row) => sum + Number(row.review_shipment_rows || 0), 0);
  const plan = planResult.data || null;
  const plannedContainedCuTons = plan?.planned_contained_cu_metric_tons == null ? null : Number(plan.planned_contained_cu_metric_tons);
  const containedCuPlanProgressPct = plannedContainedCuTons && plannedContainedCuTons > 0 ? (containedFeedCuTons / plannedContainedCuTons) * 100 : null;

  return NextResponse.json({
    period: {
      periodStart,
      dataThrough: through,
      shifts: rows.length,
      movements,
      movementSourceCutoff,
      movementCoverageState,
      transportedTons,
      comparableTreatedTons,
      treatedTons,
      transportTreatmentDeltaTons,
      flowReconciliationState: movementCoverageState === 'partial_source_window'
        ? 'source_cutoff'
        : Math.abs(transportTreatmentDeltaTons) < 0.001 ? 'period_balanced' : 'inventory_or_timing_required',
      dryTons,
      mineralMoisturePct: weightedAverage(rows, (row) => row.mineral_moisture_pct, (row) => row.treated_metric_tons),
      headGradePct: dryTons > 0 ? fineDaily.reduce((sum, row) => sum + Number(row.avg_head_grade_pct || 0) * Number(row.mineral_dry_metric_tons || 0), 0) / dryTons : null,
      concentrateGradePct: weightedAverage(rows, (row) => row.concentrate_grade, (row) => row.treated_metric_tons),
      tailingsGradePct: weightedAverage(rows, (row) => row.tailings_grade, (row) => row.treated_metric_tons),
      recoveryPct: containedFeedCuTons > 0 ? (recoveredFineCuTons / containedFeedCuTons) * 100 : null,
      recoveredFineCuTons,
      containedFeedCuTons,
      containedCuPlanProgressPct,
      wetTonsWithoutFine,
      fineCoverageState: deterministicShifts === rows.length ? 'complete' : deterministicShifts === 0 ? 'no_assay' : 'partial',
      fineRuleVersion: 'dry_tons_x_head_grade_x_recovery_v1',
      fineMetalReportedTons: rows.reduce((sum, row) => sum + Number(row.fine_metal_reported || 0), 0),
      concentrateWetTons: rows.reduce((sum, row) => sum + Number(row.concentrate_wet_metric_tons || 0), 0),
      dispatchedConcentrateTons,
      shipmentRows,
      reviewShipmentRows,
      assayed,
      partial,
      noAssay,
      assayCoveragePct: rows.length ? (deterministicShifts / rows.length) * 100 : 0,
    },
    plan: plan ? {
      plan_code: plan.plan_code,
      period_start: plan.period_start,
      period_end: plan.period_end,
      total_mineral_to_plant_tons: plan.total_mineral_to_plant_tons,
      target_cu_grade_pct: plan.target_cu_grade_pct,
      plannedContainedCuTons,
      containedCuPlanState: plan.contained_cu_plan_state,
      plannedFineSemantic: plan.planned_fine_semantic,
      sourceReference: plan.source_reference,
      targetRecoveryPct: plan.target_recovery_pct,
      plannedRecoveredFineCuTons: plan.planned_recovered_fine_cu_metric_tons,
      recoveredFinePlanState: 'missing_target_recovery',
    } : null,
    daily,
    recent: recentResult.data || [],
    historical: {
      rows: historicalRows.length,
      minDate,
      maxDate: through,
      assayed: historicalRows.filter((row) => row.metallurgy_state === 'assayed').length,
      partial: historicalRows.filter((row) => row.metallurgy_state === 'partial').length,
      noAssay: historicalRows.filter((row) => row.metallurgy_state === 'no_assay').length,
    },
    sourceFidelity: {
      checks: flowQualityResult.data || [],
      rule: 'Los ceros solo representan cero cuando la fecha está dentro de la ventana de la fuente. Fuera de cobertura se devuelve null/source_unavailable.',
    },
    lineage: {
      source: 'TM 2026 actualizado (06-08-2026).xlsx [movimientos hasta 06-08] + LEY (1).xlsx [planta/fino 01-18 agosto] + PROGRAMA DE PRODUCCION AGOSTO 2026.pdf',
      model: 'production_flow_daily_fidelity_v1 -> production_fine_copper_v1 + production_concentrate_shipments + production_copper_plan_v1',
      note: 'Transporte y tratamiento sólo se comparan dentro de la ventana cubierta por TM. Desde el 07-08 el transporte es fuente no disponible, no cero y no pérdida.',
    },
  });
}
