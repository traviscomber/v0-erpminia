export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const norm = (value: string | null | undefined) => (value || '').trim().toLocaleLowerCase('es-CL').replace(/\s+/g, ' ');
const num = (value: unknown) => Number(value || 0);

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [latestMovement, latestPlant, mines, sectors, plan, planLines, drillingSummary] = await Promise.all([
    context.supabase.from('production_material_movements').select('movement_date').eq('organization_id', context.organizationId).order('movement_date', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_metallurgy_deterministic_v2').select('operation_date').eq('organization_id', context.organizationId).order('operation_date', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_mine_sources').select('id,code,name,normalized_name,status').eq('organization_id', context.organizationId).order('name'),
    context.supabase.from('production_mine_sectors').select('id,mine_source_id,name,normalized_name,status').eq('organization_id', context.organizationId).order('name'),
    context.supabase.from('production_monthly_plans').select('id,plan_code,period_start,period_end,status,total_mineral_to_plant_tons,target_cu_grade_pct,planned_drilling_m,planned_advance_m').eq('organization_id', context.organizationId).eq('status', 'active').order('period_start', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_monthly_plan_lines').select('id,plan_id,line_type,mine_source_id,mine_name_raw,sector_raw,level_raw,section_raw,planned_tons,planned_grade_pct,planned_fine_cu,planned_advance_m,planned_drilling_m,planned_shots,planned_trips_per_day,participation_pct,priority,source_reference').eq('organization_id', context.organizationId).order('priority'),
    context.supabase.from('production_drilling_operational_summary_v1').select('min_date,max_date,report_rows,drilled_meters,holes,rigs,operators').eq('organization_id', context.organizationId).maybeSingle(),
  ]);

  const baseError = latestMovement.error || latestPlant.error || mines.error || sectors.error || plan.error || planLines.error || drillingSummary.error;
  if (baseError) return NextResponse.json({ error: baseError.message }, { status: 500 });

  const dates = [latestMovement.data?.movement_date, latestPlant.data?.operation_date].filter((v): v is string => Boolean(v));
  const dataThrough = dates.sort().at(-1) || null;
  if (!dataThrough) return NextResponse.json({ dataThrough: null, plan: plan.data || null, sectors: [], plantContext: null, drillingFreshness: drillingSummary.data || null });

  const d = new Date(`${dataThrough}T12:00:00Z`);
  const periodStart = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const [movements, metallurgy, drilling, drillingLineage] = await Promise.all([
    context.supabase.from('production_material_movements').select('movement_date,mine_source_id,mine_sector_id,mine_name_raw,sector_name_raw,normalized_metric_tons,validation_status').eq('organization_id', context.organizationId).gte('movement_date', periodStart).lte('movement_date', dataThrough),
    context.supabase.from('production_metallurgy_deterministic_v2').select('operation_date,treated_metric_tons,head_grade,recovery_reported,recovery_by_grades_pct,metallurgy_state').eq('organization_id', context.organizationId).gte('operation_date', periodStart).lte('operation_date', dataThrough),
    context.supabase.from('production_drilling_source_reports').select('operation_date,drilled_meters,hole_code_raw,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id,reconciliation_status').eq('organization_id', context.organizationId),
    context.supabase.from('production_drilling_reconciliation_v1').select('lineage_state').eq('organization_id', context.organizationId),
  ]);
  const err = movements.error || metallurgy.error || drilling.error || drillingLineage.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const mineById = new Map((mines.data || []).map((m) => [m.id, m]));
  const sectorById = new Map((sectors.data || []).map((s) => [s.id, s]));
  const agg = new Map<string, any>();
  const ensure = (mineId: string | null, sectorId: string | null, mineName: string, sectorName: string) => {
    const key = `${mineId || norm(mineName)}::${sectorId || norm(sectorName)}`;
    if (!agg.has(key)) agg.set(key, { key, mineId, sectorId, mineName: mineName || 'Sin mina', sectorName: sectorName || 'Sin sector', actualTons: 0, movements: 0, plannedTons: 0, plannedGradePct: null, plannedAdvanceM: 0, plannedDrillingM: 0, drillingMetersHistorical: 0, drillingReportsHistorical: 0, drillingHoles: new Set<string>(), drillingCanonicalSectorReports: 0, planMatch: 'none' });
    return agg.get(key);
  };

  for (const row of movements.data || []) {
    const mine = row.mine_source_id ? mineById.get(row.mine_source_id) : null;
    const sector = row.mine_sector_id ? sectorById.get(row.mine_sector_id) : null;
    const item = ensure(row.mine_source_id, row.mine_sector_id, mine?.name || row.mine_name_raw || '', sector?.name || row.sector_name_raw || '');
    item.actualTons += num(row.normalized_metric_tons);
    item.movements += 1;
  }

  const activePlan = plan.data || null;
  for (const line of (planLines.data || []).filter((l) => !activePlan || l.plan_id === activePlan.id)) {
    const mine = line.mine_source_id ? mineById.get(line.mine_source_id) : null;
    const sector = (sectors.data || []).find((s) => s.mine_source_id === line.mine_source_id && norm(s.normalized_name || s.name) === norm(line.sector_raw));
    const item = ensure(line.mine_source_id, sector?.id || null, mine?.name || line.mine_name_raw || '', sector?.name || line.sector_raw || line.section_raw || '');
    item.plannedTons += num(line.planned_tons);
    item.plannedAdvanceM += num(line.planned_advance_m);
    item.plannedDrillingM += num(line.planned_drilling_m);
    if (line.planned_grade_pct !== null) item.plannedGradePct = num(line.planned_grade_pct);
    item.planMatch = sector ? 'canonical_mine+normalized_sector' : 'plan_label';
  }

  // Drilling is attributed to a sector only when the report has canonical Mine + Sector + Hole lineage.
  // Raw text labels are intentionally not used as a fallback: the source workbook can contain
  // "No registrado", and text similarity is not auditable evidence of physical location.
  for (const row of drilling.data || []) {
    if (!row.canonical_mine_source_id || !row.canonical_mine_sector_id || !row.canonical_drill_hole_id) continue;
    const mine = mineById.get(row.canonical_mine_source_id);
    const sector = sectorById.get(row.canonical_mine_sector_id);
    if (!mine || !sector || sector.mine_source_id !== row.canonical_mine_source_id) continue;
    const target = ensure(row.canonical_mine_source_id, row.canonical_mine_sector_id, mine.name, sector.name);
    target.drillingMetersHistorical += num(row.drilled_meters);
    target.drillingReportsHistorical += 1;
    if (row.hole_code_raw) target.drillingHoles.add(row.hole_code_raw);
    target.drillingCanonicalSectorReports += 1;
  }

  const met = metallurgy.data || [];
  const treatedTons = met.reduce((s, r) => s + num(r.treated_metric_tons), 0);
  const weighted = (field: 'head_grade' | 'recovery') => {
    const rows = met.map((r) => ({ tons: num(r.treated_metric_tons), value: field === 'head_grade' ? r.head_grade : (r.recovery_reported ?? r.recovery_by_grades_pct) })).filter((r) => r.tons > 0 && r.value !== null && r.value !== undefined && Number.isFinite(Number(r.value)));
    const w = rows.reduce((s, r) => s + r.tons, 0);
    return w ? rows.reduce((s, r) => s + Number(r.value) * r.tons, 0) / w : null;
  };
  const assayed = met.filter((r) => r.metallurgy_state === 'assayed').length;

  const sectorRows = [...agg.values()].map((x) => ({
    ...x,
    drillingHoles: x.drillingHoles.size,
    actualVsPlanPct: x.plannedTons > 0 ? (x.actualTons / x.plannedTons) * 100 : null,
    drillingReconciliationPct: x.drillingReportsHistorical > 0 ? (x.drillingCanonicalSectorReports / x.drillingReportsHistorical) * 100 : null,
  })).sort((a, b) => b.actualTons - a.actualTons || b.plannedTons - a.plannedTons);

  const lineageCounts = (drillingLineage.data || []).reduce<Record<string, number>>((acc, row) => {
    const key = row.lineage_state || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    periodStart,
    dataThrough,
    plan: activePlan,
    sectors: sectorRows,
    plantContext: {
      scope: 'global_plant_only',
      treatedTons,
      avgHeadGradePct: weighted('head_grade'),
      avgRecoveryPct: weighted('recovery'),
      shifts: met.length,
      assayed,
      assayCoveragePct: met.length ? (assayed / met.length) * 100 : 0,
      note: 'No se atribuyen KPI metalúrgicos a mina/sector sin linaje directo entre alimentación de planta y origen.',
    },
    drillingFreshness: drillingSummary.data || null,
    drillingReconciliation: {
      totalReports: drillingLineage.data?.length || 0,
      fullyReconciled: lineageCounts.fully_reconciled || 0,
      holeOnlyReview: lineageCounts.hole_only_review || 0,
      unresolvedOrConflict: (drillingLineage.data?.length || 0) - (lineageCounts.fully_reconciled || 0) - (lineageCounts.hole_only_review || 0),
      states: lineageCounts,
      policy: 'Solo se atribuye sondaje a Mina/Sector cuando Mina + Sector + Pozo son canónicos y consistentes.',
    },
    lineage: {
      transport: 'production_material_movements',
      plan: 'production_monthly_plans + production_monthly_plan_lines',
      drilling: 'production_drilling_reconciliation_v1 -> production_drilling_source_reports -> production_drill_holes',
      plant: 'production_metallurgy_deterministic_v2 (contexto global)',
      sernageomin: 'Contexto externo disponible en módulo Geología; no reemplaza la verdad operacional interna.',
    },
  });
}
