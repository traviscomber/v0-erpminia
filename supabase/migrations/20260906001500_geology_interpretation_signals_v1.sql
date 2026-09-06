create or replace view public.production_geology_interpretation_signals_v1
with (security_invoker = true)
as
with units as (
  select organization_id, drill_hole_id,
    sum(length_m) filter (where evidence_class='operational_visual_span') as visual_mineral_m,
    sum(length_m) filter (where evidence_class='operational_negative_span') as explicit_no_mineral_m,
    sum(length_m) filter (where evidence_class='operational_structure_span') as structure_m,
    sum(length_m) filter (where evidence_class='operational_lithology_span') as lithology_m,
    sum(length_m) filter (where evidence_class='operational_rock_condition_span') as rock_condition_m,
    count(*) filter (where evidence_class='operational_visual_span') as visual_units,
    count(*) filter (where evidence_class='operational_negative_span') as negative_units,
    count(*) filter (where evidence_class='operational_structure_span') as structure_units,
    count(*) filter (where evidence_class='operational_lithology_span') as lithology_units,
    count(*) filter (where evidence_class='operational_rock_condition_span') as rock_condition_units,
    min(first_observed_at) as first_observed_at,
    max(last_observed_at) as last_observed_at
  from public.production_geology_contiguous_units_v1
  group by organization_id, drill_hole_id
), intervals as (
  select organization_id, drill_hole_id,
    count(*) as structured_intervals,
    count(*) filter (where nullif(trim(mineralization),'') is not null) as structured_mineral_intervals,
    count(*) filter (where operational_result ~* '(falla|fractur)') as structured_structure_intervals,
    count(*) filter (where nullif(trim(lithology),'') is not null) as structured_lithology_intervals
  from public.production_drill_intervals
  group by organization_id, drill_hole_id
), points as (
  select organization_id, drill_hole_id,
    count(*) as point_observations,
    count(*) filter (where observation_type='mineralization') as mineral_points,
    count(*) filter (where observation_type='structure') as structure_points
  from public.production_geology_point_observations_v1
  group by organization_id, drill_hole_id
), transitions as (
  select organization_id, drill_hole_id, count(*) as transition_points
  from public.production_geology_transition_candidates_v1
  group by organization_id, drill_hole_id
)
select h.organization_id, h.drill_hole_id, h.hole_code, h.mine_name, h.sector_name, h.drilled_depth_m,
  h.ai_grounding_state, h.effective_priority_rank, h.effective_attention_reason,
  coalesce(i.structured_intervals,0) as structured_intervals,
  coalesce(i.structured_mineral_intervals,0) as structured_mineral_intervals,
  coalesce(i.structured_structure_intervals,0) as structured_structure_intervals,
  coalesce(i.structured_lithology_intervals,0) as structured_lithology_intervals,
  coalesce(p.point_observations,0) as point_observations,
  coalesce(p.mineral_points,0) as mineral_points,
  coalesce(p.structure_points,0) as structure_points,
  coalesce(t.transition_points,0) as transition_points,
  coalesce(u.visual_mineral_m,0) as visual_mineral_m,
  coalesce(u.explicit_no_mineral_m,0) as explicit_no_mineral_m,
  coalesce(u.structure_m,0) as structure_m,
  coalesce(u.lithology_m,0) as lithology_m,
  coalesce(u.rock_condition_m,0) as rock_condition_m,
  coalesce(u.visual_units,0) as visual_units,
  coalesce(u.negative_units,0) as negative_units,
  coalesce(u.structure_units,0) as structure_units,
  coalesce(u.lithology_units,0) as lithology_units,
  coalesce(u.rock_condition_units,0) as rock_condition_units,
  u.first_observed_at, u.last_observed_at,
  case
    when h.ai_grounding_state='blocked_reconciliation' then 'blocked'
    when coalesce(i.structured_intervals,0) > 0 then 'structured_evidence'
    when coalesce(p.point_observations,0) > 0 or coalesce(t.transition_points,0) > 0 then 'partial_evidence'
    when coalesce(u.visual_units,0)+coalesce(u.negative_units,0)+coalesce(u.structure_units,0)+coalesce(u.lithology_units,0)+coalesce(u.rock_condition_units,0) > 0 then 'operational_evidence'
    else 'insufficient_evidence'
  end as interpretation_state,
  case
    when h.ai_grounding_state='blocked_reconciliation' then 'No interpretar continuidad hasta resolver reconciliación canónica.'
    when coalesce(i.structured_intervals,0) > 0 then 'Existe evidencia estructurada para lectura técnica, manteniendo separadas observación operacional e interpretación.'
    when coalesce(p.point_observations,0) > 0 or coalesce(t.transition_points,0) > 0 then 'Existen puntos/transiciones explícitos, pero la columna geológica sigue incompleta.'
    when coalesce(u.visual_units,0)+coalesce(u.negative_units,0)+coalesce(u.structure_units,0)+coalesce(u.lithology_units,0)+coalesce(u.rock_condition_units,0) > 0 then 'Existe evidencia operacional continua; sirve para priorizar revisión, no para reemplazar logging geológico formal.'
    else 'No existe evidencia suficiente para una interpretación técnica responsable.'
  end as interpretation_guardrail
from public.production_geology_hole_context_v2 h
left join units u on u.organization_id=h.organization_id and u.drill_hole_id=h.drill_hole_id
left join intervals i on i.organization_id=h.organization_id and i.drill_hole_id=h.drill_hole_id
left join points p on p.organization_id=h.organization_id and p.drill_hole_id=h.drill_hole_id
left join transitions t on t.organization_id=h.organization_id and t.drill_hole_id=h.drill_hole_id;

revoke all on public.production_geology_interpretation_signals_v1 from anon;
grant select on public.production_geology_interpretation_signals_v1 to authenticated;
grant select on public.production_geology_interpretation_signals_v1 to service_role;
