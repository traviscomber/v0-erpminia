import { buildInterpretationMatrix } from '@/lib/geology-ai/interpretation-matrix';

type SupabaseClientLike = any;

type EvidenceCandidate = {
  evidence: string;
  score: number;
  affected_patterns: number;
  affected_holes: number;
  reasons: string[];
  pattern_types: string[];
};

const evidenceWeight = (label: string) => {
  const text = label.toLowerCase();
  if (text.includes('collar xy') || text.includes('crs')) return 5;
  if (text.includes('orientación') || text.includes('survey')) return 5;
  if (text.includes('ensaye')) return 5;
  if (text.includes('logging') || text.includes('intervalos geológicos')) return 4;
  if (text.includes('contacto') || text.includes('transición')) return 4;
  return 3;
};

const patternWeight = (patternType: string) => {
  if (patternType === 'mineral_structure_overlap') return 5;
  if (patternType === 'transition_near_visual_mineralization') return 4;
  if (patternType === 'visual_mineralization_contrast') return 3;
  return 2;
};

export function rankNextBestEvidence(rows: any[]): EvidenceCandidate[] {
  const byEvidence = new Map<string, { patterns: Set<string>; holes: Set<string>; reasons: Set<string>; patternTypes: Set<string>; score: number }>();

  rows.forEach((row: any, index: number) => {
    const patternKey = `${row.drill_hole_id}:${row.pattern_type}:${index}`;
    for (const evidence of row.missing_evidence || []) {
      const key = String(evidence).trim();
      if (!key) continue;
      const current = byEvidence.get(key) || { patterns: new Set<string>(), holes: new Set<string>(), reasons: new Set<string>(), patternTypes: new Set<string>(), score: 0 };
      if (!current.patterns.has(patternKey)) {
        current.patterns.add(patternKey);
        current.score += evidenceWeight(key) * patternWeight(String(row.pattern_type || ''));
      }
      current.holes.add(String(row.drill_hole_id));
      current.patternTypes.add(String(row.pattern_type || 'unknown'));
      if (row.question_to_resolve) current.reasons.add(String(row.question_to_resolve));
      byEvidence.set(key, current);
    }
  });

  return [...byEvidence.entries()]
    .map(([evidence, value]) => ({
      evidence,
      score: value.score,
      affected_patterns: value.patterns.size,
      affected_holes: value.holes.size,
      reasons: [...value.reasons].slice(0, 5),
      pattern_types: [...value.patternTypes],
    }))
    .sort((a, b) => b.score - a.score || b.affected_holes - a.affected_holes || a.evidence.localeCompare(b.evidence));
}

export async function buildNextBestEvidence(args: { supabase: SupabaseClientLike; organizationId: string }) {
  const matrix = await buildInterpretationMatrix(args);
  const ranked = rankNextBestEvidence(matrix.rows || []);
  return {
    generated_from: 'Interpretation Matrix',
    semantics: 'Priority is a decision-support heuristic based on unresolved patterns and evidence gaps; it is not geological probability, economic value, or a drilling recommendation.',
    rows: ranked,
    top: ranked.slice(0, 12),
    source_pattern_count: (matrix.rows || []).length,
    regional_context_records: matrix.regional_context_records,
  };
}
