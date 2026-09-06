import { buildExternalGeologyContext } from '@/lib/geology-ai/external-context';

type SupabaseClientLike = any;

type MatrixInputs = {
  patterns: any[];
  hypotheses?: any[];
  readiness?: any[];
  externalRecords?: any[];
};

const externalTypesForPattern = (patternType: string) => {
  if (patternType === 'mineral_structure_overlap') return new Set(['district_structure', 'district_deposit_style']);
  if (patternType === 'transition_near_mineralization') return new Set(['district_lithology', 'district_alteration', 'district_deposit_style']);
  if (patternType === 'mineral_presence_absence') return new Set(['district_deposit_style', 'district_lithology']);
  return new Set(['district_structure', 'district_lithology', 'district_alteration', 'district_deposit_style']);
};

const localMissingEvidence = (ready: any, pattern: any) => {
  const missing: string[] = [];
  if (!ready) return [String(pattern.required_validation || 'Revisar evidencia local primaria antes de interpretar.')];
  if (ready.collar_easting == null || ready.collar_northing == null) missing.push('Collar XY validado');
  if (!ready.coordinate_reference) missing.push('CRS del collar');
  if (ready.azimuth_deg == null || ready.dip_deg == null) missing.push('Orientación completa del sondaje');
  if (Number(ready.canonical_interval_count || 0) === 0) missing.push('Logging/intervalos geológicos estructurados');
  if (Number(ready.downhole_survey_rows || 0) === 0) missing.push('Survey downhole numérico');
  if (pattern.pattern_type === 'mineral_structure_overlap') missing.push('Orientación local de la estructura', 'Ensayes vinculados al tramo');
  if (pattern.pattern_type === 'transition_near_mineralization') missing.push('Validación del contacto/transición', 'Ensayes a ambos lados de la transición');
  return [...new Set(missing)];
};

const nextAction = (pattern: any, missing: string[]) => {
  if (pattern.pattern_type === 'mineral_structure_overlap') {
    return 'Revisar testigo/logging del tramo, recuperar orientación estructural + survey y contrastar con ensayes antes de evaluar control estructural.';
  }
  if (pattern.pattern_type === 'transition_near_mineralization') {
    return 'Validar la transición en testigo/logging y contrastar con ensayes antes y después del contacto observado.';
  }
  return missing.length
    ? `Cerrar primero: ${missing.slice(0, 3).join(', ')}.`
    : 'Revisar evidencia primaria con el geólogo y documentar soporte o contradicción.';
};

export function buildInterpretationMatrixFromRows({ patterns, hypotheses = [], readiness = [], externalRecords = [] }: MatrixInputs) {
  const readinessByHole = new Map(readiness.map((row: any) => [row.drill_hole_id, row]));
  const hypothesesByHole = new Map<string, any[]>();
  for (const row of hypotheses) {
    const current = hypothesesByHole.get(row.drill_hole_id) || [];
    current.push(row);
    hypothesesByHole.set(row.drill_hole_id, current);
  }

  return patterns.map((pattern: any) => {
    const relevantTypes = externalTypesForPattern(String(pattern.pattern_type || ''));
    const regional = externalRecords
      .filter((row: any) => relevantTypes.has(String(row.type || row.record_type || '')))
      .map((row: any) => ({
        provider: row.provider || row.source_provider,
        dataset: row.dataset || row.source_dataset,
        type: row.type || row.record_type,
        title: row.title,
        facts: row.facts || row.properties || {},
        source_url: row.source_url,
        semantics: 'Contexto regional/distrital únicamente; no confirma la observación local.',
      }));
    const holeHypotheses = hypothesesByHole.get(pattern.drill_hole_id) || [];
    const evidenceFor = holeHypotheses.flatMap((row: any) => Array.isArray(row.evidence_for) ? row.evidence_for : []);
    const evidenceAgainst = holeHypotheses.flatMap((row: any) => Array.isArray(row.evidence_against) ? row.evidence_against : []);
    const missing = [...new Set([
      ...localMissingEvidence(readinessByHole.get(pattern.drill_hole_id), pattern),
      ...holeHypotheses.flatMap((row: any) => Array.isArray(row.missing_evidence) ? row.missing_evidence : []),
    ])];

    return {
      drill_hole_id: pattern.drill_hole_id,
      hole_code: pattern.hole_code,
      pattern_type: pattern.pattern_type,
      local_observation: pattern.evidence_summary,
      interval: pattern.from_m == null && pattern.to_m == null ? null : { from_m: pattern.from_m, to_m: pattern.to_m },
      source_rows: pattern.source_rows || [],
      evidence_strength: pattern.evidence_strength,
      regional_context: regional,
      compatibility_statement: regional.length
        ? 'La observación local es evaluable frente al contexto distrital disponible; cualquier coincidencia sólo puede describirse como compatible, no como confirmación.'
        : 'No hay contexto regional validado aplicable a este patrón.',
      evidence_for: [...new Set(evidenceFor.map(String))],
      evidence_against: [...new Set(evidenceAgainst.map(String))],
      missing_evidence: missing,
      question_to_resolve: pattern.review_question,
      next_validation_action: nextAction(pattern, missing),
      human_checkpoint: 'Geólogo responsable revisa evidencia local primaria y decide si la hipótesis gana soporte, se rechaza o requiere más datos.',
      guardrail: pattern.guardrail,
      regional_context_only: true,
      no_probability_uplift: true,
    };
  });
}

export async function buildInterpretationMatrix(args: {
  supabase: SupabaseClientLike;
  organizationId: string;
  drillHoleId?: string | null;
}) {
  const { supabase, organizationId, drillHoleId } = args;
  let patternsQuery = supabase
    .from('production_geology_observed_patterns_v1')
    .select('drill_hole_id,hole_code,pattern_type,pattern_label,evidence_strength,evidence_value,evidence_unit,from_m,to_m,source_rows,evidence_summary,review_question,required_validation,pattern_scope,guardrail')
    .eq('organization_id', organizationId)
    .order('evidence_value', { ascending: false, nullsFirst: false });
  let hypothesesQuery = supabase
    .from('production_geology_hypotheses')
    .select('drill_hole_id,state,evidence_for,evidence_against,missing_evidence,reviewer_comment,updated_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });
  let readinessQuery = supabase
    .from('production_geology_drill_hole_readiness_v1')
    .select('drill_hole_id,hole_code,collar_easting,collar_northing,coordinate_reference,azimuth_deg,dip_deg,downhole_survey_rows,canonical_interval_count,collar_state,orientation_state,geology_structuring_state')
    .eq('organization_id', organizationId);

  if (drillHoleId) {
    patternsQuery = patternsQuery.eq('drill_hole_id', drillHoleId);
    hypothesesQuery = hypothesesQuery.eq('drill_hole_id', drillHoleId);
    readinessQuery = readinessQuery.eq('drill_hole_id', drillHoleId);
  }

  const [patterns, hypotheses, readiness, external] = await Promise.all([
    patternsQuery,
    hypothesesQuery,
    readinessQuery,
    buildExternalGeologyContext({ supabase, organizationId }),
  ]);
  const error = patterns.error || hypotheses.error || readiness.error;
  if (error) throw new Error(error.message || 'No fue posible construir matriz de interpretación');

  const rows = buildInterpretationMatrixFromRows({
    patterns: patterns.data || [],
    hypotheses: hypotheses.data || [],
    readiness: readiness.data || [],
    externalRecords: external.records || [],
  });

  return {
    provenance: 'Local canonical evidence + verified regional context kept as separate authority layers',
    rows,
    regional_context_records: external.record_count,
    semantics: 'Regional compatibility never promotes a local observation to control, continuity, grade, contact, domain, resource or reserve.',
    sources: ['production_geology_observed_patterns_v1', 'production_geology_hypotheses', 'production_geology_drill_hole_readiness_v1', ...(external.sources || [])],
  };
}
