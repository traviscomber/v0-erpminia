create or replace view public.production_geology_hole_context_v2
with (security_invoker = true)
as
with chronology as (
  select drill_hole_id,
    count(*) filter (where reconciliation_state='blocked')::bigint as severe_chronology_count,
    count(*) filter (where reconciliation_state='review_required')::bigint as material_chronology_count
  from public.production_geology_reconciliation_cases_v1
  group by drill_hole_id
), base as (
  select h.*,
    coalesce(c.severe_chronology_count,0::bigint) as reconciled_severe,
    coalesce(c.material_chronology_count,0::bigint) as reconciled_material
  from public.production_geology_hole_context_v1 h
  left join chronology c on c.drill_hole_id=h.drill_hole_id
)
select
  organization_id,drill_hole_id,hole_code,mine_name,sector_name,status,drilled_depth_m,orientation_confidence,
  interval_count,mineralization_interval_count,structural_interval_count,point_observation_count,mineral_point_count,
  structure_point_count,transition_count,daily_span_count,positive_visual_span_count,negative_visual_span_count,
  structure_span_count,lithology_span_count,rock_condition_span_count,first_span_date,last_span_date,
  topography_evidence_count,survey_evidence_count,
  reconciled_severe as severe_chronology_count,
  reconciled_material as material_chronology_count,
  mineralization_conflict_count,
  case when mineralization_conflict_count>0 or reconciled_severe>0 then 0 when reconciled_material>0 then 1 when topography_evidence_count>0 then 1 when survey_evidence_count>0 then 2 else 5 end as effective_priority_rank,
  case
    when mineralization_conflict_count>0 then 'Reconciliar conflicto de mineralizacion antes de interpretar.'
    when reconciled_severe>0 then 'Reconciliar retroceso severo de metraje/codigo fuente antes de interpretar continuidad geologica.'
    when reconciled_material>0 then 'Revisar continuidad de metraje fuente antes de consolidar interpretacion.'
    when topography_evidence_count>0 then 'Existe evidencia topografica pero falta collar canonico.'
    when survey_evidence_count>0 then 'Existe evidencia de survey/desviacion; falta estructurar estaciones numericas si aparecen en la fuente.'
    when interval_count>0 or point_observation_count>0 or daily_span_count>0 then 'Geologia operacional disponible; revisar solo excepciones y nueva evidencia.'
    else 'Revisar brechas deterministicas y completar contexto canonico.'
  end as effective_attention_reason,
  case
    when mineralization_conflict_count>0 or reconciled_severe>0 then 'blocked_reconciliation'
    when reconciled_material>0 then 'review_required'
    when topography_evidence_count>0 or survey_evidence_count>0 then 'usable_with_geometry_gaps'
    when interval_count>0 or point_observation_count>0 or daily_span_count>0 then 'operational_geology_available'
    else 'insufficient_geology_evidence'
  end as ai_grounding_state,
  source_reference
from base;

revoke all on public.production_geology_hole_context_v2 from anon;
revoke all on public.production_geology_hole_context_v2 from authenticated;
revoke all on public.production_geology_hole_context_v2 from service_role;
grant select on public.production_geology_hole_context_v2 to authenticated;
grant select on public.production_geology_hole_context_v2 to service_role;
