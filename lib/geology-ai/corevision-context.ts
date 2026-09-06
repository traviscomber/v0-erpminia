type SupabaseLike = any;

type CoreVisionContextArgs = {
  supabase: SupabaseLike;
  organizationId: string;
};

const VALIDATED_LIMIT = 24;
const DISCOVERY_LIMIT = 18;

export async function buildCoreVisionAssistantContext({ supabase, organizationId }: CoreVisionContextArgs) {
  const [{ data: reviews }, { data: images }, { data: analyses }] = await Promise.all([
    supabase
      .from('production_geology_core_image_reviews')
      .select('id,core_image_id,analysis_id,decision,canonical_labels,geologist_comment,reviewed_at')
      .eq('organization_id', organizationId)
      .order('reviewed_at', { ascending: false })
      .limit(VALIDATED_LIMIT * 2),
    supabase
      .from('production_geology_core_images')
      .select('id,hole_code,from_m,to_m,status,captured_at,illumination_profile,scale_present,depth_label_visible,focus_confirmed,uniform_light_confirmed')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('production_geology_core_image_analyses')
      .select('id,core_image_id,analysis_version,visual_observations,analogs,evidence_for,evidence_against,missing_evidence,suggested_interpretation,visual_similarity_score,classification_confidence,created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(120),
  ]);

  const imageById = new Map((images || []).map((row: any) => [row.id, row]));
  const analysisById = new Map((analyses || []).map((row: any) => [row.id, row]));
  const latestAnalysisByImage = new Map<string, any>();
  for (const row of analyses || []) {
    if (!latestAnalysisByImage.has(row.core_image_id)) latestAnalysisByImage.set(row.core_image_id, row);
  }

  const latestReviewByImage = new Map<string, any>();
  for (const row of reviews || []) {
    if (!latestReviewByImage.has(row.core_image_id)) latestReviewByImage.set(row.core_image_id, row);
  }

  const validated = (reviews || [])
    .filter((review: any) => ['validated', 'edited'].includes(String(review.decision)))
    .map((review: any) => {
      const image: any = imageById.get(review.core_image_id);
      if (!image || image.status !== 'validated') return null;
      const analysis: any = (review.analysis_id && analysisById.get(review.analysis_id)) || latestAnalysisByImage.get(review.core_image_id) || null;
      return {
        core_image_id: review.core_image_id,
        hole_code: image.hole_code || null,
        interval: image.from_m == null && image.to_m == null ? null : `${image.from_m ?? '?'}-${image.to_m ?? '?'} m`,
        human_status: review.decision,
        canonical_labels: review.canonical_labels || {},
        geologist_comment: review.geologist_comment || null,
        reviewed_at: review.reviewed_at,
        ai_observation_at_review: analysis ? {
          visual_observations: analysis.visual_observations || {},
          suggested_interpretation: analysis.suggested_interpretation || null,
          evidence_for: analysis.evidence_for || [],
          evidence_against: analysis.evidence_against || [],
          missing_evidence: analysis.missing_evidence || [],
          classification_confidence: analysis.classification_confidence ?? null,
        } : null,
      };
    })
    .filter(Boolean)
    .slice(0, VALIDATED_LIMIT);

  const discovery = (images || [])
    .filter((image: any) => image.status !== 'validated' && image.status !== 'rejected')
    .map((image: any) => {
      const analysis = latestAnalysisByImage.get(image.id);
      const review = latestReviewByImage.get(image.id);
      if (!analysis || review?.decision === 'validated' || review?.decision === 'edited') return null;
      return {
        core_image_id: image.id,
        hole_code: image.hole_code || null,
        interval: image.from_m == null && image.to_m == null ? null : `${image.from_m ?? '?'}-${image.to_m ?? '?'} m`,
        workflow_status: image.status,
        visual_observations: analysis.visual_observations || {},
        analogs: analysis.analogs || [],
        evidence_for: analysis.evidence_for || [],
        evidence_against: analysis.evidence_against || [],
        missing_evidence: analysis.missing_evidence || [],
        suggested_interpretation: analysis.suggested_interpretation || null,
        visual_similarity_score: analysis.visual_similarity_score ?? null,
        classification_confidence: analysis.classification_confidence ?? null,
        analyzed_at: analysis.created_at,
        authority: 'discovery_candidate_pending_geologist_review',
      };
    })
    .filter(Boolean)
    .slice(0, DISCOVERY_LIMIT);

  const learningCorrections = validated
    .filter((item: any) => item.ai_observation_at_review)
    .map((item: any) => ({
      core_image_id: item.core_image_id,
      hole_code: item.hole_code,
      interval: item.interval,
      ai_suggested_interpretation: item.ai_observation_at_review?.suggested_interpretation || null,
      geologist_labels: item.canonical_labels,
      geologist_comment: item.geologist_comment,
      review_decision: item.human_status,
    }));

  return {
    version: 'corevision_assistant_context_v1',
    policy: {
      validated_visual_evidence: 'Puede usarse como evidencia visual validada por geólogo, sin convertirla por sí sola en ley, continuidad, control estructural, dominio, recurso o reserva.',
      discovery_candidates: 'Son observaciones exploratorias de IA pendientes de revisión. Sólo pueden citarse como candidatos de descubrimiento y nunca como hechos geológicos.',
      confidence: 'classification_confidence y visual_similarity_score describen confianza/similitud visual del modelo, no probabilidad geológica.',
      human_authority: 'La validación o edición del geólogo prevalece sobre la inferencia visual de IA.',
    },
    counts: {
      validated: validated.length,
      discovery_candidates: discovery.length,
      learning_corrections: learningCorrections.length,
    },
    validated_visual_evidence: validated,
    discovery_candidates: discovery,
    learning_corrections: learningCorrections,
    sources: [
      'production_geology_core_images',
      'production_geology_core_image_analyses',
      'production_geology_core_image_reviews',
    ],
  };
}
