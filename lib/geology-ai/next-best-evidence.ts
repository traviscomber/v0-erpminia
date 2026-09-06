import { buildInterpretationMatrix } from '@/lib/geology-ai/interpretation-matrix';

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

export async function buildNextBestEvidence(args: { supabase: SupabaseClientLike; organizationId: string }) {
  const matrix = await buildInterpretationMatrix(args);
  const ranked = rankNextBestEvidence(matrix.rows || []);
  return {
    generated_from: 'production_geology_observed_patterns_v1 + production_geology_drill_hole_readiness_v1 + production_geology_hypotheses',
    semantics: 'Orden operacional para recuperar evidencia faltante. Prioriza primero evidencia fundacional y luego cobertura de patrones/sondajes. No representa probabilidad geológica, ley, valor económico, recurso/reserva ni recomendación de perforación.',
    ranking_policy: 'foundation > validation > support; dentro de cada nivel se ordena por cantidad de patrones y sondajes afectados. No se pondera un tipo de patrón como geológicamente más probable o valioso que otro.',
    rows: ranked,
    top: ranked.slice(0, 12),
    source_pattern_count: (matrix.rows || []).length,
    regional_context_records: matrix.regional_context_records,
  };
}
