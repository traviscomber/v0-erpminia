create or replace view public.asset_operating_spine_v1
with (security_invoker=true) as
with wo as (
  select organization_id,
         coalesce(canonical_asset_id, asset_id) as canonical_asset_id,
         count(*)::bigint as work_order_count,
         count(*) filter (where lower(coalesce(status,'')) not in ('completed','completada','closed','cerrada','cancelled','cancelada'))::bigint as open_work_order_count,
         sum(down_time_hours) filter (where down_time_hours is not null) as recorded_downtime_hours,
         max(coalesce(closed_at, completion_date::timestamptz, updated_at::timestamptz)) as last_work_order_at
  from public.maintenance_work_orders
  where coalesce(canonical_asset_id, asset_id) is not null
  group by organization_id, coalesce(canonical_asset_id, asset_id)
), drilling as (
  select organization_id, canonical_asset_id,
         count(*)::bigint as drilling_report_count,
         sum(drilled_meters) filter (where drilled_meters is not null) as drilled_meters,
         max(operation_date) as last_drilling_date
  from public.production_drilling_source_reports
  where canonical_asset_id is not null
  group by organization_id, canonical_asset_id
), costs as (
  select organization_id, canonical_asset_id,
         count(*)::bigint as recognized_cost_event_count,
         sum(amount) filter (where recognition_status='recognized' and amount is not null) as recognized_cost_clp,
         max(event_at) as last_cost_event_at
  from public.canonical_clp_cost_ledger
  where canonical_asset_id is not null
  group by organization_id, canonical_asset_id
), sensor_counts as (
  select organization_id, canonical_asset_id,
         count(*)::bigint as sensor_count,
         max(last_reading_at) as last_sensor_at
  from public.sensors
  where canonical_asset_id is not null
  group by organization_id, canonical_asset_id
), reading_counts as (
  select organization_id, canonical_asset_id,
         count(*)::bigint as sensor_reading_count,
         max(coalesce(timestamp,received_at)) as last_sensor_reading_at
  from public.sensor_readings
  where canonical_asset_id is not null
  group by organization_id, canonical_asset_id
)
select a.id as canonical_asset_id,
       a.organization_id,
       a.asset_code,
       a.name as asset_name,
       a.asset_type,
       a.category,
       a.manufacturer,
       a.model,
       a.serial_number,
       a.license_plate,
       a.cost_center_code,
       a.is_active,
       a.validation_status,
       a.location,
       a.operational_status,
       a.criticality,
       a.mtbf_hours,
       a.acquisition_date,
       a.acquisition_cost,
       a.expected_lifespan_years,
       coalesce(wo.work_order_count,0)::bigint as work_order_count,
       coalesce(wo.open_work_order_count,0)::bigint as open_work_order_count,
       wo.recorded_downtime_hours,
       wo.last_work_order_at,
       coalesce(drilling.drilling_report_count,0)::bigint as drilling_report_count,
       drilling.drilled_meters,
       drilling.last_drilling_date,
       coalesce(costs.recognized_cost_event_count,0)::bigint as recognized_cost_event_count,
       costs.recognized_cost_clp,
       costs.last_cost_event_at,
       coalesce(sensor_counts.sensor_count,0)::bigint as sensor_count,
       coalesce(reading_counts.sensor_reading_count,0)::bigint as sensor_reading_count,
       greatest(sensor_counts.last_sensor_at, reading_counts.last_sensor_reading_at) as last_telemetry_at,
       ((case when coalesce(wo.work_order_count,0)>0 then 1 else 0 end) +
        (case when coalesce(drilling.drilling_report_count,0)>0 then 1 else 0 end) +
        (case when coalesce(costs.recognized_cost_event_count,0)>0 then 1 else 0 end) +
        (case when coalesce(sensor_counts.sensor_count,0)>0 or coalesce(reading_counts.sensor_reading_count,0)>0 then 1 else 0 end))::integer as evidence_domain_count
from public.canonical_assets_current a
left join wo on wo.organization_id=a.organization_id and wo.canonical_asset_id=a.id
left join drilling on drilling.organization_id=a.organization_id and drilling.canonical_asset_id=a.id
left join costs on costs.organization_id=a.organization_id and costs.canonical_asset_id=a.id
left join sensor_counts on sensor_counts.organization_id=a.organization_id and sensor_counts.canonical_asset_id=a.id
left join reading_counts on reading_counts.organization_id=a.organization_id and reading_counts.canonical_asset_id=a.id;

comment on view public.asset_operating_spine_v1 is 'Mining OS derived projection: one row per canonical asset combining maintenance, drilling, recognized cost and telemetry evidence. canonical.assets remains the only asset source of truth.';
revoke all on public.asset_operating_spine_v1 from anon, authenticated;
grant select on public.asset_operating_spine_v1 to service_role;
