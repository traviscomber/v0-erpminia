create or replace view public.preventive_maintenance_hour_status_v1
with (security_invoker=true) as
with latest_runtime as (
  select distinct on (r.organization_id,r.canonical_asset_id)
    r.organization_id,r.canonical_asset_id,r.meter_hours,r.recorded_at,r.source_type,r.source_reference
  from public.asset_runtime_readings r
  order by r.organization_id,r.canonical_asset_id,r.recorded_at desc,r.created_at desc
)
select
  p.organization_id,
  p.id as schedule_id,
  p.canonical_asset_id,
  a.asset_code,
  a.name as asset_name,
  p.task_name,
  p.description,
  p.priority,
  p.frequency_hours,
  p.last_executed_meter,
  coalesce(p.next_due_meter, case when p.last_executed_meter is not null and p.frequency_hours is not null then p.last_executed_meter+p.frequency_hours end) as due_meter,
  p.current_meter_snapshot as source_meter_snapshot,
  lr.meter_hours as latest_runtime_meter,
  lr.recorded_at as latest_runtime_recorded_at,
  lr.source_type as latest_runtime_source_type,
  coalesce(lr.meter_hours,p.current_meter_snapshot) as effective_current_meter,
  case when lr.meter_hours is not null then 'runtime_reading' else 'schedule_snapshot' end as meter_evidence_source,
  (lr.meter_hours is not null and p.current_meter_snapshot is not null and lr.meter_hours < p.current_meter_snapshot) as meter_basis_conflict,
  case
    when p.frequency_hours is null or p.frequency_hours<=0 then 'not_hour_based'
    when coalesce(p.next_due_meter, case when p.last_executed_meter is not null then p.last_executed_meter+p.frequency_hours end) is null then 'missing_due_meter'
    when lr.meter_hours is not null and p.current_meter_snapshot is not null and lr.meter_hours < p.current_meter_snapshot then 'needs_review'
    when coalesce(lr.meter_hours,p.current_meter_snapshot) is null then 'missing_meter'
    when coalesce(lr.meter_hours,p.current_meter_snapshot) >= coalesce(p.next_due_meter,p.last_executed_meter+p.frequency_hours) then 'overdue'
    else 'pending'
  end as hour_status,
  case
    when coalesce(lr.meter_hours,p.current_meter_snapshot) is null then null
    when coalesce(p.next_due_meter,case when p.last_executed_meter is not null then p.last_executed_meter+p.frequency_hours end) is null then null
    when lr.meter_hours is not null and p.current_meter_snapshot is not null and lr.meter_hours < p.current_meter_snapshot then null
    else coalesce(p.next_due_meter,p.last_executed_meter+p.frequency_hours)-coalesce(lr.meter_hours,p.current_meter_snapshot)
  end as remaining_hours,
  (case
    when p.frequency_hours is null or p.frequency_hours<=0 then false
    when coalesce(p.next_due_meter,case when p.last_executed_meter is not null then p.last_executed_meter+p.frequency_hours end) is null then false
    when lr.meter_hours is not null and p.current_meter_snapshot is not null and lr.meter_hours < p.current_meter_snapshot then false
    when coalesce(lr.meter_hours,p.current_meter_snapshot) is null then false
    else coalesce(lr.meter_hours,p.current_meter_snapshot) >= coalesce(p.next_due_meter,p.last_executed_meter+p.frequency_hours)
  end) as alert_due,
  p.source_reference,
  p.generated_work_order_id,
  p.enabled
from public.preventive_maintenance_schedules p
left join public.maintenance_canonical_assets_v1 a on a.organization_id=p.organization_id and a.id=p.canonical_asset_id
left join latest_runtime lr on lr.organization_id=p.organization_id and lr.canonical_asset_id=p.canonical_asset_id
where p.enabled=true and p.frequency_hours is not null and p.frequency_hours>0;

create or replace view public.preventive_maintenance_hour_summary_v1
with (security_invoker=true) as
select organization_id,
 count(*)::integer as configured_tasks,
 count(distinct canonical_asset_id)::integer as configured_assets,
 count(*) filter (where hour_status='overdue')::integer as overdue_tasks,
 count(*) filter (where hour_status='pending')::integer as pending_tasks,
 count(*) filter (where hour_status='missing_meter')::integer as missing_meter_tasks,
 count(*) filter (where hour_status='needs_review')::integer as meter_review_tasks,
 count(*) filter (where meter_evidence_source='runtime_reading')::integer as tasks_using_runtime_reading
from public.preventive_maintenance_hour_status_v1
group by organization_id;

revoke all privileges on public.preventive_maintenance_hour_status_v1 from public,anon,authenticated;
revoke all privileges on public.preventive_maintenance_hour_summary_v1 from public,anon,authenticated;
grant select on public.preventive_maintenance_hour_status_v1 to service_role;
grant select on public.preventive_maintenance_hour_summary_v1 to service_role;