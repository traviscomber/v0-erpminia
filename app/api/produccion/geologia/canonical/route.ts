export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [holes, queue] = await Promise.all([
    context.supabase
      .from('production_geology_hole_context_v1')
      .select([
        'drill_hole_id',
        'hole_code',
        'mine_name',
        'sector_name',
        'status',
        'drilled_depth_m',
        'orientation_confidence',
        'interval_count',
        'mineralization_interval_count',
        'structural_interval_count',
        'point_observation_count',
        'mineral_point_count',
        'structure_point_count',
        'transition_count',
        'daily_span_count',
        'positive_visual_span_count',
        'negative_visual_span_count',
        'structure_span_count',
        'lithology_span_count',
        'rock_condition_span_count',
        'topography_evidence_count',
        'survey_evidence_count',
        'severe_chronology_count',
        'material_chronology_count',
        'mineralization_conflict_count',
        'effective_priority_rank',
        'effective_attention_reason',
        'ai_grounding_state',
        'source_reference',
      ].join(','))
      .eq('organization_id', context.organizationId)
      .order('effective_priority_rank', { ascending: true })
      .order('hole_code', { ascending: true }),
    context.supabase
      .from('production_geology_geologist_queue_v3')
      .select('drill_hole_id,hole_code,mine_name,sector_name,drilled_depth_m,effective_priority_rank,effective_attention_reason,mineralization_conflict_count,severe_chronology_count,material_chronology_count,topography_evidence_count,survey_evidence_count,visual_mineral_evidence_count,structural_evidence_count,lithology_evidence_count,interval_count')
      .eq('organization_id', context.organizationId)
      .order('effective_priority_rank', { ascending: true })
      .order('hole_code', { ascending: true }),
  ]);

  const error = holes.error || queue.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const holeRows = holes.data || [];
  const queueRows = queue.data || [];
  const stateCounts = holeRows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.ai_grounding_state || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const summary = {
    holes: holeRows.length,
    structuredIntervals: holeRows.reduce((sum, row) => sum + Number(row.interval_count || 0), 0),
    pointObservations: holeRows.reduce((sum, row) => sum + Number(row.point_observation_count || 0), 0),
    transitions: holeRows.reduce((sum, row) => sum + Number(row.transition_count || 0), 0),
    dailySpans: holeRows.reduce((sum, row) => sum + Number(row.daily_span_count || 0), 0),
    blocked: stateCounts.blocked_reconciliation || 0,
    reviewRequired: stateCounts.review_required || 0,
    geometryGaps: stateCounts.usable_with_geometry_gaps || 0,
    operationalReady: stateCounts.operational_geology_available || 0,
    insufficientEvidence: stateCounts.insufficient_geology_evidence || 0,
    topographyPending: holeRows.filter((row) => Number(row.topography_evidence_count || 0) > 0).length,
    surveyPending: holeRows.filter((row) => Number(row.survey_evidence_count || 0) > 0).length,
    severeChronology: holeRows.filter((row) => Number(row.severe_chronology_count || 0) > 0).length,
    mineralizationConflicts: holeRows.filter((row) => Number(row.mineralization_conflict_count || 0) > 0).length,
  };

  return NextResponse.json({
    canWrite: access.canWrite,
    summary,
    holes: holeRows,
    queue: queueRows,
  });
}
