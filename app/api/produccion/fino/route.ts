export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const num = (value: unknown) => Number(value || 0);

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const url = new URL(request.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  const [latest, activePlan] = await Promise.all([
    context.supabase
      .from('production_fine_copper_daily_v1')
      .select('operation_date')
      .eq('organization_id', context.organizationId)
      .order('operation_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    context.supabase
      .from('production_copper_plan_v1')
      .select('plan_id,plan_code,period_start,period_end,status,total_mineral_to_plant_tons,target_cu_grade_pct,planned_contained_cu_metric_tons,target_recovery_pct,planned_recovered_fine_cu_metric_tons,contained_cu_plan_state,planned_fine_semantic,source_reference')
      .eq('organization_id', context.organizationId)
      .eq('status', 'active')
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const initialError = latest.error || activePlan.error;
  if (initialError) return NextResponse.json({ error: initialError.message }, { status: 500 });

  const latestDate = latest.data?.operation_date || null;
  if (!latestDate) {
    return NextResponse.json({
      from: fromParam,
      to: toParam,
      summary: null,
      daily: [],
      plan: activePlan.data || null,
    });
  }

  const d = new Date(`${latestDate}T12:00:00Z`);
  const defaultFrom = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const from = fromParam || activePlan.data?.period_start || defaultFrom;
  const to = toParam || latestDate;

  const { data: daily, error } = await context.supabase
    .from('production_fine_copper_daily_v1')
    .select('operation_date,shifts,deterministic_shifts,treated_wet_metric_tons,mineral_dry_metric_tons,contained_feed_cu_metric_tons,recovered_fine_cu_metric_tons,avg_head_grade_pct,effective_recovery_pct,treated_wet_tons_without_fine,fine_coverage_state')
    .eq('organization_id', context.organizationId)
    .gte('operation_date', from)
    .lte('operation_date', to)
    .order('operation_date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = daily || [];
  const totalShifts = rows.reduce((sum, row) => sum + num(row.shifts), 0);
  const deterministicShifts = rows.reduce((sum, row) => sum + num(row.deterministic_shifts), 0);
  const treatedWetTons = rows.reduce((sum, row) => sum + num(row.treated_wet_metric_tons), 0);
  const dryTons = rows.reduce((sum, row) => sum + num(row.mineral_dry_metric_tons), 0);
  const containedFeedCuTons = rows.reduce((sum, row) => sum + num(row.contained_feed_cu_metric_tons), 0);
  const recoveredFineCuTons = rows.reduce((sum, row) => sum + num(row.recovered_fine_cu_metric_tons), 0);
  const wetTonsWithoutFine = rows.reduce((sum, row) => sum + num(row.treated_wet_tons_without_fine), 0);

  const assayedDryRows = rows.filter((row) => num(row.mineral_dry_metric_tons) > 0 && row.avg_head_grade_pct !== null);
  const assayedDryTotal = assayedDryRows.reduce((sum, row) => sum + num(row.mineral_dry_metric_tons), 0);
  const avgHeadGradePct = assayedDryTotal > 0
    ? assayedDryRows.reduce((sum, row) => sum + num(row.avg_head_grade_pct) * num(row.mineral_dry_metric_tons), 0) / assayedDryTotal
    : null;
  const effectiveRecoveryPct = containedFeedCuTons > 0 ? (recoveredFineCuTons / containedFeedCuTons) * 100 : null;

  const plan = activePlan.data || null;
  const plannedContainedCuTons = plan?.planned_contained_cu_metric_tons == null ? null : num(plan.planned_contained_cu_metric_tons);
  const containedCuPlanProgressPct = plannedContainedCuTons && plannedContainedCuTons > 0
    ? (containedFeedCuTons / plannedContainedCuTons) * 100
    : null;

  return NextResponse.json({
    from,
    to,
    summary: {
      treatedWetTons,
      dryTons,
      avgHeadGradePct,
      effectiveRecoveryPct,
      containedFeedCuTons,
      recoveredFineCuTons,
      containedCuPlanProgressPct,
      totalShifts,
      deterministicShifts,
      assayCoveragePct: totalShifts > 0 ? (deterministicShifts / totalShifts) * 100 : 0,
      wetTonsWithoutFine,
      fineState: deterministicShifts === totalShifts ? 'complete' : deterministicShifts === 0 ? 'no_assay' : 'partial',
      formula: 'mineral_dry_metric_tons × head_grade_pct / 100 × recovery_pct / 100',
      ruleVersion: 'dry_tons_x_head_grade_x_recovery_v1',
    },
    plan: plan ? {
      id: plan.plan_id,
      planCode: plan.plan_code,
      periodStart: plan.period_start,
      periodEnd: plan.period_end,
      status: plan.status,
      totalMineralToPlantTons: plan.total_mineral_to_plant_tons,
      targetCuGradePct: plan.target_cu_grade_pct,
      plannedContainedCuTons,
      containedCuPlanState: plan.contained_cu_plan_state,
      plannedFineSemantic: plan.planned_fine_semantic,
      targetRecoveryPct: plan.target_recovery_pct,
      plannedRecoveredFineCuTons: plan.planned_recovered_fine_cu_metric_tons,
      recoveredFinePlanState: 'missing_target_recovery',
      sourceReference: plan.source_reference,
      note: 'El documento llama Cu Fino Mina al cobre contenido pre-recuperación. El fino recuperado de planta no tiene objetivo documentado y no se infiere.',
    } : null,
    daily: rows,
  });
}
