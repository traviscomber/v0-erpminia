create or replace view public.production_drill_hole_location_review_queue_v4 as
with site_signals as (
  select
    r.organization_id,
    r.canonical_drill_hole_id as drill_hole_id,
    count(distinct nullif(trim(r.site_raw), '')) filter (
      where r.site_raw is not null
        and trim(r.site_raw) not in ('', '(blank)', 'No registrado')
    ) as distinct_site_count,
    array_agg(distinct r.site_raw) filter (
      where r.site_raw is not null
        and trim(r.site_raw) not in ('', '(blank)', 'No registrado')
    ) as source_sites
  from public.production_drilling_source_reports r
  where r.canonical_drill_hole_id is not null
  group by r.organization_id, r.canonical_drill_hole_id
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
  q.report_count,
  q.first_report_date,
  q.last_report_date,
  q.source_site,
  q.candidate_evidence_count,
  q.candidate_mine_source_id,
  q.candidate_mine_name,
  case when coalesce(s.distinct_site_count, 0) > 1 then 'conflicto_fuente' else q.review_lane end as review_lane,
  case when coalesce(s.distinct_site_count, 0) > 1 then greatest(q.review_priority, 95) else q.review_priority end as review_priority,
  case when coalesce(s.distinct_site_count, 0) > 1
       then 'Resolver discrepancia entre sitios fuente antes de asignar mina o sector.'
       else q.recommended_action end as recommended_action,
  coalesce(s.distinct_site_count, 0) as distinct_site_count,
  s.source_sites
from public.production_drill_hole_location_review_queue_v3 q
left join site_signals s
  on s.organization_id = q.organization_id
 and s.drill_hole_id = q.drill_hole_id;
