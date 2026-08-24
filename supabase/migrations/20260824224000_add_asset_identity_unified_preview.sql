create or replace view public.asset_identity_unified_preview_v1 as
with cost_by_finance_asset as (
  select
    r.organization_id,
    r.finance_asset_id as source_asset_id,
    count(c.id) filter (where c.validation_status <> 'invalid')::bigint as recognized_cost_events,
    sum(c.total_cost) filter (where c.validation_status <> 'invalid' and c.currency = 'CLP') as recognized_cost_clp,
    sum(c.total_cost) filter (
      where c.validation_status <> 'invalid'
        and c.currency = 'CLP'
        and c.transaction_date >= date_trunc('year', current_date)::date
    ) as recognized_cost_clp_ytd,
    max(c.transaction_date) filter (where c.validation_status <> 'invalid') as last_cost_at
  from public.finance_asset_reconciliation_v1 r
  left join canonical.asset_costs c
    on c.organization_id = r.organization_id
   and c.asset_code = r.finance_asset_code
  group by r.organization_id, r.finance_asset_id
), drilling_by_operational_asset as (
  select
    organization_id,
    canonical_asset_id as target_asset_id,
    count(*)::bigint as drilling_reports,
    sum(drilled_meters) as drilled_meters,
    max(operation_date) as last_drilling_at
  from public.production_drilling_source_reports
  where canonical_asset_id is not null
  group by organization_id, canonical_asset_id
)
select
  p.organization_id,
  p.source_asset_id,
  p.source_asset_code,
  p.source_asset_name,
  p.target_asset_id,
  p.target_asset_code,
  p.target_asset_name,
  p.evidence_rule,
  coalesce(c.recognized_cost_events, 0)::bigint as recognized_cost_events,
  c.recognized_cost_clp,
  c.recognized_cost_clp_ytd,
  c.last_cost_at,
  coalesce(d.drilling_reports, 0)::bigint as drilling_reports,
  d.drilled_meters,
  d.last_drilling_at,
  case
    when c.recognized_cost_clp is not null and d.drilled_meters is not null and d.drilled_meters > 0
      then c.recognized_cost_clp / d.drilled_meters
    else null
  end as lifetime_cost_clp_per_meter_preview,
  'review_required'::text as identity_status,
  false as canonicalized
from public.asset_identity_merge_plan_v1 p
left join cost_by_finance_asset c
  on c.organization_id = p.organization_id
 and c.source_asset_id = p.source_asset_id
left join drilling_by_operational_asset d
  on d.organization_id = p.organization_id
 and d.target_asset_id = p.target_asset_id;
