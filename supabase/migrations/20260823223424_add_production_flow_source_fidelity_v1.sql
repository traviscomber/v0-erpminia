create or replace view public.production_flow_daily_fidelity_v1
with (security_invoker = true)
as
with bounds as (
  select
    '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid as organization_id,
    '2026-08-01'::date as period_start,
    '2026-08-18'::date as period_end,
    (select max(movement_date) from public.production_material_movements where source_file = 'TM 2026 actualizado (06-08-2026).xlsx') as movement_source_cutoff
), days as (
  select b.organization_id, gs::date as operation_date, b.movement_source_cutoff
  from bounds b
  cross join generate_series(b.period_start, b.period_end, interval '1 day') gs
), movement as (
  select organization_id, movement_date as operation_date, count(*) as movement_rows, sum(normalized_metric_tons) as transported_t
  from public.production_material_movements
  where source_file = 'TM 2026 actualizado (06-08-2026).xlsx'
  group by organization_id, movement_date
), fine as (
  select organization_id, operation_date,
    sum(treated_wet_metric_tons) as treated_wet_t,
    sum(mineral_dry_metric_tons) as treated_dry_t,
    sum(contained_feed_cu_metric_tons) as contained_cu_t,
    sum(recovered_fine_cu_metric_tons) filter (where fine_state = 'deterministic') as recovered_fine_cu_t,
    count(*) as shift_rows,
    count(*) filter (where fine_state = 'deterministic') as deterministic_shift_rows
  from public.production_fine_copper_v1
  where source_file = 'LEY (1).xlsx'
  group by organization_id, operation_date
), shipments as (
  select organization_id, shipment_date as operation_date,
    count(*) as shipment_rows,
    count(*) filter (where validation_status = 'valid') as valid_shipment_rows,
    count(*) filter (where validation_status = 'review') as review_shipment_rows,
    sum(normalized_metric_tons) as dispatched_concentrate_t
  from public.production_concentrate_shipments
  where source_file = 'LEY (1).xlsx'
  group by organization_id, shipment_date
)
select
  d.organization_id,
  d.operation_date,
  d.movement_source_cutoff,
  case when d.operation_date <= d.movement_source_cutoff then 'within_source_window' else 'outside_source_window' end as movement_source_state,
  case when d.operation_date <= d.movement_source_cutoff then coalesce(m.transported_t, 0::numeric) else null::numeric end as transported_t,
  f.treated_wet_t,
  f.treated_dry_t,
  f.contained_cu_t,
  f.recovered_fine_cu_t,
  coalesce(f.shift_rows,0) as shift_rows,
  coalesce(f.deterministic_shift_rows,0) as deterministic_shift_rows,
  coalesce(s.shipment_rows,0) as shipment_rows,
  coalesce(s.valid_shipment_rows,0) as valid_shipment_rows,
  coalesce(s.review_shipment_rows,0) as review_shipment_rows,
  s.dispatched_concentrate_t,
  case
    when d.operation_date > d.movement_source_cutoff then 'movement_source_not_available'
    when coalesce(m.transported_t,0) = 0 and coalesce(f.treated_wet_t,0) > 0 then 'treatment_without_same_day_movement'
    when coalesce(f.treated_wet_t,0) = 0 then 'no_plant_record'
    else 'source_values_present'
  end as flow_source_state,
  case when d.operation_date <= d.movement_source_cutoff then coalesce(m.movement_rows,0) else null::bigint end as movement_rows
from days d
left join movement m on m.organization_id=d.organization_id and m.operation_date=d.operation_date
left join fine f on f.organization_id=d.organization_id and f.operation_date=d.operation_date
left join shipments s on s.organization_id=d.organization_id and s.operation_date=d.operation_date;

create or replace view public.production_flow_fidelity_quality_v1
with (security_invoker = true)
as
with checks as (
  select 'canonical_august_days'::text as check_key, '18'::text as expected_value, count(*)::text as actual_value
  from public.production_flow_daily_fidelity_v1
  union all
  select 'canonical_august_shifts', '36', sum(shift_rows)::text from public.production_flow_daily_fidelity_v1
  union all
  select 'canonical_august_deterministic_shifts', '36', sum(deterministic_shift_rows)::text from public.production_flow_daily_fidelity_v1
  union all
  select 'canonical_august_shipments', '14', sum(shipment_rows)::text from public.production_flow_daily_fidelity_v1
  union all
  select 'movement_source_cutoff', '2026-08-06', max(movement_source_cutoff)::text from public.production_flow_daily_fidelity_v1
  union all
  select 'post_cutoff_days_marked_unavailable', '12', count(*) filter (where movement_source_state='outside_source_window' and transported_t is null)::text from public.production_flow_daily_fidelity_v1
  union all
  select 'review_shipments_preserved', '1', sum(review_shipment_rows)::text from public.production_flow_daily_fidelity_v1
)
select check_key, expected_value, actual_value,
       case when actual_value = expected_value then 'PASS' else 'HOLD' end as status
from checks;

grant select on public.production_flow_daily_fidelity_v1 to service_role;
grant select on public.production_flow_fidelity_quality_v1 to service_role;
