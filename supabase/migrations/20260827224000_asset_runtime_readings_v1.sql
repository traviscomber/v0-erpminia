create table if not exists public.asset_runtime_readings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
  meter_hours numeric(14,2) not null check (meter_hours >= 0),
  recorded_at timestamptz not null,
  source_type text not null check (source_type in ('manual','import','telemetry')),
  source_reference text,
  notes text,
  recorded_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists asset_runtime_readings_asset_time_idx
  on public.asset_runtime_readings(organization_id, canonical_asset_id, recorded_at desc);

alter table public.asset_runtime_readings enable row level security;
revoke all on public.asset_runtime_readings from public, anon, authenticated;
grant select, insert on public.asset_runtime_readings to service_role;

create or replace view public.asset_runtime_intervals_v1 with (security_invoker=true) as
with ordered as (
  select r.*,
    lag(r.meter_hours) over (partition by r.organization_id, r.canonical_asset_id order by r.recorded_at, r.id) as previous_meter_hours,
    lag(r.recorded_at) over (partition by r.organization_id, r.canonical_asset_id order by r.recorded_at, r.id) as previous_recorded_at
  from public.asset_runtime_readings r
)
select o.*,
  case when previous_meter_hours is null then null when meter_hours < previous_meter_hours then true else false end as reset_detected,
  case when previous_meter_hours is null or meter_hours < previous_meter_hours then null else meter_hours - previous_meter_hours end as operating_hours_delta
from ordered o;
revoke all on public.asset_runtime_intervals_v1 from public, anon, authenticated;
grant select on public.asset_runtime_intervals_v1 to service_role;

create or replace view public.asset_runtime_summary_v1 with (security_invoker=true) as
select a.organization_id, a.id as canonical_asset_id, a.asset_code, a.name as asset_name,
  count(r.id)::int as reading_count,
  min(r.recorded_at) as first_reading_at,
  max(r.recorded_at) as last_reading_at,
  (array_agg(r.meter_hours order by r.recorded_at desc, r.id desc) filter (where r.id is not null))[1] as latest_meter_hours,
  coalesce(sum(i.operating_hours_delta),0)::numeric(14,2) as observed_operating_hours,
  count(*) filter (where i.reset_detected)::int as reset_count,
  case when count(r.id) >= 2 and count(*) filter (where i.reset_detected) = 0 then true else false end as usable_for_rate_metrics
from canonical.assets a
left join public.asset_runtime_readings r on r.organization_id=a.organization_id and r.canonical_asset_id=a.id
left join public.asset_runtime_intervals_v1 i on i.id=r.id
group by a.organization_id,a.id,a.asset_code,a.name;
revoke all on public.asset_runtime_summary_v1 from public, anon, authenticated;
grant select on public.asset_runtime_summary_v1 to service_role;

create or replace view public.maintenance_runtime_cost_intelligence_v1 with (security_invoker=true) as
select s.organization_id, s.canonical_asset_id, s.asset_code, s.asset_name, s.reading_count, s.first_reading_at, s.last_reading_at,
  s.latest_meter_hours, s.observed_operating_hours, s.reset_count, s.usable_for_rate_metrics,
  coalesce(c.audited_closures,0)::int as audited_closures,
  coalesce(c.audited_total_cost,0)::numeric as audited_total_cost,
  case when s.usable_for_rate_metrics and s.observed_operating_hours > 0 then round(coalesce(c.audited_total_cost,0) / s.observed_operating_hours,2) else null end as audited_cost_per_operating_hour
from public.asset_runtime_summary_v1 s
left join public.maintenance_reliability_by_asset_v1 c on c.organization_id=s.organization_id and c.canonical_asset_id=s.canonical_asset_id;
revoke all on public.maintenance_runtime_cost_intelligence_v1 from public, anon, authenticated;
grant select on public.maintenance_runtime_cost_intelligence_v1 to service_role;
