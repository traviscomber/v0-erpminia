create or replace view public.production_fine_flow_daily_v1
with (security_invoker = true) as
with transport as (
  select
    organization_id,
    movement_date as operation_date,
    count(*) as movements,
    sum(coalesce(normalized_metric_tons,0)) as transported_wet_metric_tons
  from public.production_material_movements
  group by organization_id,movement_date
), plant as (
  select
    organization_id,
    operation_date,
    shifts,
    deterministic_shifts,
    treated_wet_metric_tons,
    mineral_dry_metric_tons,
    contained_feed_cu_metric_tons,
    recovered_fine_cu_metric_tons,
    fine_coverage_state
  from public.production_fine_copper_daily_v1
), dates as (
  select organization_id,operation_date from transport
  union
  select organization_id,operation_date from plant
)
select
  d.organization_id,
  d.operation_date,
  coalesce(t.movements,0) as movements,
  t.transported_wet_metric_tons,
  p.shifts,
  p.deterministic_shifts,
  p.treated_wet_metric_tons,
  p.mineral_dry_metric_tons,
  p.contained_feed_cu_metric_tons,
  p.recovered_fine_cu_metric_tons,
  p.fine_coverage_state,
  case
    when t.transported_wet_metric_tons is null or p.treated_wet_metric_tons is null then null
    else t.transported_wet_metric_tons - p.treated_wet_metric_tons
  end as transport_treatment_delta_metric_tons,
  case
    when t.transported_wet_metric_tons is null and p.treated_wet_metric_tons is not null then 'plant_without_same_day_transport'
    when t.transported_wet_metric_tons is not null and p.treated_wet_metric_tons is null then 'transport_without_same_day_treatment'
    when t.transported_wet_metric_tons is null and p.treated_wet_metric_tons is null then 'no_data'
    else 'same_day_comparable_not_inventory_reconciled'
  end as flow_state
from dates d
left join transport t using (organization_id,operation_date)
left join plant p using (organization_id,operation_date);

revoke all on public.production_fine_flow_daily_v1 from anon, authenticated;
grant select on public.production_fine_flow_daily_v1 to service_role;

comment on view public.production_fine_flow_daily_v1 is
  'Read model para Producción fino: compara transporte húmedo diario con tratamiento de planta y resultado de Cu. La diferencia no representa pérdida; inventario inicial/final y desfases temporales deben reconciliarse por separado.';
