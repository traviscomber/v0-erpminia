create or replace view public.asset_operational_state_v1 as
with cost as (
  select
    organization_id,
    canonical_asset_id,
    count(*) filter (where recognition_status = 'recognized') as recognized_cost_event_count,
    max(event_at) filter (where recognition_status = 'recognized') as last_cost_at,
    case when count(*) filter (where recognition_status = 'recognized') > 0
      then sum(amount) filter (where recognition_status = 'recognized' and currency = 'CLP')
      else null end as recognized_cost_clp_lifetime,
    case when count(*) filter (where recognition_status = 'recognized' and event_at >= date_trunc('year', current_date)) > 0
      then sum(amount) filter (where recognition_status = 'recognized' and currency = 'CLP' and event_at >= date_trunc('year', current_date))
      else null end as recognized_cost_clp_ytd,
    case when count(*) filter (where recognition_status = 'recognized' and event_at >= current_date - interval '12 months') > 0
      then sum(amount) filter (where recognition_status = 'recognized' and currency = 'CLP' and event_at >= current_date - interval '12 months')
      else null end as recognized_cost_clp_12m
  from public.canonical_clp_cost_ledger
  where canonical_asset_id is not null
  group by organization_id, canonical_asset_id
), spine as (
  select * from public.asset_operating_spine_v1
)
select
  a.organization_id,
  a.id as canonical_asset_id,
  a.asset_code,
  a.name as asset_name,
  a.asset_type,
  a.category,
  a.operational_status,
  a.criticality,
  a.location,
  a.is_active,
  c.recognized_cost_event_count,
  c.last_cost_at,
  c.recognized_cost_clp_lifetime,
  c.recognized_cost_clp_ytd,
  c.recognized_cost_clp_12m,
  s.work_order_count,
  s.open_work_order_count,
  s.recorded_downtime_hours,
  s.drilling_report_count,
  s.drilled_meters,
  s.sensor_count,
  s.sensor_reading_count,
  s.evidence_domain_count,
  case
    when coalesce(s.sensor_reading_count, 0) > 0 then 'telemetry_present'
    when coalesce(s.work_order_count, 0) > 0 and s.recorded_downtime_hours is not null then 'downtime_only'
    when coalesce(s.work_order_count, 0) > 0 then 'work_orders_without_downtime'
    else 'insufficient_evidence'
  end as availability_evidence_status,
  null::numeric as availability_pct
from public.canonical_assets_current a
left join cost c
  on c.organization_id = a.organization_id
 and c.canonical_asset_id = a.id
left join spine s
  on s.organization_id = a.organization_id
 and s.canonical_asset_id = a.id;
