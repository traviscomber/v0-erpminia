create or replace view public.production_geology_2026_readiness_v1
with (security_invoker = true)
as
with year_holes as (
  select distinct r.canonical_drill_hole_id as drill_hole_id
  from public.production_drilling_source_reports r
  where r.operation_date>=date '2026-01-01'
    and r.operation_date<date '2027-01-01'
    and r.canonical_drill_hole_id is not null
), year_recon as (
  select c.drill_hole_id,
    count(*) filter (where c.reconciliation_state='blocked')::bigint as blocked_2026,
    count(*) filter (where c.reconciliation_state='review_required')::bigint as review_2026
  from public.production_geology_reconciliation_cases_v1 c
  where c.operation_date>=date '2026-01-01' and c.operation_date<date '2027-01-01'
  group by c.drill_hole_id
)
select
  h.organization_id,h.drill_hole_id,h.hole_code,h.mine_name,h.sector_name,h.status,h.drilled_depth_m,
  h.orientation_confidence,h.interval_count,h.point_observation_count,h.transition_count,h.daily_span_count,
  h.topography_evidence_count,h.survey_evidence_count,h.mineralization_conflict_count,
  coalesce(r.blocked_2026,0::bigint) as blocked_2026,
  coalesce(r.review_2026,0::bigint) as review_2026,
  (h.mine_name is null) as mine_missing,
  (h.sector_name is null) as sector_missing,
  (h.orientation_confidence='missing') as orientation_missing,
  case
    when coalesce(r.blocked_2026,0)>0 or h.mineralization_conflict_count>0 then 'blocked_2026'
    when coalesce(r.review_2026,0)>0 then 'review_2026'
    when h.topography_evidence_count>0 or h.survey_evidence_count>0 then 'usable_with_geometry_gaps'
    when h.interval_count>0 or h.point_observation_count>0 or h.daily_span_count>0 then 'operational_geology_available'
    else 'insufficient_geology_evidence'
  end as readiness_state,
  case
    when coalesce(r.blocked_2026,0)>0 then 'Reconciliar conflicto 2026 antes de interpretar continuidad.'
    when coalesce(r.review_2026,0)>0 then 'Revisar continuidad 2026 antes de consolidar interpretacion.'
    when h.topography_evidence_count>0 then 'Evidencia topografica 2026 disponible; faltan coordenadas/collar canonicos.'
    when h.survey_evidence_count>0 then 'Evidencia de survey/desviacion 2026 disponible; no hay estaciones numericas canonicas.'
    when h.interval_count>0 or h.point_observation_count>0 or h.daily_span_count>0 then 'Geologia operacional 2026 disponible.'
    else 'No hay evidencia geologica estructurada suficiente para 2026.'
  end as readiness_reason,
  h.source_reference
from public.production_geology_hole_context_v2 h
join year_holes y on y.drill_hole_id=h.drill_hole_id
left join year_recon r on r.drill_hole_id=h.drill_hole_id;

revoke all on public.production_geology_2026_readiness_v1 from anon;
revoke all on public.production_geology_2026_readiness_v1 from authenticated;
revoke all on public.production_geology_2026_readiness_v1 from service_role;
grant select on public.production_geology_2026_readiness_v1 to authenticated;
grant select on public.production_geology_2026_readiness_v1 to service_role;
