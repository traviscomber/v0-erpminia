create or replace view public.maintenance_reliability_base_v1
with (security_invoker=true)
as
with latest_snapshot as (
  select distinct on (s.work_order_id)
    s.organization_id,
    s.work_order_id,
    s.canonical_asset_id,
    s.cost_center_id,
    s.total_cost,
    s.closed_at,
    s.closure_sequence
  from public.work_order_closure_cost_snapshots s
  order by s.work_order_id, s.closure_sequence desc
)
select
  s.organization_id,
  s.work_order_id,
  wo.work_order_number,
  s.canonical_asset_id,
  a.asset_code,
  a.name as asset_name,
  a.asset_type,
  a.manufacturer,
  a.model,
  s.cost_center_id,
  wo.work_type,
  nullif(trim(wo.root_cause),'') as root_cause,
  lower(regexp_replace(coalesce(trim(wo.root_cause),''),'\s+',' ','g')) as root_cause_key,
  nullif(trim(wo.preventive_actions),'') as preventive_actions,
  coalesce(wo.actual_duration_hours,0)::numeric as actual_duration_hours,
  coalesce(wo.down_time_hours,0)::numeric as down_time_hours,
  coalesce(s.total_cost,0)::numeric as total_cost,
  s.closed_at,
  s.closure_sequence
from latest_snapshot s
join public.maintenance_work_orders wo on wo.id=s.work_order_id and wo.organization_id=s.organization_id
left join public.maintenance_canonical_assets_v1 a on a.id=s.canonical_asset_id and a.organization_id=s.organization_id
where wo.status='completed';

create or replace view public.maintenance_reliability_by_asset_v1
with (security_invoker=true)
as
with base as (
  select * from public.maintenance_reliability_base_v1
), ordered as (
  select b.*, lag(b.closed_at) over (partition by b.organization_id,b.canonical_asset_id order by b.closed_at,b.work_order_id) as previous_closed_at
  from base b
), cause_counts as (
  select organization_id,canonical_asset_id,root_cause_key,count(*)::int as occurrences
  from base
  where root_cause_key<>''
  group by organization_id,canonical_asset_id,root_cause_key
), cause_summary as (
  select organization_id,canonical_asset_id,count(*) filter (where occurrences>=2)::int as recurring_cause_count,coalesce(max(occurrences),0)::int as max_same_cause_occurrences
  from cause_counts
  group by organization_id,canonical_asset_id
)
select
  o.organization_id,
  o.canonical_asset_id,
  max(o.asset_code) as asset_code,
  max(o.asset_name) as asset_name,
  max(o.asset_type) as asset_type,
  max(o.manufacturer) as manufacturer,
  max(o.model) as model,
  count(*)::int as audited_closures,
  count(*) filter (where o.root_cause_key<>'')::int as closures_with_root_cause,
  count(distinct nullif(o.root_cause_key,''))::int as distinct_root_causes,
  coalesce(max(cs.recurring_cause_count),0)::int as recurring_cause_count,
  coalesce(max(cs.max_same_cause_occurrences),0)::int as max_same_cause_occurrences,
  sum(o.total_cost)::numeric as audited_total_cost,
  avg(o.total_cost)::numeric as audited_avg_cost,
  sum(o.actual_duration_hours)::numeric as total_actual_hours,
  sum(o.down_time_hours)::numeric as total_downtime_hours,
  min(o.closed_at) as first_audited_closure_at,
  max(o.closed_at) as last_audited_closure_at,
  case when count(*)>=2 then avg(extract(epoch from (o.closed_at-o.previous_closed_at))/86400.0) filter (where o.previous_closed_at is not null) else null end::numeric as avg_days_between_audited_interventions,
  (coalesce(max(cs.recurring_cause_count),0)>0) as has_recurring_root_cause
from ordered o
left join cause_summary cs on cs.organization_id=o.organization_id and cs.canonical_asset_id=o.canonical_asset_id
group by o.organization_id,o.canonical_asset_id;

create or replace view public.maintenance_reliability_by_root_cause_v1
with (security_invoker=true)
as
select
  organization_id,
  canonical_asset_id,
  max(asset_code) as asset_code,
  max(asset_name) as asset_name,
  root_cause_key,
  max(root_cause) as root_cause,
  count(*)::int as occurrences,
  sum(total_cost)::numeric as audited_total_cost,
  avg(total_cost)::numeric as audited_avg_cost,
  sum(actual_duration_hours)::numeric as total_actual_hours,
  sum(down_time_hours)::numeric as total_downtime_hours,
  min(closed_at) as first_seen_at,
  max(closed_at) as last_seen_at,
  (count(*)>=2) as is_recurring
from public.maintenance_reliability_base_v1
where root_cause_key<>''
group by organization_id,canonical_asset_id,root_cause_key;

create or replace view public.maintenance_reliability_summary_v1
with (security_invoker=true)
as
select
  organization_id,
  count(*)::int as assets_with_audited_closures,
  coalesce(sum(audited_closures),0)::int as audited_closures,
  count(*) filter (where has_recurring_root_cause)::int as assets_with_recurring_root_cause,
  coalesce(sum(audited_total_cost),0)::numeric as audited_total_cost,
  coalesce(sum(total_actual_hours),0)::numeric as total_actual_hours,
  coalesce(sum(total_downtime_hours),0)::numeric as total_downtime_hours
from public.maintenance_reliability_by_asset_v1
group by organization_id;

revoke all privileges on public.maintenance_reliability_base_v1 from public, anon, authenticated;
revoke all privileges on public.maintenance_reliability_by_asset_v1 from public, anon, authenticated;
revoke all privileges on public.maintenance_reliability_by_root_cause_v1 from public, anon, authenticated;
revoke all privileges on public.maintenance_reliability_summary_v1 from public, anon, authenticated;
grant select on public.maintenance_reliability_base_v1 to service_role;
grant select on public.maintenance_reliability_by_asset_v1 to service_role;
grant select on public.maintenance_reliability_by_root_cause_v1 to service_role;
grant select on public.maintenance_reliability_summary_v1 to service_role;
