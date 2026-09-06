export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type CanonicalHoleRow = {
  drill_hole_id: string; hole_code: string; mine_name: string | null; sector_name: string | null; status: string | null;
  drilled_depth_m: number | null; orientation_confidence: string | null; interval_count: number | null;
  mineralization_interval_count: number | null; structural_interval_count: number | null; point_observation_count: number | null;
  mineral_point_count: number | null; structure_point_count: number | null; transition_count: number | null; daily_span_count: number | null;
  positive_visual_span_count: number | null; negative_visual_span_count: number | null; structure_span_count: number | null;
  lithology_span_count: number | null; rock_condition_span_count: number | null; topography_evidence_count: number | null;
  survey_evidence_count: number | null; severe_chronology_count: number | null; material_chronology_count: number | null;
  mineralization_conflict_count: number | null; effective_priority_rank: number | null; effective_attention_reason: string | null;
  ai_grounding_state: string | null; source_reference: string | null;
};

type ReconciliationCase = {
  drill_hole_id: string; hole_code: string; source_report_id: string; operation_date: string | null; source_row: number | null;
  hole_code_raw: string | null; shift_code_raw: string | null; meter_initial: number | null; meter_final: number | null;
  drilled_meters: number | null; prev_drilling_meter_final: number | null; continuity_delta_m: number | null; chronology_state: string;
  meter_quality_status: string | null; drilling_observations: string | null; machine_observations: string | null;
  reconciliation_state: string; required_action: string; source_reference: string;
};

type CampaignCandidate = {
  drill_hole_id: string; hole_code: string; source_report_id: string; operation_date: string | null; source_row: number | null;
  hole_code_raw: string | null; meter_initial: number | null; meter_final: number | null; drilled_meters: number | null;
  prior_max_m: number | null; prior_last_date: string | null; gap_days: number | null; setup_source_row: number | null;
  setup_evidence_text: string | null; evidence_text: string | null; split_evidence_class: string; review_state: string; required_action: string;
};

type ImmediateTask = {
  drill_hole_id: string; hole_code: string; orientation_state: string; task_priority: number; task_category: string;
  task_title: string; clarifying_question: string; why_it_matters: string; recommended_action: string; required_source_action: string;
  source_rows: number[] | null; source_report_ids: string[] | null; first_evidence_date: string | null; last_evidence_date: string | null;
  completed_measurements: number; failed_or_pending_measurements: number; verified_setups: number; current_hole_numeric_candidates: number;
  excluded_next_hole_numeric_mentions: number; task_state: string; is_immediate: boolean; human_checkpoint: string; evidence_summary: string; audit_scope: string;
};

function recalculateHoleStates(holes: CanonicalHoleRow[], cases: ReconciliationCase[]) {
  const chronology = new Map<string, { severe: number; material: number }>();
  for (const item of cases) {
    const current = chronology.get(item.drill_hole_id) || { severe: 0, material: 0 };
    if (item.reconciliation_state === 'blocked') current.severe += 1;
    if (item.reconciliation_state === 'review_required') current.material += 1;
    chronology.set(item.drill_hole_id, current);
  }

  return holes.map((row) => {
    const counts = chronology.get(row.drill_hole_id) || { severe: 0, material: 0 };
    const mineralConflict = Number(row.mineralization_conflict_count || 0) > 0;
    const hasGeometryGap = Number(row.topography_evidence_count || 0) > 0 || Number(row.survey_evidence_count || 0) > 0;
    const hasOperationalEvidence = Number(row.interval_count || 0) > 0 || Number(row.point_observation_count || 0) > 0 || Number(row.daily_span_count || 0) > 0;

    let aiGroundingState = 'insufficient_geology_evidence';
    let priority = 5;
    let reason = 'Revisar brechas deterministicas y completar contexto canonico.';

    if (mineralConflict) {
      aiGroundingState = 'blocked_reconciliation'; priority = 0;
      reason = 'Reconciliar conflicto de mineralizacion y cronologia de metraje antes de interpretar.';
    } else if (counts.severe > 0) {
      aiGroundingState = 'blocked_reconciliation'; priority = 0;
      reason = 'Reconciliar retroceso severo de metraje/codigo fuente antes de interpretar continuidad geologica.';
    } else if (counts.material > 0) {
      aiGroundingState = 'review_required'; priority = 1;
      reason = 'Revisar continuidad de metraje fuente antes de consolidar interpretacion.';
    } else if (hasGeometryGap) {
      aiGroundingState = 'usable_with_geometry_gaps'; priority = Number(row.topography_evidence_count || 0) > 0 ? 1 : 2;
      reason = Number(row.topography_evidence_count || 0) > 0
        ? 'Existe evidencia topografica pero falta collar canonico.'
        : 'Existe evidencia de survey/desviacion; falta estructurar estaciones numericas si aparecen en la fuente.';
    } else if (hasOperationalEvidence) {
      aiGroundingState = 'operational_geology_available'; priority = 5;
      reason = 'Geologia operacional disponible; revisar solo excepciones y nueva evidencia.';
    }

    return { ...row, severe_chronology_count: counts.severe, material_chronology_count: counts.material,
      effective_priority_rank: priority, effective_attention_reason: reason, ai_grounding_state: aiGroundingState };
  }).sort((a, b) => Number(a.effective_priority_rank || 5) - Number(b.effective_priority_rank || 5) || a.hole_code.localeCompare(b.hole_code));
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [holes, reconciliation, campaigns, immediateTasks] = await Promise.all([
    context.supabase.from('production_geology_hole_context_v1').select([
      'drill_hole_id','hole_code','mine_name','sector_name','status','drilled_depth_m','orientation_confidence','interval_count',
      'mineralization_interval_count','structural_interval_count','point_observation_count','mineral_point_count','structure_point_count',
      'transition_count','daily_span_count','positive_visual_span_count','negative_visual_span_count','structure_span_count','lithology_span_count',
      'rock_condition_span_count','topography_evidence_count','survey_evidence_count','severe_chronology_count','material_chronology_count',
      'mineralization_conflict_count','effective_priority_rank','effective_attention_reason','ai_grounding_state','source_reference',
    ].join(',')).eq('organization_id', context.organizationId),
    context.supabase.from('production_geology_reconciliation_cases_v1')
      .select('drill_hole_id,hole_code,source_report_id,operation_date,source_row,hole_code_raw,shift_code_raw,meter_initial,meter_final,drilled_meters,prev_drilling_meter_final,continuity_delta_m,chronology_state,meter_quality_status,drilling_observations,machine_observations,reconciliation_state,required_action,source_reference')
      .eq('organization_id', context.organizationId).order('reconciliation_state', { ascending: true }).order('operation_date', { ascending: false }).order('source_row', { ascending: false }),
    context.supabase.from('production_geology_campaign_split_candidates_v1')
      .select('drill_hole_id,hole_code,source_report_id,operation_date,source_row,hole_code_raw,meter_initial,meter_final,drilled_meters,prior_max_m,prior_last_date,gap_days,setup_source_row,setup_evidence_text,evidence_text,split_evidence_class,review_state,required_action')
      .eq('organization_id', context.organizationId).order('operation_date', { ascending: false }).order('source_row', { ascending: false }),
    context.supabase.from('production_geology_immediate_tasks_2026_v1')
      .select('drill_hole_id,hole_code,orientation_state,task_priority,task_category,task_title,clarifying_question,why_it_matters,recommended_action,required_source_action,source_rows,source_report_ids,first_evidence_date,last_evidence_date,completed_measurements,failed_or_pending_measurements,verified_setups,current_hole_numeric_candidates,excluded_next_hole_numeric_mentions,task_state,is_immediate,human_checkpoint,evidence_summary,audit_scope')
      .eq('organization_id', context.organizationId)
      .eq('is_immediate', true)
      .order('task_priority', { ascending: true })
      .order('hole_code', { ascending: true }),
  ]);

  const error = holes.error || reconciliation.error || campaigns.error || immediateTasks.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reconciliationRows = (reconciliation.data || []) as unknown as ReconciliationCase[];
  const campaignRows = (campaigns.data || []) as unknown as CampaignCandidate[];
  const taskRows = (immediateTasks.data || []) as unknown as ImmediateTask[];
  const holeRows = recalculateHoleStates((holes.data || []) as unknown as CanonicalHoleRow[], reconciliationRows);
  const stateCounts = holeRows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.ai_grounding_state || 'unknown'); acc[key] = (acc[key] || 0) + 1; return acc;
  }, {});

  const summary = {
    holes: holeRows.length,
    structuredIntervals: holeRows.reduce((sum, row) => sum + Number(row.interval_count || 0), 0),
    pointObservations: holeRows.reduce((sum, row) => sum + Number(row.point_observation_count || 0), 0),
    transitions: holeRows.reduce((sum, row) => sum + Number(row.transition_count || 0), 0),
    dailySpans: holeRows.reduce((sum, row) => sum + Number(row.daily_span_count || 0), 0),
    blocked: stateCounts.blocked_reconciliation || 0, reviewRequired: stateCounts.review_required || 0,
    geometryGaps: stateCounts.usable_with_geometry_gaps || 0, operationalReady: stateCounts.operational_geology_available || 0,
    insufficientEvidence: stateCounts.insufficient_geology_evidence || 0,
    topographyPending: holeRows.filter((row) => Number(row.topography_evidence_count || 0) > 0).length,
    surveyPending: holeRows.filter((row) => Number(row.survey_evidence_count || 0) > 0).length,
    severeChronology: holeRows.filter((row) => Number(row.severe_chronology_count || 0) > 0).length,
    mineralizationConflicts: holeRows.filter((row) => Number(row.mineralization_conflict_count || 0) > 0).length,
    reconciliationCases: reconciliationRows.length,
    blockedCases: reconciliationRows.filter((row) => row.reconciliation_state === 'blocked').length,
    reviewCases: reconciliationRows.filter((row) => row.reconciliation_state === 'review_required').length,
    campaignSplitCandidates: campaignRows.length,
    immediateTasks: taskRows.length,
    immediateCritical: taskRows.filter((row) => row.task_priority === 0).length,
    immediateNumericReview: taskRows.filter((row) => row.task_priority === 1).length,
    immediateTopographyRecovery: taskRows.filter((row) => row.task_category === 'topography_recovery').length,
  };

  return NextResponse.json({ canWrite: access.canWrite, summary, holes: holeRows, queue: holeRows, reconciliation: reconciliationRows, campaigns: campaignRows, immediateTasks: taskRows });
}
