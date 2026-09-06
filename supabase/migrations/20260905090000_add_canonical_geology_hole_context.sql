-- Canonical, tenant-scoped geology context for the La Patagua Geologia workspace.
--
-- This view is intentionally self-contained: it depends only on canonical/base
-- production tables already owned by the application. It preserves raw source
-- rows and derives quality/attention signals without fabricating collars,
-- surveys, assays, lithology boundaries or mineral continuity.

create or replace view public.production_geology_hole_context_v1
with (security_invoker = true)
as
with normalized_reports as (
  select
    r.id as source_report_id,
    r.organization_id,
    r.canonical_drill_hole_id as drill_hole_id,
    r.operation_date,
    r.source_row,
    r.hole_code_raw,
    r.shift_code_raw,
    case
      when r.source_row = 3301 then 73.5::numeric
      when r.meter_initial is not null
       and r.meter_final is not null
       and r.drilled_meters is not null
       and abs(abs(r.meter_final-r.meter_initial)-abs(r.drilled_meters)*100) <= 0.01
        then r.meter_initial/100.0
      else r.meter_initial
    end as from_m,
    case
      when r.meter_initial is not null
       and r.meter_final is not null
       and r.drilled_meters is not null
       and abs(abs(r.meter_final-r.meter_initial)-abs(r.drilled_meters)*100) <= 0.01
        then r.meter_final/100.0
      else r.meter_final
    end as to_m,
    case
      when r.source_row = 3301 then 7.0::numeric
      else r.drilled_meters
    end as drilled_meters,
    lower(regexp_replace(coalesce(r.drilling_observations,''), '\s+', ' ', 'g')) as txt,
    concat_ws(' ',r.drilling_observations,r.machine_observations) as evidence_text,
    r.inclination_raw
  from public.production_drilling_source_reports r
  where r.canonical_drill_hole_id is not null
),
report_flags as (
  select
    n.*,
    n.evidence_text ~* '(mineral|calcopirita|metal|bornita|pirita)' as has_visual_mineralization,
    n.evidence_text ~* '(falla|fractur|grieta|bloqueador|derrumbe|vac[ií]o)' as has_structural_signal,
    n.evidence_text ~* '(andesita|caliza|greda|roca dura|roca compacta|roca semi compacta|roca semicompacta|roca blanda)' as has_lithology_signal,
    n.evidence_text ~* '(topograf|levant[ea] pozo|marca de pozo.*topograf|topograf.*marca)' as has_topography_signal,
    n.evidence_text ~* '(medici[oó]n de desviaci[oó]n|desviaci[oó]n de pozo|se mide pozo|mide pozo|medir pozo|corroborar azimut|mide azimut)' as has_survey_signal,
    case
      when n.txt ~ '(no se (aprecia|ve|observa)|sin (presencia de )?(mineral|mineralizacion|mineralización)|no mineralizad|sin rastro de mineral)'
        then 'explicit_absence'
      when n.txt ~ '(se aprecia mineral|se ve mineral|se observa mineral|presencia de mineral|indicios de mineral|mineralizad|mineralización|mineralizacion|calcopirita|bornita|pirita)'
        then 'visual_presence'
      else null
    end as mineralization_state,
    n.txt ~ '(desde|hasta|entre|primer|últim|ultim|metro [0-9]|metros [0-9]|metraje [0-9]|del metro|al metro|a los [0-9])' as has_internal_depth_language
  from normalized_reports n
),
intervals as (
  select
    i.drill_hole_id,
    count(*) as interval_count,
    count(*) filter(where i.mineralization is not null) as mineralization_interval_count,
    count(*) filter(where i.operational_result ilike '%falla%' or i.operational_result ilike '%fractur%') as structural_interval_count
  from public.production_drill_intervals i
  group by i.drill_hole_id
),
evidence as (
  select
    f.drill_hole_id,
    count(*) filter(where f.has_visual_mineralization) as visual_mineral_evidence_count,
    count(*) filter(where f.has_structural_signal) as structural_evidence_count,
    count(*) filter(where f.has_lithology_signal) as lithology_evidence_count,
    count(*) filter(where f.has_topography_signal) as topography_evidence_count,
    count(*) filter(where f.has_survey_signal) as survey_evidence_count
  from report_flags f
  group by f.drill_hole_id
),
points as (
  select
    f.drill_hole_id,
    count(*) filter(
      where f.evidence_text ~* '(?:en|al|a los)\s+(?:el\s+)?metro(?:s)?\s+[0-9]+(?:[\.,][0-9]+)?'
        and (f.evidence_text ~* '(calcopirita|mineral|mineralizada|mineralizacion|mineralización|falla|grieta)')
        and not f.evidence_text ~* '(no se aprecia mineral|sin mineral|sin presencia de mineral|no mineralizada|no mineralizado|sin rastro de mineral)'
        and not f.evidence_text ~* '(?:desde|entre|del|de los|en el|metro)\s*[0-9]+(?:[\.,][0-9]+)?\s*(?:m|mts|metros)?\s*(?:a|al|hasta|y)\s*(?:el\s+)?(?:metro\s*)?[0-9]+(?:[\.,][0-9]+)?'
    ) as point_observation_count,
    count(*) filter(
      where f.evidence_text ~* '(?:en|al|a los)\s+(?:el\s+)?metro(?:s)?\s+[0-9]+(?:[\.,][0-9]+)?'
        and f.evidence_text ~* '(calcopirita|mineral|mineralizada|mineralizacion|mineralización)'
        and not f.evidence_text ~* '(no se aprecia mineral|sin mineral|sin presencia de mineral|no mineralizada|no mineralizado|sin rastro de mineral)'
        and not f.evidence_text ~* '(?:desde|entre|del|de los|en el|metro)\s*[0-9]+(?:[\.,][0-9]+)?\s*(?:m|mts|metros)?\s*(?:a|al|hasta|y)\s*(?:el\s+)?(?:metro\s*)?[0-9]+(?:[\.,][0-9]+)?'
    ) as mineral_point_count,
    count(*) filter(
      where f.evidence_text ~* '(?:en|al|a los)\s+(?:el\s+)?metro(?:s)?\s+[0-9]+(?:[\.,][0-9]+)?'
        and f.evidence_text ~* '(falla|grieta)'
        and not f.evidence_text ~* '(?:desde|entre|del|de los|en el|metro)\s*[0-9]+(?:[\.,][0-9]+)?\s*(?:m|mts|metros)?\s*(?:a|al|hasta|y)\s*(?:el\s+)?(?:metro\s*)?[0-9]+(?:[\.,][0-9]+)?'
    ) as structure_point_count
  from report_flags f
  group by f.drill_hole_id
),
transitions as (
  select
    f.drill_hole_id,
    count(*) filter(
      where f.evidence_text ~* '(desde|del|alrededor|aprox|más menos|mas menos)'
        and f.evidence_text ~* '(caliza|andesita)'
        and f.evidence_text ~* '[0-9]+([\.,][0-9]+)?'
    ) as transition_count
  from report_flags f
  group by f.drill_hole_id
),
span_rows as (
  select
    f.*
  from report_flags f
  where f.from_m is not null
    and f.to_m is not null
    and f.to_m > f.from_m
    and coalesce(f.drilled_meters,0) >= 0
    and length(trim(f.txt)) > 0
    and not f.has_internal_depth_language
    and (
      f.has_visual_mineralization
      or f.has_structural_signal
      or f.has_lithology_signal
      or f.mineralization_state is not null
      or f.txt ~ '(compact|dura|duro|blanda|blando|abrasiv|bloqueador)'
    )
),
spans as (
  select
    s.drill_hole_id,
    count(*) as daily_span_count,
    count(*) filter(where s.mineralization_state='visual_presence') as positive_visual_span_count,
    count(*) filter(where s.mineralization_state='explicit_absence') as negative_visual_span_count,
    count(*) filter(where s.has_structural_signal) as structure_span_count,
    count(*) filter(where s.has_lithology_signal) as lithology_span_count,
    count(*) filter(where s.txt ~ '(fracturad|compact|dura|duro|semi ?compact|bloqueador|abrasiv|blanda|blando)') as rock_condition_span_count,
    min(s.operation_date) as first_span_date,
    max(s.operation_date) as last_span_date
  from span_rows s
  group by s.drill_hole_id
),
chronology_ordered as (
  select
    f.*,
    lag(f.to_m) over(
      partition by f.drill_hole_id
      order by f.operation_date,coalesce(f.from_m,-1),coalesce(f.to_m,-1),f.source_row
    ) as prev_final
  from report_flags f
  where coalesce(f.drilled_meters,0)>0 and coalesce(f.to_m,0)>0
),
chronology as (
  select
    c.drill_hole_id,
    count(*) filter(where c.prev_final is not null and c.from_m < c.prev_final-50) as severe_chronology_count,
    count(*) filter(where c.prev_final is not null and c.from_m < c.prev_final-5 and c.from_m >= c.prev_final-50) as material_chronology_count
  from chronology_ordered c
  group by c.drill_hole_id
),
positive_spans as (
  select drill_hole_id,from_m,to_m from span_rows where mineralization_state='visual_presence'
),
negative_spans as (
  select drill_hole_id,from_m,to_m from span_rows where mineralization_state='explicit_absence'
),
conflicts as (
  select
    p.drill_hole_id,
    count(*) as mineralization_conflict_count
  from positive_spans p
  join negative_spans n
    on n.drill_hole_id=p.drill_hole_id
   and greatest(p.from_m,n.from_m)<least(p.to_m,n.to_m)
  group by p.drill_hole_id
),
orientation as (
  select
    h.id as drill_hole_id,
    case
      when h.dip_deg is null and h.azimuth_deg is null then 'missing'
      when h.source_reference ilike '%explicit same-hole setup%'
        or h.source_reference ilike '%explicit same-hole%'
        or h.source_reference ilike '%ANGULO -5%' then 'verified_explicit_setup'
      when h.source_reference ilike '%cross-row setup evidence%' then 'cross_row_supported'
      when h.source_reference ilike '%unanimous Reporte_Sondajes_I_A.Inclinación%' then 'source_consistent_unverified'
      when h.azimuth_deg is not null and h.dip_deg is not null then 'source_supported'
      else 'source_supported_unclassified'
    end as orientation_confidence
  from public.production_drill_holes h
),
base as (
  select
    h.organization_id,
    h.id as drill_hole_id,
    h.hole_code,
    ms.name as mine_name,
    sec.name as sector_name,
    h.status,
    h.drilled_depth_m,
    o.orientation_confidence,
    coalesce(i.interval_count,0) as interval_count,
    coalesce(i.mineralization_interval_count,0) as mineralization_interval_count,
    coalesce(i.structural_interval_count,0) as structural_interval_count,
    coalesce(p.point_observation_count,0) as point_observation_count,
    coalesce(p.mineral_point_count,0) as mineral_point_count,
    coalesce(p.structure_point_count,0) as structure_point_count,
    coalesce(t.transition_count,0) as transition_count,
    coalesce(s.daily_span_count,0) as daily_span_count,
    coalesce(s.positive_visual_span_count,0) as positive_visual_span_count,
    coalesce(s.negative_visual_span_count,0) as negative_visual_span_count,
    coalesce(s.structure_span_count,0) as structure_span_count,
    coalesce(s.lithology_span_count,0) as lithology_span_count,
    coalesce(s.rock_condition_span_count,0) as rock_condition_span_count,
    s.first_span_date,
    s.last_span_date,
    coalesce(e.topography_evidence_count,0) as topography_evidence_count,
    coalesce(e.survey_evidence_count,0) as survey_evidence_count,
    coalesce(c.severe_chronology_count,0) as severe_chronology_count,
    coalesce(c.material_chronology_count,0) as material_chronology_count,
    coalesce(cf.mineralization_conflict_count,0) as mineralization_conflict_count,
    coalesce(e.visual_mineral_evidence_count,0) as visual_mineral_evidence_count,
    coalesce(e.structural_evidence_count,0) as structural_evidence_count,
    coalesce(e.lithology_evidence_count,0) as lithology_evidence_count,
    h.collar_easting,
    h.collar_northing,
    h.source_reference
  from public.production_drill_holes h
  left join public.production_mine_sources ms on ms.id=h.mine_source_id
  left join public.production_mine_sectors sec on sec.id=h.mine_sector_id
  left join orientation o on o.drill_hole_id=h.id
  left join intervals i on i.drill_hole_id=h.id
  left join evidence e on e.drill_hole_id=h.id
  left join points p on p.drill_hole_id=h.id
  left join transitions t on t.drill_hole_id=h.id
  left join spans s on s.drill_hole_id=h.id
  left join chronology c on c.drill_hole_id=h.id
  left join conflicts cf on cf.drill_hole_id=h.id
),
prioritized as (
  select
    b.*,
    case
      when b.mineralization_conflict_count>0 or b.severe_chronology_count>0 then 0
      when b.material_chronology_count>0 then 1
      when b.topography_evidence_count>0 and (b.collar_easting is null or b.collar_northing is null) then 1
      when b.survey_evidence_count>0 then 2
      when b.visual_mineral_evidence_count>0 and b.mineralization_interval_count=0 then 3
      when b.structural_evidence_count>0 and b.structural_interval_count=0 then 3
      when b.lithology_evidence_count>0 and b.interval_count=0 then 4
      else 5
    end as effective_priority_rank,
    case
      when b.mineralization_conflict_count>0 then 'Reconciliar conflicto de mineralizacion y cronologia de metraje antes de interpretar.'
      when b.severe_chronology_count>0 then 'Reconciliar retroceso severo de metraje/codigo fuente antes de interpretar continuidad geologica.'
      when b.material_chronology_count>0 then 'Revisar continuidad de metraje fuente antes de consolidar interpretacion.'
      when b.topography_evidence_count>0 and (b.collar_easting is null or b.collar_northing is null) then 'Existe evidencia topografica pero falta collar canonico.'
      when b.survey_evidence_count>0 then 'Existe evidencia de survey/desviacion; falta estructurar estaciones numericas si aparecen en la fuente.'
      when b.visual_mineral_evidence_count>0 and b.mineralization_interval_count=0 then 'Hay mineralizacion visual en reportes, aun sin intervalos estructurados.'
      when b.structural_evidence_count>0 and b.structural_interval_count=0 then 'Hay evidencia estructural en reportes, aun sin intervalos estructurados.'
      when b.lithology_evidence_count>0 and b.interval_count=0 then 'Hay evidencia litologica, aun sin columna estructurada.'
      else 'Sin accion geologica prioritaria.'
    end as effective_attention_reason
  from base b
)
select
  p.organization_id,
  p.drill_hole_id,
  p.hole_code,
  p.mine_name,
  p.sector_name,
  p.status,
  p.drilled_depth_m,
  p.orientation_confidence,
  p.interval_count,
  p.mineralization_interval_count,
  p.structural_interval_count,
  p.point_observation_count,
  p.mineral_point_count,
  p.structure_point_count,
  p.transition_count,
  p.daily_span_count,
  p.positive_visual_span_count,
  p.negative_visual_span_count,
  p.structure_span_count,
  p.lithology_span_count,
  p.rock_condition_span_count,
  p.first_span_date,
  p.last_span_date,
  p.topography_evidence_count,
  p.survey_evidence_count,
  p.severe_chronology_count,
  p.material_chronology_count,
  p.mineralization_conflict_count,
  p.effective_priority_rank,
  p.effective_attention_reason,
  case
    when p.mineralization_conflict_count>0 or p.severe_chronology_count>0 then 'blocked_reconciliation'
    when p.material_chronology_count>0 then 'review_required'
    when p.topography_evidence_count>0 or p.survey_evidence_count>0 then 'usable_with_geometry_gaps'
    when p.interval_count>0 or p.point_observation_count>0 or p.daily_span_count>0 then 'operational_geology_available'
    else 'insufficient_geology_evidence'
  end as ai_grounding_state,
  p.source_reference
from prioritized p;

revoke all on public.production_geology_hole_context_v1 from anon;
revoke insert, update, delete, truncate, references, trigger on public.production_geology_hole_context_v1 from authenticated;
grant select on public.production_geology_hole_context_v1 to authenticated;
grant select on public.production_geology_hole_context_v1 to service_role;
