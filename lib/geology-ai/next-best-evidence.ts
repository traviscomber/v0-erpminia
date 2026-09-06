import { buildInterpretationMatrix } from '@/lib/geology-ai/interpretation-matrix';
import { classifyIntervalEvidence } from '@/lib/geology-ai/interval-evidence-classifier';

type SupabaseClientLike = any;

type RecoveryPriority = 'foundation' | 'validation' | 'support';

type EvidenceCandidate = {
  evidence: string;
  category: string;
  recovery_priority: RecoveryPriority;
  affected_patterns: number;
  affected_holes: number;
  reasons: string[];
  pattern_types: string[];
  rank_basis: string;
};

type EvidenceBucket = {
  patterns: Set<string>;
  holes: Set<string>;
  reasons: Set<string>;
  patternTypes: Set<string>;
};

type ScopeBoundary = {
  category: string;
  label: string;
  available_holes: number;
  total_holes: number;
  coverage_pct: number;
  meaning: string;
};

const SOURCE_BOUNDARY_COVERAGE_THRESHOLD = 0.10;

const classifyEvidence = (label: string): { category: string; recovery_priority: RecoveryPriority } => {
  const text = label.toLowerCase();
  if (text.includes('collar xy') || text.includes('crs')) return { category: 'collar_geometry', recovery_priority: 'foundation' };
  if (text.includes('orientación completa') || text.includes('survey downhole')) return { category: 'drill_orientation', recovery_priority: 'foundation' };
  if (text.includes('logging') || text.includes('intervalos geológicos')) return { category: 'geological_logging', recovery_priority: 'foundation' };
  if (text.includes('ensaye')) return { category: 'assays', recovery_priority: 'validation' };
  if (text.includes('estructura')) return { category: 'structural_orientation', recovery_priority: 'validation' };
  if (text.includes('contacto') || text.includes('transición')) return { category: 'contact_validation', recovery_priority: 'validation' };
  return { category: 'other_local_evidence', recovery_priority: 'support' };
};

const priorityOrder: Record<RecoveryPriority, number> = {
  foundation: 3,
  validation: 2,
  support: 1,
};

export function rankNextBestEvidence(rows: any[]): EvidenceCandidate[] {
  const byEvidence = new Map<string, EvidenceBucket>();

  rows.forEach((row: any, index: number) => {
    const patternKey = `${row.drill_hole_id}:${row.pattern_type}:${index}`;
    for (const rawEvidence of row.missing_evidence || []) {
      const evidence = String(rawEvidence).trim();
      if (!evidence) continue;
      const current = byEvidence.get(evidence) || {
        patterns: new Set<string>(),
        holes: new Set<string>(),
        reasons: new Set<string>(),
        patternTypes: new Set<string>(),
      };
      current.patterns.add(patternKey);
      if (row.drill_hole_id) current.holes.add(String(row.drill_hole_id));
      if (row.pattern_type) current.patternTypes.add(String(row.pattern_type));
      if (row.question_to_resolve) current.reasons.add(String(row.question_to_resolve));
      byEvidence.set(evidence, current);
    }
  });

  return [...byEvidence.entries()]
    .map(([evidence, value]) => {
      const classification = classifyEvidence(evidence);
      return {
        evidence,
        category: classification.category,
        recovery_priority: classification.recovery_priority,
        affected_patterns: value.patterns.size,
        affected_holes: value.holes.size,
        reasons: [...value.reasons].slice(0, 5),
        pattern_types: [...value.patternTypes],
        rank_basis: `${classification.recovery_priority} · ${value.patterns.size} patrones · ${value.holes.size} sondajes`,
      };
    })
    .sort((a, b) =>
      priorityOrder[b.recovery_priority] - priorityOrder[a.recovery_priority]
      || b.affected_patterns - a.affected_patterns
      || b.affected_holes - a.affected_holes
      || a.evidence.localeCompare(b.evidence),
    );
}

const pct = (available: number, total: number) => total > 0 ? Number(((available / total) * 100).toFixed(1)) : 0;

export async function buildNextBestEvidence(args: { supabase: SupabaseClientLike; organizationId: string }) {
  const { supabase, organizationId } = args;
  const [matrix, readiness, intervals, chemistry] = await Promise.all([
    buildInterpretationMatrix(args),
    supabase
      .from('production_geology_drill_hole_readiness_v1')
      .select('drill_hole_id,collar_easting,collar_northing,coordinate_reference,azimuth_deg,dip_deg,downhole_survey_rows')
      .eq('organization_id', organizationId),
    supabase
      .from('production_drill_intervals')
      .select('drill_hole_id,notes')
      .eq('organization_id', organizationId),
    supabase
      .from('production_chemistry_lineage_v1')
      .select('drill_hole_id')
      .eq('organization_id', organizationId),
  ]);

  const sourceError = readiness.error || intervals.error || chemistry.error;
  if (sourceError) throw new Error(sourceError.message || 'No fue posible evaluar la cobertura canónica');

  const readinessRows = readiness.data || [];
  const intervalRows = intervals.data || [];
  const chemistryRows = chemistry.data || [];
  const totalHoles = readinessRows.length;

  const completeCollarHoles = readinessRows.filter((row: any) =>
    row.collar_easting != null && row.collar_northing != null && String(row.coordinate_reference || '').trim(),
  ).length;
  const completeOrientationHoles = readinessRows.filter((row: any) => row.azimuth_deg != null && row.dip_deg != null).length;
  const formalLoggingHoles = new Set(intervalRows
    .filter((row: any) => classifyIntervalEvidence(row.notes) === 'explicit_formal_logging')
    .map((row: any) => row.drill_hole_id)
    .filter(Boolean)).size;
  const assayLinkedHoles = new Set(chemistryRows.map((row: any) => row.drill_hole_id).filter(Boolean)).size;

  const boundaries: ScopeBoundary[] = [
    {
      category: 'collar_geometry',
      label: 'Collar XY + CRS',
      available_holes: completeCollarHoles,
      total_holes: totalHoles,
      coverage_pct: pct(completeCollarHoles, totalHoles),
      meaning: 'La geometría de collar no forma parte de la fuente canónica disponible a escala suficiente. MOTIL no la convierte en una tarea masiva de recuperación.',
    },
    {
      category: 'drill_orientation',
      label: 'Orientación completa',
      available_holes: completeOrientationHoles,
      total_holes: totalHoles,
      coverage_pct: pct(completeOrientationHoles, totalHoles),
      meaning: 'Azimut + inclinación completos son excepcionales en el universo actual. Se mantiene como limitación de la fuente, no como deuda por sondaje.',
    },
    {
      category: 'geological_logging',
      label: 'Logging geológico formal',
      available_holes: formalLoggingHoles,
      total_holes: totalHoles,
      coverage_pct: pct(formalLoggingHoles, totalHoles),
      meaning: 'No existe logging formal explícitamente identificado a escala operacional. Los intervalos operacionales existentes siguen siendo evidencia distinta.',
    },
    {
      category: 'assays',
      label: 'Ensayes vinculados a sondaje',
      available_holes: assayLinkedHoles,
      total_holes: totalHoles,
      coverage_pct: pct(assayLinkedHoles, totalHoles),
      meaning: 'La química histórica sin vínculo explícito a sondaje e intervalo no se transforma en una campaña de completitud.',
    },
    {
      category: 'structural_orientation',
      label: 'Orientación estructural medida',
      available_holes: 0,
      total_holes: totalHoles,
      coverage_pct: 0,
      meaning: 'Las menciones estructurales operacionales no equivalen a mediciones orientadas; esta dimensión permanece fuera del alcance canónico actual.',
    },
    {
      category: 'contact_validation',
      label: 'Contactos validados',
      available_holes: 0,
      total_holes: totalHoles,
      coverage_pct: 0,
      meaning: 'No existe una fuente canónica estructurada suficiente para pedir validación de contactos de forma masiva.',
    },
  ];

  const sourceBoundaryCategories = new Set(boundaries
    .filter((item) => totalHoles === 0 || item.available_holes / totalHoles < SOURCE_BOUNDARY_COVERAGE_THRESHOLD)
    .map((item) => item.category));

  const rawRanked = rankNextBestEvidence(matrix.rows || []);
  const ranked = rawRanked.filter((row) => !sourceBoundaryCategories.has(row.category));

  return {
    generated_from: 'production_geology_observed_patterns_v1 + production_geology_drill_hole_readiness_v1 + production_drill_intervals + production_chemistry_lineage_v1',
    semantics: 'MOTIL trabaja con la evidencia canónica disponible. Cuando una dimensión existe en menos del 10% del universo de sondajes, se trata como límite conocido de la fuente y no como una tarea masiva de recuperación.',
    ranking_policy: 'Sólo se priorizan faltantes cuando existe cobertura canónica suficiente para que la recuperación sea una excepción accionable. La ausencia estructural o casi universal no se transforma en trabajo operativo ni en solicitud al usuario.',
    rows: ranked,
    top: ranked.slice(0, 12),
    suppressed_recovery_rows: rawRanked.length - ranked.length,
    scope_boundaries: boundaries.filter((item) => sourceBoundaryCategories.has(item.category)),
    source_boundary_threshold_pct: SOURCE_BOUNDARY_COVERAGE_THRESHOLD * 100,
    total_holes: totalHoles,
    source_pattern_count: (matrix.rows || []).length,
    regional_context_records: matrix.regional_context_records,
  };
}
