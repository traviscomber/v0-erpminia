-- Keep source-report identity aligned with explicit high-confidence drill-hole aliases.
update public.production_drilling_source_reports r
set canonical_drill_hole_id = er.drill_hole_id,
    reconciliation_notes = concat_ws(' | ', nullif(r.reconciliation_notes, ''), 'Alias tipográfico reconciliado a pozo canónico por production_entity_reconciliation.')
from public.production_entity_reconciliation er
where er.organization_id = r.organization_id
  and er.entity_type = 'drill_hole'
  and er.status = 'matched'
  and er.confidence = 'high'
  and er.drill_hole_id is not null
  and er.raw_value = r.hole_code_raw
  and r.canonical_drill_hole_id is distinct from er.drill_hole_id;

create or replace view public.production_drill_hole_location_review_queue_v3 as
with alias_targets as (
  select
    organization_id,
    raw_value,
    normalized_value,
    drill_hole_id as canonical_target_id
  from public.production_entity_reconciliation
  where entity_type = 'drill_hole'
    and status = 'matched'
    and confidence = 'high'
    and drill_hole_id is not null
), queue as (
  select q.*,
         a.raw_value as alias_raw_value,
         a.canonical_target_id
  from public.production_drill_hole_location_review_queue_v2 q
  left join alias_targets a
    on a.organization_id = q.organization_id
   and regexp_replace(lower(q.hole_code), '[^a-z0-9]', '', 'g') = a.normalized_value
)
select
  organization_id,
  drill_hole_id,
  hole_code,
  current_mine_source_id,
  current_mine_sector_id,
  evidence_count,
  verified_evidence_count,
  verified_target_count,
  proposed_mine_source_id,
  proposed_mine_sector_id,
  last_verified_at,
  proposed_mine_name,
  proposed_sector_name,
  resolution_state,
  report_count,
  first_report_date,
  last_report_date,
  source_site,
  candidate_evidence_count,
  candidate_mine_source_id,
  candidate_mine_name,
  review_lane,
  review_priority,
  recommended_action
from queue
where canonical_target_id is null
   or drill_hole_id = canonical_target_id;
