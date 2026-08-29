create or replace view public.production_flow_daily_fidelity_v2
with (security_invoker = true)
as
with historical_bounds as (
  select
    f.organization_id,
    min(f.operation_date) as period_start,
    max(f.operation_date) as period_end,
    (
      select max(m.movement_date)
      from public.production_material_movements m
      where m.organization_id = f.organization_id
        and m.source_file = 'TM 2026 actualizado (06-08-2026).xlsx'
    ) as movement_source_cutoff
  from public.production_fine_copper_v1 f
  where f.source_file = 'LEY (1).xlsx'
  group by f.organization_id
), historical_days as (
  select
    b.organization_id,
    gs::date as operation_date,
    b.movement_source_cutoff
  from historical_bounds b
  cross join lateral generate_series(b.period_start, b.period_end, interval '1 day') gs
), manual_dates as (
  select organization_id, movement_date as operation_date
  from public.production_material_movements
  where source_file ~ '^manual://production/mineral_transport/'
  union
  select organization_id, operation_date
  from public.production_fine_copper_v1
  where source_file ~ '^manual://production/plant_metallurgy/'
), evidence_days as (
  select organization_id, operation_date, movement_source_cutoff
  from historical_days
  union
  select
    d.organization_id,
    d.operation_date,
    b.movement_source_cutoff
  from manual_dates d
  left join historical_bounds b on b.organization_id = d.organization_id
), historical_movement as (
  select
    organization_id,
    movement_date as operation_date,
    count(*) as movement_rows,
    sum(normalized_metric_tons) as transported_t
  from public.production_material_movements
  where source_file = 'TM 2026 actualizado (06-08-2026).xlsx'
  group by organization_id, movement_date
), manual_movement as (
  select
    organization_id,
    movement_date as operation_date,
    count(*) as movement_rows,
    sum(normalized_metric_tons) as transported_t
  from public.production_material_movements
  where source_file ~ '^manual://production/mineral_transport/'
  group by organization_id, movement_date
), fine as (
  select
    organization_id,
    operation_date,
    sum(treated_wet_metric_tons) as treated_wet_t,
    sum(mineral_dry_metric_tons) as treated_dry_t,
    sum(contained_feed_cu_metric_tons) as contained_cu_t,
    sum(recovered_fine_cu_metric_tons) filter (where fine_state = 'deterministic') as recovered_fine_cu_t,
    count(*) as shift_rows,
    count(*) filter (where fine_state = 'deterministic') as deterministic_shift_rows
  from public.production_fine_copper_v1
  where source_file = 'LEY (1).xlsx'
     or source_file ~ '^manual://production/plant_metallurgy/'
  group by organization_id, operation_date
), shipments as (
  select
    organization_id,
    shipment_date as operation_date,
    count(*) as shipment_rows,
    count(*) filter (where validation_status = 'valid') as valid_shipment_rows,
    count(*) filter (where validation_status = 'review') as review_shipment_rows,
    sum(normalized_metric_tons) as dispatched_concentrate_t
  from public.production_concentrate_shipments
  where source_file = 'LEY (1).xlsx'
  group by organization_id, shipment_date
), joined as (
  select
    d.organization_id,
    d.operation_date,
    d.movement_source_cutoff,
    coalesce(hm.movement_rows, 0::bigint) as historical_movement_rows,
    hm.transported_t as historical_transported_t,
    coalesce(mm.movement_rows, 0::bigint) as manual_movement_rows,
    mm.transported_t as manual_transported_t,
    f.treated_wet_t,
    f.treated_dry_t,
    f.contained_cu_t,
    f.recovered_fine_cu_t,
    coalesce(f.shift_rows, 0::bigint) as shift_rows,
    coalesce(f.deterministic_shift_rows, 0::bigint) as deterministic_shift_rows,
    coalesce(s.shipment_rows, 0::bigint) as shipment_rows,
    coalesce(s.valid_shipment_rows, 0::bigint) as valid_shipment_rows,
    coalesce(s.review_shipment_rows, 0::bigint) as review_shipment_rows,
    s.dispatched_concentrate_t
  from evidence_days d
  left join historical_movement hm
    on hm.organization_id = d.organization_id and hm.operation_date = d.operation_date
  left join manual_movement mm
    on mm.organization_id = d.organization_id and mm.operation_date = d.operation_date
  left join fine f
    on f.organization_id = d.organization_id and f.operation_date = d.operation_date
  left join shipments s
    on s.organization_id = d.organization_id and s.operation_date = d.operation_date
), classified as (
  select
    j.*,
    case
      when j.historical_movement_rows > 0 and j.manual_movement_rows > 0 then 'historical_and_manual_evidence'
      when j.manual_movement_rows > 0 then 'manual_evidence'
      when j.movement_source_cutoff is not null and j.operation_date <= j.movement_source_cutoff then 'within_source_window'
      else 'outside_source_window'
    end as movement_source_state,
    case
      when j.historical_movement_rows > 0 or j.manual_movement_rows > 0
        then coalesce(j.historical_transported_t, 0::numeric) + coalesce(j.manual_transported_t, 0::numeric)
      when j.movement_source_cutoff is not null and j.operation_date <= j.movement_source_cutoff
        then 0::numeric
      else null::numeric
    end as transported_t,
    case
      when j.historical_movement_rows > 0 or j.manual_movement_rows > 0
        then j.historical_movement_rows + j.manual_movement_rows
      when j.movement_source_cutoff is not null and j.operation_date <= j.movement_source_cutoff
        then 0::bigint
      else null::bigint
    end as movement_rows
  from joined j
)
select
  c.organization_id,
  c.operation_date,
  c.movement_source_cutoff,
  c.movement_source_state,
  c.transported_t,
  c.treated_wet_t,
  c.treated_dry_t,
  c.contained_cu_t,
  c.recovered_fine_cu_t,
  c.shift_rows,
  c.deterministic_shift_rows,
  c.shipment_rows,
  c.valid_shipment_rows,
  c.review_shipment_rows,
  c.dispatched_concentrate_t,
  case
    when c.transported_t is null then 'movement_source_not_available'
    when coalesce(c.transported_t, 0::numeric) = 0 and coalesce(c.treated_wet_t, 0::numeric) > 0 then 'treatment_without_same_day_movement'
    when coalesce(c.treated_wet_t, 0::numeric) = 0 then 'no_plant_record'
    else 'source_values_present'
  end as flow_source_state,
  c.movement_rows,
  c.historical_movement_rows,
  c.manual_movement_rows
from classified c;

revoke all on public.production_flow_daily_fidelity_v2 from public;
revoke all on public.production_flow_daily_fidelity_v2 from anon;
revoke all on public.production_flow_daily_fidelity_v2 from authenticated;
grant select on public.production_flow_daily_fidelity_v2 to service_role;
