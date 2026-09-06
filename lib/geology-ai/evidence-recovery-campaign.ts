type SupabaseClientLike = any;

type RecoveryCandidate = {
  drill_hole_id: string;
  hole_code: string;
  mine_name: string | null;
  sector_name: string | null;
  last_evidence_date: string | null;
  has_topography: boolean;
  has_survey: boolean;
  topography_evidence_rows: number;
  survey_evidence_rows: number;
  topography_source_refs: string | null;
  survey_source_refs: string | null;
  drilled_depth_m: number | null;
  positive_visual_span_count: number;
  structure_span_count: number;
  lithology_span_count: number;
  effective_priority_rank: number | null;
  effective_attention_reason: string | null;
};

const asNumber = (value: unknown) => value == null ? null : Number(value);

const latestDate = (a: string | null | undefined, b: string | null | undefined) => {
  if (!a) return b || null;
  if (!b) return a;
  return a >= b ? a : b;
};

const evidenceLoad = (row: RecoveryCandidate) =>
  row.positive_visual_span_count + row.structure_span_count + row.lithology_span_count;

export async function buildEvidenceRecoveryCampaign(args: {
  supabase: SupabaseClientLike;
  organizationId: string;
  currentYear?: number;
}) {
  const { supabase, organizationId } = args;
  const currentYear = args.currentYear ?? new Date().getUTCFullYear();

  const [topography, survey, context, quality] = await Promise.all([
    supabase
      .from('production_geology_topography_recovery_v1')
      .select('drill_hole_id,hole_code,mine_name,sector_name,last_evidence_date,topography_evidence_rows,source_refs')
      .eq('organization_id', organizationId),
    supabase
      .from('production_geology_survey_recovery_v1')
      .select('drill_hole_id,hole_code,mine_name,sector_name,last_evidence_date,survey_evidence_rows,source_refs')
      .eq('organization_id', organizationId),
    supabase
      .from('production_geology_hole_context_v2')
      .select('drill_hole_id,hole_code,mine_name,sector_name,drilled_depth_m,positive_visual_span_count,structure_span_count,lithology_span_count,effective_priority_rank,effective_attention_reason')
      .eq('organization_id', organizationId),
    supabase
      .from('production_geology_data_quality_v1')
      .select('drill_hole_id,missing_azimuth,missing_dip')
      .eq('organization_id', organizationId),
  ]);

  const error = topography.error || survey.error || context.error || quality.error;
  if (error) throw new Error(error.message || 'No fue posible construir la campaña de recuperación');

  const contextMap = new Map((context.data || []).map((row: any) => [row.drill_hole_id, row]));
  const candidates = new Map<string, RecoveryCandidate>();

  const ensure = (row: any): RecoveryCandidate | null => {
    if (!row.drill_hole_id) return null;
    const existing = candidates.get(row.drill_hole_id);
    if (existing) return existing;
    const ctx: any = contextMap.get(row.drill_hole_id) || {};
    const candidate: RecoveryCandidate = {
      drill_hole_id: row.drill_hole_id,
      hole_code: row.hole_code || ctx.hole_code || 'Sondaje sin código',
      mine_name: row.mine_name || ctx.mine_name || null,
      sector_name: row.sector_name || ctx.sector_name || null,
      last_evidence_date: row.last_evidence_date || null,
      has_topography: false,
      has_survey: false,
      topography_evidence_rows: 0,
      survey_evidence_rows: 0,
      topography_source_refs: null,
      survey_source_refs: null,
      drilled_depth_m: asNumber(ctx.drilled_depth_m),
      positive_visual_span_count: Number(ctx.positive_visual_span_count || 0),
      structure_span_count: Number(ctx.structure_span_count || 0),
      lithology_span_count: Number(ctx.lithology_span_count || 0),
      effective_priority_rank: asNumber(ctx.effective_priority_rank),
      effective_attention_reason: ctx.effective_attention_reason || null,
    };
    candidates.set(row.drill_hole_id, candidate);
    return candidate;
  };

  for (const row of topography.data || []) {
    const candidate = ensure(row);
    if (!candidate) continue;
    candidate.has_topography = true;
    candidate.topography_evidence_rows = Number(row.topography_evidence_rows || 0);
    candidate.topography_source_refs = row.source_refs || null;
    candidate.last_evidence_date = latestDate(candidate.last_evidence_date, row.last_evidence_date);
  }

  for (const row of survey.data || []) {
    const candidate = ensure(row);
    if (!candidate) continue;
    candidate.has_survey = true;
    candidate.survey_evidence_rows = Number(row.survey_evidence_rows || 0);
    candidate.survey_source_refs = row.source_refs || null;
    candidate.last_evidence_date = latestDate(candidate.last_evidence_date, row.last_evidence_date);
  }

  const currentRows = [...candidates.values()]
    .filter((row) => row.last_evidence_date?.startsWith(`${currentYear}-`))
    .sort((a, b) => {
      const sourceClassA = a.has_topography && a.has_survey ? 0 : a.has_topography ? 1 : 2;
      const sourceClassB = b.has_topography && b.has_survey ? 0 : b.has_topography ? 1 : 2;
      if (sourceClassA !== sourceClassB) return sourceClassA - sourceClassB;
      const dateDifference = String(b.last_evidence_date || '').localeCompare(String(a.last_evidence_date || ''));
      if (dateDifference !== 0) return dateDifference;
      const priorityA = a.effective_priority_rank ?? 99;
      const priorityB = b.effective_priority_rank ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      const evidenceDifference = evidenceLoad(b) - evidenceLoad(a);
      if (evidenceDifference !== 0) return evidenceDifference;
      return Number(b.drilled_depth_m || 0) - Number(a.drilled_depth_m || 0);
    });

  const qualityRows = quality.data || [];
  const missingAzimuth = qualityRows.filter((row: any) => row.missing_azimuth).length;
  const missingDip = qualityRows.filter((row: any) => row.missing_dip).length;
  const dipOnly = qualityRows.filter((row: any) => !row.missing_dip && row.missing_azimuth).length;
  const completeOrientation = qualityRows.filter((row: any) => !row.missing_dip && !row.missing_azimuth).length;

  return {
    year: currentYear,
    semantics: 'Prioriza recuperación documental del año vigente por superposición de fuentes, recencia y cantidad de evidencia operacional que queda limitada por la brecha. No representa probabilidad geológica, calidad de target, ley ni recomendación de perforación.',
    source_policy: 'Una mención de Topografía o survey sólo localiza una fuente candidata. Coordenadas, CRS, azimut y estaciones downhole requieren el archivo o exportación numérica original y validación humana antes de materializarse.',
    summary: {
      current_candidate_holes: currentRows.length,
      both_sources: currentRows.filter((row) => row.has_topography && row.has_survey).length,
      topography_only: currentRows.filter((row) => row.has_topography && !row.has_survey).length,
      survey_only: currentRows.filter((row) => row.has_survey && !row.has_topography).length,
      missing_azimuth: missingAzimuth,
      missing_dip: missingDip,
      dip_only: dipOnly,
      complete_orientation: completeOrientation,
    },
    rows: currentRows.map((row, index) => ({
      rank: index + 1,
      ...row,
      evidence_load: evidenceLoad(row),
      recovery_scope: row.has_topography && row.has_survey
        ? 'collar_and_survey'
        : row.has_topography
          ? 'collar_geometry'
          : 'drill_orientation',
      rank_basis: row.has_topography && row.has_survey
        ? 'El mismo sondaje tiene pistas de Topografía y survey; recuperar la fuente original puede cerrar dos brechas documentales.'
        : row.has_topography
          ? 'Existe intervención topográfica explícita y falta collar canónico; recuperar el levantamiento habilita lectura espacial.'
          : 'Existe medición/desviación declarada y falta orientación numérica estructurada; recuperar estaciones habilita trayectoria.',
    })),
  };
}
