export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_QUIMICA);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [latest, chemistryQuality] = await Promise.all([
    context.supabase
      .from('production_metallurgy_deterministic_v2')
      .select('operation_date')
      .eq('organization_id', context.organizationId)
      .order('operation_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    context.supabase
      .from('production_chemistry_source_quality_v1')
      .select('samples,results,holes_with_samples,sectors_with_samples,sample_review_rows,result_review_rows')
      .eq('organization_id', context.organizationId)
      .maybeSingle(),
  ]);
  const initialError = latest.error || chemistryQuality.error;
  if (initialError) return NextResponse.json({ error: initialError.message }, { status: 500 });

  const through = latest.data?.operation_date || null;
  const canonical = chemistryQuality.data || {
    samples: 0,
    results: 0,
    holes_with_samples: 0,
    sectors_with_samples: 0,
    sample_review_rows: 0,
    result_review_rows: 0,
  };

  if (!through) return NextResponse.json({ period: null, pending: [], recent: [], canonical, lineage: null });
  const date = new Date(`${through}T12:00:00Z`);
  const periodStart = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const [periodResult, recentResult] = await Promise.all([
    context.supabase
      .from('production_metallurgy_deterministic_v2')
      .select('plant_shift_id,operation_date,shift_code,head_grade,concentrate_grade,tailings_grade,recovery_reported,recovery_by_grades_pct,metallurgy_state,source_file,source_row')
      .eq('organization_id', context.organizationId)
      .gte('operation_date', periodStart)
      .lte('operation_date', through)
      .order('operation_date')
      .order('shift_code'),
    context.supabase
      .from('production_metallurgy_results')
      .select('id,plant_shift_id,head_grade,concentrate_grade,tailings_grade,recovery_reported,analysis_status,validation_status,validation_notes,source_file,source_sheet,source_row,updated_at')
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false })
      .limit(30),
  ]);

  const error = periodResult.error || recentResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = periodResult.data || [];
  const assayed = rows.filter((row) => row.metallurgy_state === 'assayed');
  const pending = rows.filter((row) => row.metallurgy_state !== 'assayed');
  const head = assayed.map((row) => Number(row.head_grade)).filter(Number.isFinite);
  const concentrate = assayed.map((row) => Number(row.concentrate_grade)).filter(Number.isFinite);
  const tailings = assayed.map((row) => Number(row.tailings_grade)).filter(Number.isFinite);
  const recovery = assayed.map((row) => Number(row.recovery_reported ?? row.recovery_by_grades_pct)).filter(Number.isFinite);

  const range = (values: number[]) => values.length ? { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length } : null;

  return NextResponse.json({
    period: {
      periodStart,
      dataThrough: through,
      totalShifts: rows.length,
      assayed: assayed.length,
      pending: pending.length,
      coveragePct: rows.length ? (assayed.length / rows.length) * 100 : 0,
      headGrade: range(head),
      concentrateGrade: range(concentrate),
      tailingsGrade: range(tailings),
      recovery: range(recovery),
    },
    pending: pending.map((row) => ({
      plantShiftId: row.plant_shift_id,
      operationDate: row.operation_date,
      shiftCode: row.shift_code,
      state: row.metallurgy_state,
      sourceFile: row.source_file,
      sourceRow: row.source_row,
    })),
    recent: recentResult.data || [],
    canonical,
    scope: {
      canonicalChemistryAvailable: Number(canonical.samples || 0) > 0,
      currentProjection: 'Ensayos de proceso asociados a Planta / Metalurgia',
      limitations: Number(canonical.samples || 0) > 0
        ? 'Existe una fuente química independiente y sus muestras se mantienen separadas de los ensayos de proceso.'
        : 'Aún no existe una fuente de laboratorio independiente identificable. No se atribuyen leyes de Planta a Pozo o Sector.',
    },
    lineage: {
      processAssays: 'LEY.xlsx + LEYES.xlsx + LEY (1).xlsx → production_metallurgy_results',
      canonicalSamples: 'production_chemistry_samples → production_chemistry_results',
      targetLineage: 'Muestra → Pozo → Mina → Sector → Analito',
      note: 'La capa química independiente está preparada pero permanece vacía hasta incorporar una fuente de laboratorio real. Los ensayos de proceso no se reutilizan como geoquímica.',
    },
  });
}
