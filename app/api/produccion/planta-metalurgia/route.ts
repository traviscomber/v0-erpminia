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

  const [rowsResult, recentResult, historicalResult] = await Promise.all([
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
  ]);

  const error = rowsResult.error || recentResult.error || historicalResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = rowsResult.data || [];
  const treatedTons = rows.reduce((sum, row) => sum + Number(row.treated_metric_tons || 0), 0);
  const assayed = rows.filter((row) => row.metallurgy_state === 'assayed').length;
  const partial = rows.filter((row) => row.metallurgy_state === 'partial').length;
  const noAssay = rows.filter((row) => row.metallurgy_state === 'no_assay').length;

  const byDate = new Map<string, typeof rows>();
  for (const row of rows) {
    const group = byDate.get(row.operation_date) || [];
    group.push(row);
    byDate.set(row.operation_date, group);
  }
  const daily = Array.from(byDate.entries()).map(([operationDate, dayRows]) => ({
    operationDate,
    shifts: dayRows.length,
    treatedTons: dayRows.reduce((sum, row) => sum + Number(row.treated_metric_tons || 0), 0),
    headGradePct: weightedAverage(dayRows, (row) => row.head_grade, (row) => row.treated_metric_tons),
    concentrateGradePct: weightedAverage(dayRows, (row) => row.concentrate_grade, (row) => row.treated_metric_tons),
    tailingsGradePct: weightedAverage(dayRows, (row) => row.tailings_grade, (row) => row.treated_metric_tons),
    recoveryPct: weightedAverage(dayRows, (row) => row.recovery_reported ?? row.recovery_by_grades_pct, (row) => row.treated_metric_tons),
    assayed: dayRows.filter((row) => row.metallurgy_state === 'assayed').length,
    noAssay: dayRows.filter((row) => row.metallurgy_state === 'no_assay').length,
  }));

  const historicalRows = historicalResult.data || [];
  const minDate = historicalRows.reduce<string | null>((min, row) => !min || row.operation_date < min ? row.operation_date : min, null);

  return NextResponse.json({
    period: {
      periodStart,
      dataThrough: through,
      shifts: rows.length,
      treatedTons,
      mineralMoisturePct: weightedAverage(rows, (row) => row.mineral_moisture_pct, (row) => row.treated_metric_tons),
      headGradePct: weightedAverage(rows, (row) => row.head_grade, (row) => row.treated_metric_tons),
      concentrateGradePct: weightedAverage(rows, (row) => row.concentrate_grade, (row) => row.treated_metric_tons),
      tailingsGradePct: weightedAverage(rows, (row) => row.tailings_grade, (row) => row.treated_metric_tons),
      recoveryPct: weightedAverage(rows, (row) => row.recovery_reported ?? row.recovery_by_grades_pct, (row) => row.treated_metric_tons),
      fineMetalReportedTons: rows.reduce((sum, row) => sum + Number(row.fine_metal_reported || 0), 0),
      concentrateWetTons: rows.reduce((sum, row) => sum + Number(row.concentrate_wet_metric_tons || 0), 0),
      assayed,
      partial,
      noAssay,
      assayCoveragePct: rows.length ? (assayed / rows.length) * 100 : 0,
    },
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
    lineage: {
      source: 'LEY.xlsx + LEYES.xlsx',
      model: 'production_metallurgy_deterministic_v2',
      note: 'Leyes observadas y cálculos determinísticos se mantienen diferenciados; valores sin ensayo permanecen nulos.',
    },
  });
}
