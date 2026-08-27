create or replace view public.maintenance_corrective_runtime_events_v1
with (security_invoker = true) as
with latest_closure as (
  select distinct on (s.organization_id, s.work_order_id)
    s.organization_id,
    s.work_order_id,
    s.canonical_asset_id,
    s.closed_at,
    s.total_cost,
    w.work_type,
    w.root_cause,
    w.actual_duration_hours,
    w.down_time_hours
  from public.work_order_closure_cost_snapshots s
  join public.maintenance_work_orders w
    on w.id = s.work_order_id
   and w.organization_id = s.organization_id
  where lower(trim(coalesce(w.work_type,''))) in ('correctivo','corrective','emergency','emergencia','failure','falla')
  order by s.organization_id, s.work_order_id, s.closure_sequence desc
), event_meter as (
  select
    c.*,
    r.id as meter_reading_id,
    r.meter_hours as meter_hours_at_or_before_close,
    r.recorded_at as meter_recorded_at
  from latest_closure c
  left join lateral (
    select ar.id, ar.meter_hours, ar.recorded_at
    from public.asset_runtime_readings ar
    where ar.organization_id = c.organization_id
      and ar.canonical_asset_id = c.canonical_asset_id
      and ar.recorded_at <= c.closed_at
    order by ar.recorded_at desc, ar.created_at desc
    limit 1
  ) r on true
), sequenced as (
  select
    e.*,
    lag(e.closed_at) over (partition by e.organization_id,e.canonical_asset_id order by e.closed_at,e.work_order_id) as previous_corrective_closed_at,
    lag(e.meter_hours_at_or_before_close) over (partition by e.organization_id,e.canonical_asset_id order by e.closed_at,e.work_order_id) as previous_corrective_meter_hours
  from event_meter e
)
select
  s.*,
  case when s.previous_corrective_closed_at is null then false else exists (
    select 1
    from public.asset_runtime_intervals_v1 i
    where i.organization_id = s.organization_id
      and i.canonical_asset_id = s.canonical_asset_id
      and i.recorded_at > s.previous_corrective_closed_at
      and i.recorded_at <= s.closed_at
      and i.reset_detected
  ) end as meter_reset_between_correctives,
  case
    when s.previous_corrective_closed_at is null then null::numeric
    when s.previous_corrective_meter_hours is null or s.meter_hours_at_or_before_close is null then null::numeric
    when exists (
      select 1 from public.asset_runtime_intervals_v1 i
      where i.organization_id = s.organization_id
        and i.canonical_asset_id = s.canonical_asset_id
        and i.recorded_at > s.previous_corrective_closed_at
        and i.recorded_at <= s.closed_at
        and i.reset_detected
    ) then null::numeric
    when s.meter_hours_at_or_before_close <= s.previous_corrective_meter_hours then null::numeric
    else s.meter_hours_at_or_before_close - s.previous_corrective_meter_hours
  end as operating_hours_between_correctives
from sequenced s;

create or replace view public.maintenance_runtime_reliability_by_asset_v1
with (security_invoker = true) as
select
  organization_id,
  canonical_asset_id,
  count(*)::integer as audited_corrective_events,
  count(*) filter (where meter_hours_at_or_before_close is not null)::integer as corrective_events_with_meter,
  count(operating_hours_between_correctives)::integer as valid_mtbf_intervals,
  avg(operating_hours_between_correctives)::numeric as mtbf_operating_hours,
  avg(actual_duration_hours) filter (where actual_duration_hours is not null and actual_duration_hours > 0)::numeric as mttr_hours,
  sum(coalesce(total_cost,0))::numeric as audited_corrective_cost,
  sum(coalesce(down_time_hours,0))::numeric as audited_downtime_hours,
  min(closed_at) as first_corrective_close_at,
  max(closed_at) as last_corrective_close_at,
  case when count(*) = 0 then null::numeric else round(100.0 * count(*) filter (where meter_hours_at_or_before_close is not null) / count(*), 1) end as meter_event_coverage_percent
from public.maintenance_corrective_runtime_events_v1
group by organization_id, canonical_asset_id;

revoke all on public.maintenance_corrective_runtime_events_v1 from public, anon, authenticated;
revoke all on public.maintenance_runtime_reliability_by_asset_v1 from public, anon, authenticated;
grant select on public.maintenance_corrective_runtime_events_v1 to service_role;
grant select on public.maintenance_runtime_reliability_by_asset_v1 to service_role;