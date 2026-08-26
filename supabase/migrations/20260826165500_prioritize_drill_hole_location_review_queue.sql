create or replace view public.production_drill_hole_location_review_queue_v2
with (security_invoker = true) as
with report_rollup as (
  select
    r.organization_id,
    r.canonical_drill_hole_id as drill_hole_id,
    count(*) as report_count,
    min(r.operation_date) as first_report_date,
    max(r.operation_date) as last_report_date,
    count(distinct nullif(btrim(r.site_raw), '')) filter (
      where nullif(btrim(r.site_raw), '') is not null
        and upper(btrim(r.site_raw)) not in ('NO REGISTRADO', '(BLANK)')
    ) as distinct_sites,
    max(nullif(btrim(r.site_raw), '')) filter (
      where nullif(btrim(r.site_raw), '') is not null
        and upper(btrim(r.site_raw)) not in ('NO REGISTRADO', '(BLANK)')
    ) as source_site
  from public.production_drilling_source_reports r
  where r.canonical_drill_hole_id is not null
  group by r.organization_id, r.canonical_drill_hole_id
), candidate_evidence as (
  select
    e.organization_id,
    e.drill_hole_id,
    count(*) filter (where e.status = 'candidate') as candidate_evidence_count,
    count(distinct e.mine_source_id) filter (where e.status = 'candidate' and e.mine_source_id is not null) as candidate_mine_count,
    min(e.mine_source_id::text) filter (where e.status = 'candidate' and e.mine_source_id is not null)::uuid as candidate_mine_source_id,
    max(e.created_at) filter (where e.status = 'candidate') as candidate_last_at
  from public.production_drill_hole_location_evidence e
  group by e.organization_id, e.drill_hole_id
)
select
  q.organization_id,
  q.drill_hole_id,
  q.hole_code,
  q.current_mine_source_id,
  q.current_mine_sector_id,
  q.evidence_count,
  q.verified_evidence_count,
  q.verified_target_count,
  q.proposed_mine_source_id,
  q.proposed_mine_sector_id,
  q.last_verified_at,
  q.proposed_mine_name,
  q.proposed_sector_name,
  q.resolution_state,
  coalesce(rr.report_count, 0) as report_count,
  rr.first_report_date,
  rr.last_report_date,
  rr.source_site,
  coalesce(ce.candidate_evidence_count, 0) as candidate_evidence_count,
  ce.candidate_mine_source_id,
  cm.name as candidate_mine_name,
  case
    when q.resolution_state = 'evidence_conflict' then 'conflicto_evidencia'
    when coalesce(ce.candidate_mine_count, 0) = 1 then 'mina_conocida_falta_sector'
    when rr.distinct_sites = 1 and rr.source_site is not null then 'sitio_fuente_sin_sector'
    else 'sin_ubicacion_suficiente'
  end as review_lane,
  case
    when q.resolution_state = 'evidence_conflict' then 100
    when coalesce(ce.candidate_mine_count, 0) = 1 and rr.last_report_date >= current_date - 45 then 90
    when coalesce(ce.candidate_mine_count, 0) = 1 then 80
    when rr.distinct_sites = 1 and rr.source_site is not null and rr.last_report_date >= current_date - 45 then 75
    when rr.last_report_date >= current_date - 45 then 65
    else 50
  end as review_priority,
  case
    when q.resolution_state = 'evidence_conflict' then 'Resolver conflicto de ubicación antes de promover el pozo.'
    when coalesce(ce.candidate_mine_count, 0) = 1 then 'Confirmar sector dentro de la mina ya respaldada por evidencia fuente.'
    when rr.distinct_sites = 1 and rr.source_site is not null then 'Validar mina y sector usando el sitio fuente y documentación operacional.'
    else 'Solicitar evidencia topográfica, geológica o documental de ubicación.'
  end as recommended_action
from public.production_drill_hole_location_review_queue_v1 q
left join report_rollup rr
  on rr.organization_id = q.organization_id
 and rr.drill_hole_id = q.drill_hole_id
left join candidate_evidence ce
  on ce.organization_id = q.organization_id
 and ce.drill_hole_id = q.drill_hole_id
left join public.production_mine_sources cm
  on cm.organization_id = q.organization_id
 and cm.id = ce.candidate_mine_source_id;
