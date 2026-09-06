import { buildMineEvidenceReadiness } from '@/lib/geology/evidence-readiness';

type SupabaseClientLike = any;

const n = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function buildCanonicalGeologyContext(args: {
  supabase: SupabaseClientLike;
  organizationId: string;
}) {
  const { supabase, organizationId } = args;
  const currentYear = new Date().getFullYear();

  const [mines, sectors, drilling, holes, samples, results, plans, planLines, metallurgy, locationReview, immediateTasks, interpretationSignals] = await Promise.all([
    supabase.from('production_mine_sources').select('id,code,name,status').eq('organization_id', organizationId).order('name'),
    supabase.from('production_mine_sectors').select('id,mine_source_id,name,status').eq('organization_id', organizationId).order('name'),
    supabase.from('production_drilling_source_reports')
      .select('operation_date,hole_code_raw,mine_raw,sector_raw,drilled_meters,reconciliation_status,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id')
      .eq('organization_id', organizationId)
      .order('operation_date', { ascending: false })
      .order('source_row', { ascending: false })
      .limit(500),
    supabase.from('production_drill_holes')
      .select('id,hole_code,mine_source_id,mine_sector_id,drilled_depth_m,collar_easting,collar_northing,azimuth_deg,dip_deg,start_at,completed_at,status,geological_purpose,operational_purpose,source_reference')
      .eq('organization_id', organizationId)
      .order('start_at', { ascending: false, nullsFirst: false })
      .limit(500),
    supabase.from('production_chemistry_samples')
      .select('id,sample_code,sample_type,sample_date,mine_source_id,mine_sector_id,drill_hole_id,depth_from_m,depth_to_m,source_file,source_sheet,validation_status')
      .eq('organization_id', organizationId)
      .order('sample_date', { ascending: false })
      .limit(300),
    supabase.from('production_chemistry_results')
      .select('sample_id,analyte_code,analyte_name,result_value,result_unit,result_date,source_file,source_sheet,validation_status')
      .eq('organization_id', organizationId)
      .order('result_date', { ascending: false })
      .limit(500),
    supabase.from('production_monthly_plans')
      .select('id,plan_code,period_start,period_end,status,target_cu_grade_pct,planned_advance_m,planned_drilling_m,total_mineral_to_plant_tons,total_waste_tons,total_movement_tons')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false })
      .limit(12),
    supabase.from('production_monthly_plan_lines')
      .select('id,plan_id,line_type,mine_name_raw,sector_raw,level_raw,section_raw,planned_tons,planned_grade_pct,planned_fine_cu,planned_advance_m,planned_drilling_m,source_reference,priority')
      .eq('organization_id', organizationId)
      .order('priority', { ascending: true })
      .limit(1000),
    supabase.from('production_metallurgy_automatic_v1')
      .select('operation_date,head_grade,source_file,source_sheet,validation_status')
      .eq('organization_id', organizationId)
      .order('operation_date', { ascending: false })
      .limit(6000),
    supabase.from('production_drill_hole_location_review_queue_v5')
      .select('drill_hole_id,hole_code,resolution_state,review_priority,operational_priority,recommended_action,proposed_mine_name,proposed_sector_name,last_report_date,report_count')
      .eq('organization_id', organizationId)
      .order('operational_priority', { ascending: true }),
    supabase.from('production_geology_immediate_tasks_2026_v1')
      .select('drill_hole_id,hole_code,orientation_state,task_priority,task_category,task_title,clarifying_question,why_it_matters,recommended_action,required_source_action,source_rows,first_evidence_date,last_evidence_date,completed_measurements,failed_or_pending_measurements,verified_setups,current_hole_numeric_candidates,excluded_next_hole_numeric_mentions,human_checkpoint,evidence_summary,audit_scope')
      .eq('organization_id', organizationId)
      .eq('is_immediate', true)
      .order('task_priority', { ascending: true })
      .order('hole_code', { ascending: true }),
    supabase.from('production_geology_interpretation_signals_v1')
      .select('drill_hole_id,hole_code,mine_name,sector_name,drilled_depth_m,interpretation_state,interpretation_guardrail,effective_priority_rank,effective_attention_reason,structured_intervals,structured_mineral_intervals,structured_structure_intervals,structured_lithology_intervals,point_observations,mineral_points,structure_points,transition_points,visual_mineral_m,explicit_no_mineral_m,structure_m,lithology_m,rock_condition_m,first_observed_at,last_observed_at')
      .eq('organization_id', organizationId)
      .order('effective_priority_rank', { ascending: true })
      .order('last_observed_at', { ascending: false, nullsFirst: false })
      .limit(500),
  ]);

  const firstError = [mines, sectors, drilling, holes, samples, results, plans, planLines, metallurgy, locationReview, immediateTasks, interpretationSignals].find((item) => item.error)?.error;
  if (firstError) throw new Error(firstError.message || 'No fue posible construir contexto canónico');

  const mineRows = mines.data || [];
  const sectorRows = sectors.data || [];
  const drillingRows = drilling.data || [];
  const holeRows = holes.data || [];
  const sampleRows = samples.data || [];
  const resultRows = results.data || [];
  const planRows = plans.data || [];
  const planLineRows = planLines.data || [];
  const metallurgyRows = metallurgy.data || [];
  const locationReviewRows = locationReview.data || [];
  const immediateTaskRows = immediateTasks.data || [];
  const interpretationRows = interpretationSignals.data || [];

  const mineById = new Map(mineRows.map((row: any) => [row.id, row.name]));
  const sectorById = new Map(sectorRows.map((row: any) => [row.id, row.name]));
  const sampleById = new Map(sampleRows.map((row: any) => [row.id, row]));

  const validMetallurgy = metallurgyRows.filter((row: any) => String(row.validation_status || '').toLowerCase() === 'valid' && row.operation_date && n(row.head_grade) != null);
  const gradeMonths = new Map<string, { sum: number; count: number; min: number; max: number; sources: Set<string> }>();
  for (const row of validMetallurgy) {
    const month = String(row.operation_date).slice(0, 7);
    const value = Number(row.head_grade);
    const current = gradeMonths.get(month) || { sum: 0, count: 0, min: value, max: value, sources: new Set<string>() };
    current.sum += value;
    current.count += 1;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    if (row.source_file) current.sources.add(row.source_file);
    gradeMonths.set(month, current);
  }

  const headGradeHistory = [...gradeMonths.entries()]
    .map(([month, value]) => ({
      month,
      records: value.count,
      avg_head_grade_pct: value.count ? value.sum / value.count : null,
      min_head_grade_pct: value.min,
      max_head_grade_pct: value.max,
      source_files: [...value.sources].sort(),
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const latestPlan = planRows[0] || null;
  const latestPlanLines = latestPlan
    ? planLineRows.filter((row: any) => row.plan_id === latestPlan.id).slice(0, 120)
    : [];

  const recentDrilling = drillingRows.slice(0, 120).map((row: any) => ({
    date: row.operation_date,
    hole: row.hole_code_raw,
    mine: row.canonical_mine_source_id ? mineById.get(row.canonical_mine_source_id) : row.mine_raw,
    sector: row.canonical_mine_sector_id ? sectorById.get(row.canonical_mine_sector_id) : row.sector_raw,
    drilled_m: n(row.drilled_meters),
    reconciliation_status: row.reconciliation_status,
    canonical_hole_linked: Boolean(row.canonical_drill_hole_id),
  }));

  const recentAssays = resultRows.slice(0, 120).map((row: any) => {
    const sample = sampleById.get(row.sample_id) as any;
    return {
      sample_code: sample?.sample_code || null,
      sample_date: sample?.sample_date || row.result_date || null,
      mine: sample?.mine_source_id ? mineById.get(sample.mine_source_id) : null,
      sector: sample?.mine_sector_id ? sectorById.get(sample.mine_sector_id) : null,
      drill_hole_id: sample?.drill_hole_id || null,
      depth_from_m: sample?.depth_from_m ?? null,
      depth_to_m: sample?.depth_to_m ?? null,
      analyte: row.analyte_name || row.analyte_code,
      value: n(row.result_value),
      unit: row.result_unit,
      validation_status: row.validation_status,
      source_file: row.source_file || sample?.source_file || null,
      source_sheet: row.source_sheet || sample?.source_sheet || null,
    };
  });

  const locatedHoles = holeRows.filter((row: any) => row.collar_easting != null && row.collar_northing != null).length;
  const orientedHoles = holeRows.filter((row: any) => row.azimuth_deg != null && row.dip_deg != null).length;
  const geologicalPurposeHoles = holeRows.filter((row: any) => String(row.geological_purpose || '').trim()).length;
  const mineEvidenceReadiness = buildMineEvidenceReadiness(mineRows, holeRows, sampleRows);

  const currentYearHoles = holeRows.filter((row: any) => {
    if (!row.start_at) return false;
    const date = new Date(row.start_at);
    return Number.isFinite(date.getTime()) && date.getFullYear() === currentYear;
  });
  const currentYearSnapshot = {
    year: currentYear,
    holes: currentYearHoles.length,
    with_mine: currentYearHoles.filter((row: any) => Boolean(row.mine_source_id)).length,
    with_sector: currentYearHoles.filter((row: any) => Boolean(row.mine_sector_id)).length,
    with_depth: currentYearHoles.filter((row: any) => n(row.drilled_depth_m) != null).length,
    latest_start: currentYearHoles.map((row: any) => row.start_at).filter(Boolean).sort().reverse()[0] || null,
  };

  const unresolvedReview = locationReviewRows.filter((row: any) => !['resolved', 'verified', 'matched'].includes(String(row.resolution_state || '').toLowerCase()));
  const pendingReconciliation = unresolvedReview.slice(0, 120).map((row: any) => ({
    hole_code: row.hole_code,
    resolution_state: row.resolution_state,
    review_priority: row.review_priority,
    operational_priority: row.operational_priority,
    recommended_action: row.recommended_action,
    proposed_mine: row.proposed_mine_name,
    proposed_sector: row.proposed_sector_name,
    last_report_date: row.last_report_date,
    report_count: row.report_count,
  }));

  const immediateTaskSummary = immediateTaskRows.reduce((acc: Record<string, number>, row: any) => {
    const key = String(row.task_category || 'other');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const immediateGeologyTasks = immediateTaskRows.map((row: any) => ({
    hole_code: row.hole_code,
    priority: row.task_priority,
    category: row.task_category,
    title: row.task_title,
    orientation_state: row.orientation_state,
    question_to_clarify: row.clarifying_question,
    why_it_matters: row.why_it_matters,
    recommended_action: row.recommended_action,
    required_source_action: row.required_source_action,
    human_checkpoint: row.human_checkpoint,
    evidence_summary: row.evidence_summary,
    source_rows: row.source_rows,
    first_evidence_date: row.first_evidence_date,
    last_evidence_date: row.last_evidence_date,
    completed_measurements: row.completed_measurements,
    failed_or_pending_measurements: row.failed_or_pending_measurements,
    verified_setups: row.verified_setups,
    current_hole_numeric_candidates: row.current_hole_numeric_candidates,
    excluded_next_hole_numeric_mentions: row.excluded_next_hole_numeric_mentions,
    audit_scope: row.audit_scope,
  }));

  const interpretationSummary = interpretationRows.reduce((acc: Record<string, number>, row: any) => {
    const key = String(row.interpretation_state || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const interpretationByHole = interpretationRows.map((row: any) => ({
    hole_code: row.hole_code,
    mine: row.mine_name,
    sector: row.sector_name,
    drilled_depth_m: n(row.drilled_depth_m),
    interpretation_state: row.interpretation_state,
    guardrail: row.interpretation_guardrail,
    attention_reason: row.effective_attention_reason,
    structured_intervals: Number(row.structured_intervals || 0),
    structured_mineral_intervals: Number(row.structured_mineral_intervals || 0),
    structured_structure_intervals: Number(row.structured_structure_intervals || 0),
    structured_lithology_intervals: Number(row.structured_lithology_intervals || 0),
    point_observations: Number(row.point_observations || 0),
    mineral_points: Number(row.mineral_points || 0),
    structure_points: Number(row.structure_points || 0),
    transition_points: Number(row.transition_points || 0),
    visual_mineral_m: n(row.visual_mineral_m),
    explicit_no_mineral_m: n(row.explicit_no_mineral_m),
    structure_m: n(row.structure_m),
    lithology_m: n(row.lithology_m),
    rock_condition_m: n(row.rock_condition_m),
    first_observed_at: row.first_observed_at,
    last_observed_at: row.last_observed_at,
  }));

  return {
    provenance: 'La Patagua canonical only',
    chronology: 'newest_first',
    sources: [
      'production_mine_sources',
      'production_mine_sectors',
      'production_drilling_source_reports',
      'production_drill_holes',
      'production_drill_hole_location_review_queue_v5',
      'production_geology_immediate_tasks_2026_v1',
      'production_geology_orientation_recovery_queue_2026_v1',
      'production_geology_topography_source_gap_2026_v1',
      'production_geology_interpretation_signals_v1',
      'production_geology_contiguous_units_v1',
      'production_geology_point_observations_v1',
      'production_geology_transition_candidates_v1',
      'production_drill_intervals',
      'production_chemistry_samples',
      'production_chemistry_results',
      'production_monthly_plans',
      'production_monthly_plan_lines',
      'production_metallurgy_automatic_v1',
    ],
    current: {
      year_snapshot: currentYearSnapshot,
      latest_plan: latestPlan ? { ...latestPlan, lines: latestPlanLines } : null,
      latest_head_grade: headGradeHistory[0] || null,
      latest_drilling: recentDrilling[0] || null,
      mine_needing_evidence_attention: mineEvidenceReadiness[0] || null,
      pending_reconciliation_count: unresolvedReview.length,
      top_pending_reconciliation: pendingReconciliation.slice(0, 10),
      immediate_geology_task_count: immediateTaskRows.length,
      immediate_geology_tasks_by_category: immediateTaskSummary,
      top_immediate_geology_tasks: immediateGeologyTasks.slice(0, 10),
      interpretation_state_counts: interpretationSummary,
      top_interpretation_attention: interpretationByHole.filter((row: any) => row.interpretation_state === 'blocked' || row.interpretation_state === 'partial_evidence').slice(0, 20),
    },
    immediate_geology_tasks_2026: immediateGeologyTasks,
    interpretation_signals: interpretationByHole,
    coverage: {
      mines: mineRows.map((row: any) => ({ id: row.id, code: row.code, name: row.name, status: row.status })),
      sectors: sectorRows.map((row: any) => ({ id: row.id, mine_source_id: row.mine_source_id, name: row.name, status: row.status })),
      holes: holeRows.length,
      located_holes: locatedHoles,
      oriented_holes: orientedHoles,
      geological_purpose_holes: geologicalPurposeHoles,
      samples: sampleRows.length,
      assay_results: resultRows.length,
      unresolved_reconciliation: unresolvedReview.length,
      note: 'Los conteos están limitados por las ventanas consultadas cuando corresponda; las colas e interpretación se consultan completas dentro del universo disponible.',
    },
    mine_evidence_readiness: mineEvidenceReadiness.map((row) => ({
      mine_id: row.id,
      mine: row.name,
      code: row.code,
      holes: row.holes,
      located_holes: row.located,
      oriented_holes: row.oriented,
      purpose_holes: row.purpose,
      linked_samples: row.linkedSamples,
      located_pct: row.locatedPct,
      oriented_pct: row.orientedPct,
      purpose_pct: row.purposePct,
      structural_readiness_pct: row.readiness,
      primary_gap: row.primaryGap,
      interpretation: 'Deterministic evidence coverage only; not a resource classification, grade estimate, or geological model.',
    })),
    pending_reconciliation: pendingReconciliation,
    head_grade_history_recent: headGradeHistory.slice(0, 36),
    recent_drilling: recentDrilling,
    recent_assays: recentAssays,
    recent_holes: holeRows.slice(0, 120).map((row: any) => ({
      hole_code: row.hole_code,
      mine: row.mine_source_id ? mineById.get(row.mine_source_id) : null,
      sector: row.mine_sector_id ? sectorById.get(row.mine_sector_id) : null,
      drilled_depth_m: n(row.drilled_depth_m),
      collar_easting: n(row.collar_easting),
      collar_northing: n(row.collar_northing),
      azimuth_deg: n(row.azimuth_deg),
      dip_deg: n(row.dip_deg),
      start_at: row.start_at,
      completed_at: row.completed_at,
      status: row.status,
      geological_purpose: row.geological_purpose,
      operational_purpose: row.operational_purpose,
      source_reference: row.source_reference,
    })),
    evidence_gaps: {
      detailed_geological_intervals: 'Los intervalos estructurados son evidencia positiva sólo donde existen; no inventar logging entre intervalos.',
      semantics: 'Ley cabeza, ley plan/ingeniería, ley geológica y ensayes son conceptos separados.',
      mine_readiness: 'La preparación por mina usa exactamente collar + orientación + propósito geológico; las muestras vinculadas se reportan aparte y no alteran el score.',
      source_inclination: 'inclination_raw puede existir en reportes fuente, pero no se convierte automáticamente a dip_deg sin regla validada de La Patagua.',
      orientation_2026: 'Las tareas inmediatas distinguen medición fallida, número con convención pendiente, resultado topográfico externo faltante, setup verificado sin valores y orientación parcial. Los sondajes sin fuente primaria de orientación quedan como backlog de evidencia.',
      interpretation: 'production_geology_interpretation_signals_v1 consolida señales canónicas y operacionales. Sus metros de mineralización visual, ausencia, estructura, litología y condición de roca no son recursos, leyes, contactos ni dominios geológicos formales.',
    },
  };
}
