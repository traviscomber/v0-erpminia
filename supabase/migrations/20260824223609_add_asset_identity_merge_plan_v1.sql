create or replace view public.asset_identity_merge_plan_v1 as
with finance_cost as (
  select
    organization_id,
    canonical_asset_id,
    count(*) filter (where recognition_status='recognized') as recognized_cost_events,
    sum(amount) filter (where recognition_status='recognized' and currency='CLP') as recognized_cost_clp
  from public.canonical_clp_cost_ledger
  where canonical_asset_id is not null
  group by organization_id, canonical_asset_id
), drilling as (
  select
    organization_id,
    canonical_asset_id,
    count(*) as drilling_reports,
    sum(drilled_meters) as drilled_meters
  from public.production_drilling_source_reports
  where canonical_asset_id is not null
  group by organization_id, canonical_asset_id
)
select
  c.organization_id,
  c.finance_asset_id as source_asset_id,
  c.finance_asset_code as source_asset_code,
  c.finance_asset_name as source_asset_name,
  c.operational_asset_id as target_asset_id,
  c.operational_asset_code as target_asset_code,
  c.operational_asset_name as target_asset_name,
  c.evidence_rule,
  fc.recognized_cost_events,
  fc.recognized_cost_clp,
  d.drilling_reports,
  d.drilled_meters,
  'review_required'::text as merge_status
from public.asset_duplicate_identity_candidates_v1 c
left join finance_cost fc
  on fc.organization_id=c.organization_id
 and fc.canonical_asset_id=c.finance_asset_id
left join drilling d
  on d.organization_id=c.organization_id
 and d.canonical_asset_id=c.operational_asset_id;
