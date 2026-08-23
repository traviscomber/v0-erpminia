export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_QUIMICA);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [latest, chemistryQuality, sourceSectors, mineIntel, lineageQuality] = await Promise.all([
    context.supabase.from('production_metallurgy_deterministic_v2').select('operation_date').eq('organization_id', context.organizationId).order('operation_date', { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from('production_chemistry_source_quality_v1').select('samples,results,holes_with_samples,sectors_with_samples,sample_review_rows,result_review_rows').eq('organization_id', context.organizationId).maybeSingle(),
    context.supabase.from('production_chemistry_sector_source_summary_v1').select('mine_name,sector_raw,sample_count,result_count,first_sample_date,last_sample_date,avg_cu_pct,min_cu_pct,max_cu_pct,linked_holes,linked_canonical_sectors,resolution_state').eq('organization_id', context.organizationId).order('mine_name').order('sector_raw'),
    context.supabase.from('production_chemistry_mine_intelligence_v1').select('mine_name,results,raw_locations,avg_cu_pct,min_cu_pct,max_cu_pct,first_sample_date,last_sample_date,sector_linked_results,hole_linked_results').eq('organization_id', context.organizationId).order('mine_name'),
    context.supabase.from('production_chemistry_lineage_quality_v1').select('check_key,expected_value,actual_value,status'),
  ]);

  const initialError = latest.error || chemistryQuality.error || sourceSectors.error || mineIntel.error || lineageQuality.error;
  if (initialError) return NextResponse.json({ error: initialError.message }, { status: 500 });

  const through = latest.data?.operation_date || null;
  const canonical = chemistryQuality.data || { samples: 0, results: 0, holes_with_samples: 0, sectors_with_samples: 0, sample_review_rows: 0, result_review_rows: 0 };
  const chemistrySectors = (sourceSectors.data || []).map((row) => ({
    mineName: row.mine_name,
    sectorRaw: row.sector_raw,
    samples: Number(row.sample_count || 0),
    results: Number(row.result_count || 0),
    firstSampleDate: row.first_sample_date,
    lastSampleDate: row.last_sample_date,
    avgCuPct: row.avg_cu_pct == null ? null : Number(row.avg_cu_pct),
    minCuPct: row.min_cu_pct == null ? null : Number(row.min_cu_pct),
    maxCuPct: row.max_cu_pct == null ? null : Number(row.max_cu_pct),
    linkedHoles: Number(row.linked_holes || 0),
    linkedCanonicalSectors: Number(row.linked_canonical_sectors || 0),
    resolutionState: row.resolution_state,
  }));
  const chemistryMines = (mineIntel.data || []).map((row) => ({
    mineName: row.mine_name,
    results: Number(row.results || 0),
    rawLocations: Number(row.raw_locations || 0),
    avgCuPct: row.avg_cu_pct == null ? null : Number(row.avg_cu_pct),
    minCuPct: row.min_cu_pct == null ? null : Number(row.min_cu_pct),
    maxCuPct: row.max_cu_pct == null ? null : Number(row.max_cu_pct),
    firstSampleDate: row.first_sample_date,
    lastSampleDate: row.last_sample_date,
    sectorLinkedResults: Number(row.sector_linked_results || 0),
    holeLinkedResults: Number(row.hole_linked_results || 0),
  }));
  const lineageChecks = lineageQuality.data || [];

  if (!through) return NextResponse.json({ period: null, pending: [], recent: [], canonical, chemistrySectors, chemistryMines, lineageChecks, lineage: null });
  const date = new Date(`${through}T12:00:00Z`);
  const periodStart = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const [periodResult, recentResult] = await Promise.all([
    context.supabase.from('production_metallurgy_deterministic_v2').select('plant_shift_id,operation_date,shift_code,head_grade,concentrate_grade,tailings_grade,recovery_reported,recovery_by_grades_pct,metallurgy_state,source_file,source_row').eq('organization_id', context.organizationId).gte('operation_date', periodStart).lte('operation_date', through).order('operation_date').order('shift_code'),
    context.supabase.from('production_metallurgy_results').select('id,plant_shift_id,head_grade,concentrate_grade,tailings_grade,recovery_reported,analysis_status,validation_status,validation_notes,source_file,source_sheet,source_row,updated_at').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).limit(30),
  ]);
  const error = periodResult.error || recentResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = periodResult.data || [];
  const assayed = rows.filter((row) => row.metallurgy_state === 'assayed');
  const pending = rows.filter((row) => row.metallurgy_state !== 'assayed');
  const vals = (key: 'head_grade'|'concentrate_grade'|'tailings_grade') => assayed.map((row) => Number(row[key])).filter(Number.isFinite);
  const recovery = assayed.map((row) => Number(row.recovery_reported ?? row.recovery_by_grades_pct)).filter(Number.isFinite);
  const range = (values: number[]) => values.length ? { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length } : null;

  return NextResponse.json({
    period: { periodStart, dataThrough: through, totalShifts: rows.length, assayed: assayed.length, pending: pending.length, coveragePct: rows.length ? (assayed.length / rows.length) * 100 : 0, headGrade: range(vals('head_grade')), concentrateGrade: range(vals('concentrate_grade')), tailingsGrade: range(vals('tailings_grade')), recovery: range(recovery) },
    pending: pending.map((row) => ({ plantShiftId: row.plant_shift_id, operationDate: row.operation_date, shiftCode: row.shift_code, state: row.metallurgy_state, sourceFile: row.source_file, sourceRow: row.source_row })),
    recent: recentResult.data || [],
    canonical,
    chemistrySectors,
    chemistryMines,
    lineageChecks,
    scope: {
      canonicalChemistryAvailable: Number(canonical.samples || 0) > 0,
      currentProjection: 'Muestras especiales históricas + ensayos de proceso',
      limitations: 'Las muestras especiales acreditan Cu histórico por Mina/ubicación fuente. No existe coincidencia exacta de Sector con el catálogo ni con los sectores actuales de Sondajes; Pozo permanece sin asignar.',
    },
    lineage: {
      processAssays: 'LEY.xlsx + LEYES.xlsx + LEY (1).xlsx → production_metallurgy_results',
      canonicalSamples: 'LEY (1).xlsx / observaciones de muestra especial → production_chemistry_samples → production_chemistry_results',
      targetLineage: 'Muestra → Mina → Sector fuente → Sector canónico cuando exista evidencia → Pozo cuando exista evidencia → Analito',
      note: 'La química histórica sirve como evidencia contextual por Mina/ubicación. No se usa como ley representativa del plan 2026 ni se fuerza contra Sondajes.',
    },
  });
}
