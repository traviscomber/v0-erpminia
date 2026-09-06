create or replace view public.production_geology_observed_patterns_v1
with (security_invoker = true)
as
with candidate_overlap as (
  select s.organization_id, s.drill_hole_id, s.hole_code
  from public.production_geology_interpretation_signals_v1 s
  where s.visual_mineral_m > 0 and s.structure_m > 0
), mineral_units as (
  select u.organization_id, u.drill_hole_id, u.hole_code, u.from_m, u.to_m, u.source_rows
  from public.production_geology_contiguous_units_v1 u
  join candidate_overlap c on c.organization_id=u.organization_id and c.drill_hole_id=u.drill_hole_id
  where u.mineralization_state='visual_presence'
), structural_units as (
  select u.organization_id, u.drill_hole_id, u.from_m, u.to_m, u.source_rows
  from public.production_geology_contiguous_units_v1 u
  join candidate_overlap c on c.organization_id=u.organization_id and c.drill_hole_id=u.drill_hole_id
  where cardinality(coalesce(u.structural_features,'{}'::text[]))>0
), overlap_pairs as (
  select m.organization_id,m.drill_hole_id,m.hole_code,
    greatest(m.from_m,s.from_m) as overlap_from_m,
    least(m.to_m,s.to_m) as overlap_to_m,
    greatest(0,least(m.to_m,s.to_m)-greatest(m.from_m,s.from_m)) as overlap_m,
    m.source_rows as mineral_source_rows,
    s.source_rows as structural_source_rows
  from mineral_units m
  join structural_units s on s.organization_id=m.organization_id and s.drill_hole_id=m.drill_hole_id
    and least(m.to_m,s.to_m)>greatest(m.from_m,s.from_m)
), overlap_agg as (
  select organization_id,drill_hole_id,hole_code,
    round(sum(overlap_m)::numeric,2) as overlap_m,
    min(overlap_from_m) as first_overlap_from_m,
    max(overlap_to_m) as last_overlap_to_m
  from overlap_pairs
  group by organization_id,drill_hole_id,hole_code
), overlap_sources as (
  select p.organization_id,p.drill_hole_id,
    array_agg(distinct x.row_no order by x.row_no) filter(where x.row_no is not null) as source_rows
  from overlap_pairs p
  left join lateral unnest(coalesce(p.mineral_source_rows,'{}'::integer[]) || coalesce(p.structural_source_rows,'{}'::integer[])) x(row_no) on true
  group by p.organization_id,p.drill_hole_id
), mineral_structure as (
  select a.*,s.source_rows
  from overlap_agg a
  left join overlap_sources s on s.organization_id=a.organization_id and s.drill_hole_id=a.drill_hole_id
), candidate_transition as (
  select s.organization_id,s.drill_hole_id,s.hole_code
  from public.production_geology_interpretation_signals_v1 s
  where s.transition_points>0 and s.visual_mineral_m>0
), transition_distance as (
  select t.organization_id,t.drill_hole_id,t.hole_code,t.at_depth_m,t.observed_transition,t.source_row,
    min(least(abs(t.at_depth_m-u.from_m),abs(t.at_depth_m-u.to_m),
      case when t.at_depth_m between u.from_m and u.to_m then 0::numeric else 999999::numeric end)) as distance_m
  from public.production_geology_transition_candidates_v1 t
  join candidate_transition c on c.organization_id=t.organization_id and c.drill_hole_id=t.drill_hole_id
  join public.production_geology_contiguous_units_v1 u on u.organization_id=t.organization_id and u.drill_hole_id=t.drill_hole_id and u.mineralization_state='visual_presence'
  group by t.organization_id,t.drill_hole_id,t.hole_code,t.at_depth_m,t.observed_transition,t.source_row
), transition_near_mineral as (
  select organization_id,drill_hole_id,hole_code,
    count(*) as event_count,
    min(distance_m) as nearest_distance_m,
    array_agg(at_depth_m order by at_depth_m) as transition_depths_m,
    array_agg(observed_transition order by at_depth_m) as transitions,
    array_agg(source_row order by at_depth_m) as source_rows
  from transition_distance
  where distance_m<=5
  group by organization_id,drill_hole_id,hole_code
), contrast as (
  select organization_id,drill_hole_id,hole_code,visual_mineral_m,explicit_no_mineral_m
  from public.production_geology_interpretation_signals_v1
  where visual_mineral_m>0 and explicit_no_mineral_m>0
)
select organization_id,drill_hole_id,hole_code,
  'mineral_structure_overlap'::text as pattern_type,
  'Mineralización visual y estructura se solapan en profundidad'::text as pattern_label,
  case when overlap_m>=10 then 'strong_observed_signal' else 'observed_signal' end::text as evidence_strength,
  overlap_m as evidence_value,'m'::text as evidence_unit,
  first_overlap_from_m as from_m,last_overlap_to_m as to_m,
  source_rows,
  format('Se observan %s m de solapamiento entre tramos con señal mineral visual y evidencia estructural.',overlap_m) as evidence_summary,
  '¿El solapamiento observado corresponde a un control estructural real de la mineralización o a coexistencia operacional sin relación genética?'::text as review_question,
  'Revisar logging, testigo, orientación/estructura y ensayes del mismo tramo antes de proponer control estructural.'::text as required_validation,
  'same_hole_depth_overlap'::text as pattern_scope,
  'Patrón observado; no demuestra control estructural, continuidad mineralizada, ley ni dominio geológico.'::text as guardrail
from mineral_structure where overlap_m>0
union all
select organization_id,drill_hole_id,hole_code,
  'transition_near_visual_mineralization','Transición litológica cerca de señal mineral visual',
  case when nearest_distance_m<=3 then 'strong_observed_signal' else 'observed_signal' end,
  nearest_distance_m,'m',null::numeric,null::numeric,source_rows,
  format('%s transición(es) explícita(s) aparecen a ≤5 m de un tramo con señal mineral visual; distancia mínima %s m.',event_count,nearest_distance_m),
  '¿La transición litológica observada coincide con un cambio real en la mineralización?',
  'Revisar contacto en testigo/logging y contrastar ensayes a ambos lados de la transición antes de interpretarla como control litológico.',
  'same_hole_nearby_depth','Patrón observado por proximidad; no confirma contacto geológico, cambio de ley ni relación causal.'
from transition_near_mineral
union all
select organization_id,drill_hole_id,hole_code,
  'visual_mineralization_contrast','Presencia y ausencia visual explícitas dentro del mismo sondaje',
  'observed_variability',least(visual_mineral_m,explicit_no_mineral_m),'m',null::numeric,null::numeric,null::integer[],
  format('El sondaje contiene %s m con señal visual y %s m con ausencia explícita reportada.',visual_mineral_m,explicit_no_mineral_m),
  '¿La variación visual corresponde a cambios geológicos reales, calidad de observación o diferencias de reporte?',
  'Ordenar los tramos por profundidad y contrastar logging/ensayes; no interpolar entre observaciones.',
  'same_hole_contrast','La variabilidad visual no equivale a variabilidad de ley ni define límites mineralizados.'
from contrast;

revoke all on public.production_geology_observed_patterns_v1 from anon;
grant select on public.production_geology_observed_patterns_v1 to authenticated, service_role;
comment on view public.production_geology_observed_patterns_v1 is 'Auditable observed-pattern candidates for geology review. Patterns are evidence relationships, never geological conclusions.';
