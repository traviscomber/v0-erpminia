export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { allQualityChecksPass } from '@/lib/production/quality-status.mjs';

const num = (value: unknown) => Number(value || 0);
const semantics = {
  planVsActual: 'El avance mensual usa tratamiento de planta como métrica operacional frente al plan de mineral a planta. Transporte se presenta sólo en la ventana cubierta por TM y no se extiende más allá del corte de fuente.',
  concentrate: 'Concentrado producido no se infiere. Sólo se muestra concentrado despachado acreditado por fuente.',
  sourceAbsence: 'Ausencia de una fuente no equivale a valor cero.',
} as const;

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [
    batches,
    movements,
    plantShifts,
    metallurgy,
    shipments,
    drilling,
    quality,
    sheetQuality,
    latestFlow,
    pendingImports,
    pendingMovementNormalization,
    movementReview,
    entityReview,
    plantReview,
    metallurgyReview,
    drillLocationReview,
    drillIntervals,
    chemistryResults,
    geologyQuality,
  ] = await Promise.all([
    context.supabase.from('production_import_batches').select('id,source_type,source_file,period_start,period_end,status,normalization_rule_version,created_at').eq('organization_id', context.organizationId).order('period_start', { ascending: false }),
    context.supabase.from('production_material_movements').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_plant_shifts').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_concentrate_shipments').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_drilling_operational_summary_v1').select('*').eq('organization_id', context.organizationId).maybeSingle(),
    context.supabase.from('production_master_normalization_quality_v1').select('check_key,expected_value,actual_value,status').eq('organization_id', context.organizationId).order('check_key'),
    context.supabase.from('production_source_sheet_coverage_quality_v1').select('check_key,expected_value,actual_value,status').eq('organization_id', context.organizationId).order('check_key'),
    context.supabase.from('production_flow_daily_fidelity_v1').select('operation_date').eq('organization_id', context.organizationId).order('operation_date', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_import_exceptions').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('review_status', 'pending'),
    context.supabase.from('production_material_movements').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('normalization_status', 'pending'),
    context.supabase.from('production_material_movements').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('validation_status', 'review'),
    context.supabase.from('production_entity_reconciliation').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('status', 'needs_review'),
    context.supabase.from('production_plant_shifts').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('validation_status', 'review'),
    context.supabase.from('production_metallurgy_results').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('validation_status', 'review'),
    context.supabase.from('production_drill_hole_location_review_queue_v1').select('drill_hole_id', { count: 'exact', head: true }).eq('organization_id', context.organizationId).eq('resolution_state', 'needs_evidence'),
    context.supabase.from('production_drill_intervals').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_chemistry_results').select('id', { count: 'exact', head: true }).eq('organization_id', context.organizationId),
    context.supabase.from('production_geology_context_quality_v1').select('external_records,sernageomin_records,valid_records,review_records').eq('organization_id', context.organizationId).maybeSingle(),
  ]);

  const baseError = batches.error || movements.error || plantShifts.error || metallurgy.error || shipments.error || drilling.error || quality.error || sheetQuality.error || latestFlow.error || pendingImports.error || pendingMovementNormalization.error || movementReview.error || entityReview.error || plantReview.error || metallurgyReview.error || drillLocationReview.error || drillIntervals.error || chemistryResults.error || geologyQuality.error;
  if (baseError) return NextResponse.json({ error: baseError.message }, { status: 500 });

  const qualityRows = quality.data || [];
  const qualityPass = qualityRows.filter((row) => row.status === 'PASS').length;
  const qualityHold = qualityRows.filter((row) => row.status !== 'PASS').length;
  const sheetRows = sheetQuality.data || [];
  const sheetCounts = Object.fromEntries(sheetRows.map((row) => [row.check_key, num(row.actual_value)]));

  const dataThrough = latestFlow.data?.operation_date || null;
  if (!dataThrough) {
    const drillingSummary = drilling.data || null;
    const queue = {
      importExceptions: pendingImports.count || 0,
      movementNormalization: pendingMovementNormalization.count || 0,
      movementValidation: movementReview.count || 0,
      entityReconciliation: entityReview.count || 0,
      plantShifts: plantReview.count || 0,
      metallurgy: metallurgyReview.count || 0,
      drillLocations: drillLocationReview.count || 0,
    };
    const geology = geologyQuality.data || null;

    return NextResponse.json({
      batches: batches.data || [],
      counts: {
        materialMovements: movements.count || 0,
        plantShifts: plantShifts.count || 0,
        metallurgyResults: metallurgy.count || 0,
        concentrateShipments: shipments.count || 0,
        drillingReports: num(drillingSummary?.report_rows),
        drillingHoles: num(drillingSummary?.holes),
      },
      quality: {
        status: 'HOLD',
        pass: qualityPass,
        hold: qualityHold,
        checks: qualityRows,
        sourceFiles: sheetCounts.canonical_source_files || 0,
        sourceSheets: sheetCounts.source_sheet_registry || 0,
        supplementalRecords: sheetCounts.supplemental_normalized_records || 0,
        sourceAnomalies: sheetCounts.source_anomalies_classified || 0,
        referenceOnly: sheetCounts.reference_only_records_classified || 0,
      },
      freshness: { dataThrough: null, transportSourceThrough: null, drillingThrough: drillingSummary?.max_date || null },
      coverage: {
        queue,
        domains: {
          transport: { status: (movements.count || 0) > 0 ? 'partial' : 'awaiting_source', evidenceCount: movements.count || 0, reviewCount: Math.max(queue.movementNormalization, queue.movementValidation), dataThrough: null, note: 'No existe un período de flujo acreditado para presentar.' },
          plant: { status: (plantShifts.count || 0) > 0 ? 'partial' : 'awaiting_source', evidenceCount: plantShifts.count || 0, reviewCount: queue.plantShifts + queue.metallurgy, dataThrough: null, note: 'No existe un período de Planta acreditado para presentar.' },
          drilling: { status: num(drillingSummary?.holes) > 0 ? 'partial' : 'awaiting_source', evidenceCount: num(drillingSummary?.holes), reviewCount: queue.drillLocations, dataThrough: drillingSummary?.max_date || null, coveragePct: num(drillingSummary?.meter_capture_pct), intervalCount: drillIntervals.count || 0, note: 'Sondaje conserva sólo la evidencia disponible; no completa vacíos.' },
          chemistry: { status: (chemistryResults.count || 0) > 0 ? 'operational' : 'awaiting_source', evidenceCount: chemistryResults.count || 0, reviewCount: 0, dataThrough: null, note: (chemistryResults.count || 0) > 0 ? 'Resultados canónicos disponibles según el paquete recibido.' : 'Modelo disponible; falta una fuente química acreditada.' },
          geology: { status: num(geology?.external_records) > 0 ? 'operational' : 'awaiting_source', evidenceCount: num(geology?.external_records), reviewCount: num(geology?.review_records), dataThrough: null, note: 'Falta incorporar contexto geológico externo acreditado.' },
          topography: { status: 'awaiting_source', evidenceCount: 0, reviewCount: 0, dataThrough: null, note: 'Falta una fuente canónica de topografía real.' },
        },
      },
      currentPeriod: null,
      daily: [],
      semantics,
    });
  }

  const throughDate = new Date(`${dataThrough}T12:00:00Z`);
  const year = throughDate.getUTCFullYear();
  const month = throughDate.getUTCMonth();
  const periodStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const elapsedDays = throughDate.getUTCDate();
  const calendarProgressPct = (elapsedDays / daysInMonth) * 100;

  const [flow, metallurgyRows, activePlan] = await Promise.all([
    context.supabase
      .from('production_flow_daily_fidelity_v1')
      .select('operation_date,movement_source_cutoff,movement_source_state,transported_t,treated_wet_t,contained_cu_t,recovered_fine_cu_t,shift_rows,deterministic_shift_rows,shipment_rows,valid_shipment_rows,review_shipment_rows,dispatched_concentrate_t,flow_source_state,movement_rows')
      .eq('organization_id', context.organizationId)
      .gte('operation_date', periodStart)
      .lte('operation_date', dataThrough)
      .order('operation_date'),
    context.supabase
      .from('production_metallurgy_deterministic_v2')
      .select('operation_date,treated_metric_tons,head_grade,recovery_reported,recovery_by_grades_pct,metallurgy_state')
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

  const periodError = flow.error || metallurgyRows.error || activePlan.error;
  if (periodError) return NextResponse.json({ error: periodError.message }, { status: 500 });

  const daily = flow.data || [];
  const met = metallurgyRows.data || [];
  const treatedTons = daily.reduce((sum, row) => sum + num(row.treated_wet_t), 0);
  const containedCuTons = daily.reduce((sum, row) => sum + num(row.contained_cu_t), 0);
  const recoveredFineCuTons = daily.reduce((sum, row) => sum + num(row.recovered_fine_cu_t), 0);
  const dispatchedConcentrateTons = daily.reduce((sum, row) => sum + num(row.dispatched_concentrate_t), 0);
  const plantShiftRows = daily.reduce((sum, row) => sum + num(row.shift_rows), 0);
  const deterministicShiftRows = daily.reduce((sum, row) => sum + num(row.deterministic_shift_rows), 0);
  const shipmentRows = daily.reduce((sum, row) => sum + num(row.shipment_rows), 0);
  const validShipmentRows = daily.reduce((sum, row) => sum + num(row.valid_shipment_rows), 0);
  const reviewShipmentRows = daily.reduce((sum, row) => sum + num(row.review_shipment_rows), 0);

  const transportRows = daily.filter((row) => row.movement_source_state === 'within_source_window');
  const transportComparableTons = transportRows.reduce((sum, row) => sum + num(row.transported_t), 0);
  const transportSourceThrough = transportRows.at(-1)?.operation_date || null;
  const treatedComparableTons = transportRows.reduce((sum, row) => sum + num(row.treated_wet_t), 0);

  const gradeRows = met.filter((row) => row.head_grade !== null && num(row.treated_metric_tons) > 0);
  const gradeWeight = gradeRows.reduce((sum, row) => sum + num(row.treated_metric_tons), 0);
  const avgHeadGradePct = gradeWeight > 0 ? gradeRows.reduce((sum, row) => sum + num(row.head_grade) * num(row.treated_metric_tons), 0) / gradeWeight : null;
  const recoveryRows = met.filter((row) => (row.recovery_reported ?? row.recovery_by_grades_pct) !== null && num(row.treated_metric_tons) > 0);
  const recoveryWeight = recoveryRows.reduce((sum, row) => sum + num(row.treated_metric_tons), 0);
  const avgRecoveryPct = recoveryWeight > 0 ? recoveryRows.reduce((sum, row) => sum + num(row.recovery_reported ?? row.recovery_by_grades_pct) * num(row.treated_metric_tons), 0) / recoveryWeight : null;

  const plan = activePlan.data || null;
  const planTons = num(plan?.total_mineral_to_plant_tons);
  const treatmentProgressPct = planTons > 0 ? (treatedTons / planTons) * 100 : null;
  const paceIndexPct = treatmentProgressPct !== null && calendarProgressPct > 0 ? (treatmentProgressPct / calendarProgressPct) * 100 : null;
  const projectedTreatmentTons = elapsedDays > 0 ? (treatedTons / elapsedDays) * daysInMonth : null;
  const projectedPlanPct = planTons > 0 && projectedTreatmentTons !== null ? (projectedTreatmentTons / planTons) * 100 : null;
  const targetGrade = plan?.target_cu_grade_pct === null || plan?.target_cu_grade_pct === undefined ? null : num(plan.target_cu_grade_pct);
  const gradeDeltaPctPoints = avgHeadGradePct !== null && targetGrade !== null ? avgHeadGradePct - targetGrade : null;

  const intelligence: Array<{ level: 'info' | 'watch' | 'alert'; code: string; title: string; detail: string }> = [];
  if (paceIndexPct !== null) {
    intelligence.push({
      level: paceIndexPct >= 97 ? 'info' : paceIndexPct >= 90 ? 'watch' : 'alert',
      code: 'treatment_pace',
      title: paceIndexPct >= 97 ? 'Ritmo de tratamiento alineado con el mes' : 'Ritmo de tratamiento bajo el avance calendario',
      detail: `Tratamiento ${treatmentProgressPct?.toFixed(1)}% del plan con ${calendarProgressPct.toFixed(1)}% del mes transcurrido. Proyección simple: ${projectedPlanPct?.toFixed(1)}% del plan.`,
    });
  }
  if (gradeDeltaPctPoints !== null) {
    intelligence.push({
      level: gradeDeltaPctPoints >= 0 ? 'info' : gradeDeltaPctPoints >= -0.08 ? 'watch' : 'alert',
      code: 'head_grade_vs_target',
      title: gradeDeltaPctPoints >= 0 ? 'Ley de cabeza en o sobre objetivo' : 'Ley de cabeza bajo objetivo',
      detail: `Actual ponderada ${avgHeadGradePct?.toFixed(3)}% Cu vs objetivo ${targetGrade?.toFixed(2)}% Cu (${gradeDeltaPctPoints >= 0 ? '+' : ''}${gradeDeltaPctPoints.toFixed(3)} pp).`,
    });
  }
  if (transportSourceThrough && transportSourceThrough < dataThrough) {
    intelligence.push({
      level: 'watch',
      code: 'transport_source_cutoff',
      title: 'Cobertura de transporte termina antes que Planta',
      detail: `TM disponible hasta ${transportSourceThrough}; Planta llega hasta ${dataThrough}. No se interpreta ausencia de TM como 0 transportado.`,
    });
  }
  if (reviewShipmentRows > 0) {
    intelligence.push({
      level: 'watch',
      code: 'shipment_review',
      title: 'Despacho con evidencia incompleta',
      detail: `${reviewShipmentRows} despacho(s) requieren revisión de fuente; no se imputa ley faltante.`,
    });
  }

  const drillingSummary = drilling.data || null;
  const queue = {
    importExceptions: pendingImports.count || 0,
    movementNormalization: pendingMovementNormalization.count || 0,
    movementValidation: movementReview.count || 0,
    entityReconciliation: entityReview.count || 0,
    plantShifts: plantReview.count || 0,
    metallurgy: metallurgyReview.count || 0,
    drillLocations: drillLocationReview.count || 0,
  };
  const geology = geologyQuality.data || null;
  const transportIsPartial = queue.movementNormalization > 0 || queue.movementValidation > 0 || Boolean(transportSourceThrough && transportSourceThrough < dataThrough);
  const plantIsPartial = queue.plantShifts > 0 || queue.metallurgy > 0;
  const drillingIsPartial = queue.drillLocations > 0 || num(drillingSummary?.meter_capture_pct) < 100 || (drillIntervals.count || 0) === 0;

  return NextResponse.json({
    batches: batches.data || [],
    counts: {
      materialMovements: movements.count || 0,
      plantShifts: plantShifts.count || 0,
      metallurgyResults: metallurgy.count || 0,
      concentrateShipments: shipments.count || 0,
      drillingReports: num(drillingSummary?.report_rows),
      drillingHoles: num(drillingSummary?.holes),
    },
    quality: {
      status: allQualityChecksPass(qualityRows) ? 'PASS' : 'HOLD',
      pass: qualityPass,
      hold: qualityHold,
      checks: qualityRows,
      sourceFiles: sheetCounts.canonical_source_files || 0,
      sourceSheets: sheetCounts.source_sheet_registry || 0,
      supplementalRecords: sheetCounts.supplemental_normalized_records || 0,
      sourceAnomalies: sheetCounts.source_anomalies_classified || 0,
      referenceOnly: sheetCounts.reference_only_records_classified || 0,
    },
    freshness: {
      dataThrough,
      transportSourceThrough,
      drillingThrough: drillingSummary?.max_date || null,
    },
    currentPeriod: {
      periodStart,
      dataThrough,
      elapsedDays,
      daysInMonth,
      calendarProgressPct,
      treatedTons,
      containedCuTons,
      recoveredFineCuTons,
      avgHeadGradePct,
      avgRecoveryPct,
      plantShifts: plantShiftRows,
      deterministicShifts: deterministicShiftRows,
      dispatch: { shipmentRows, validShipmentRows, reviewShipmentRows, wetMetricTons: dispatchedConcentrateTons },
      transportComparable: { sourceThrough: transportSourceThrough, transportedTons: transportComparableTons, treatedTons: treatedComparableTons, deltaTons: transportComparableTons - treatedComparableTons },
      plan: plan ? {
        code: plan.plan_code,
        periodStart: plan.period_start,
        periodEnd: plan.period_end,
        mineralToPlantTons: planTons,
        targetCuGradePct: targetGrade,
        plannedDrillingM: num(plan.planned_drilling_m),
        plannedAdvanceM: num(plan.planned_advance_m),
        treatmentProgressPct,
        paceIndexPct,
        projectedTreatmentTons,
        projectedPlanPct,
        gradeDeltaPctPoints,
      } : null,
    },
    daily,
    drilling: drillingSummary ? {
      meters: num(drillingSummary.drilled_meters),
      rigs: num(drillingSummary.rigs),
      operators: num(drillingSummary.operators),
      outOfServiceReports: num(drillingSummary.out_of_service_reports),
      meterCapturePct: num(drillingSummary.meter_capture_pct),
    } : null,
    coverage: {
      queue,
      domains: {
        transport: {
          status: transportIsPartial ? 'partial' : 'operational',
          evidenceCount: movements.count || 0,
          reviewCount: Math.max(queue.movementNormalization, queue.movementValidation),
          dataThrough: transportSourceThrough,
          note: transportIsPartial ? 'Útil dentro de la ventana acreditada; conserva movimientos ambiguos para revisión.' : 'Cobertura acreditada para la ventana disponible.',
        },
        plant: {
          status: plantIsPartial ? 'partial' : 'operational',
          evidenceCount: plantShifts.count || 0,
          reviewCount: queue.plantShifts + queue.metallurgy,
          dataThrough,
          note: plantIsPartial ? 'La serie es utilizable; los turnos y análisis observados en revisión permanecen separados.' : 'Turnos y metalurgia acreditados para la fuente disponible.',
        },
        drilling: {
          status: drillingIsPartial ? 'partial' : 'operational',
          evidenceCount: num(drillingSummary?.holes),
          reviewCount: queue.drillLocations,
          dataThrough: drillingSummary?.max_date || null,
          coveragePct: num(drillingSummary?.meter_capture_pct),
          intervalCount: drillIntervals.count || 0,
          note: drillingIsPartial ? 'Operación visible; ubicación, captura de metros o intervalos requieren más evidencia.' : 'Pozos, ubicación e intervalos con cobertura acreditada.',
        },
        chemistry: {
          status: (chemistryResults.count || 0) > 0 ? 'operational' : 'awaiting_source',
          evidenceCount: chemistryResults.count || 0,
          reviewCount: 0,
          dataThrough: null,
          note: (chemistryResults.count || 0) > 0 ? 'Resultados canónicos disponibles según el paquete recibido.' : 'Modelo disponible; falta una fuente química acreditada.',
        },
        geology: {
          status: num(geology?.external_records) > 0 ? 'operational' : num(drillingSummary?.report_rows) > 0 ? 'partial' : 'awaiting_source',
          evidenceCount: num(geology?.external_records),
          reviewCount: num(geology?.review_records),
          dataThrough: null,
          note: num(geology?.external_records) > 0 ? 'Contexto geológico externo acreditado y separado de la operación.' : 'Mina, Sector y Sondaje están disponibles; falta incorporar contexto geológico externo.',
        },
        topography: {
          status: 'awaiting_source',
          evidenceCount: 0,
          reviewCount: 0,
          dataThrough: null,
          note: plan ? 'Plan operacional disponible; faltan levantamientos, coordenadas, cotas y avance real.' : 'Falta una fuente canónica de topografía real.',
        },
      },
    },
    intelligence,
    semantics,
  });
}
