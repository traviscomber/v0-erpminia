create or replace view public.production_metallurgy_deterministic_v2
with (security_invoker = true)
as
select
  s.organization_id,
  s.id as plant_shift_id,
  r.id as metallurgy_result_id,
  s.operation_date,
  s.shift_code,
  s.source_file,
  s.source_sheet,
  s.source_row,
  s.source_hash as plant_source_hash,
  s.validation_status as plant_validation_status,
  s.treated_metric_tons,
  s.mineral_moisture_pct,
  r.head_grade,
  r.concentrate_grade,
  r.tailings_grade,
  r.recovery_reported,
  r.fine_metal_reported,
  r.concentrate_wet_metric_tons,
  r.concentrate_moisture_pct,
  coalesce(r.calculation_rule_version, 'v2') as calculation_rule_version,
  case
    when r.id is null then 'no_assay'
    when r.head_grade is null or r.concentrate_grade is null or r.tailings_grade is null then 'partial'
    else 'assayed'
  end as metallurgy_state,
  case when s.treated_metric_tons is null or s.mineral_moisture_pct is null then null else s.treated_metric_tons * (1 - s.mineral_moisture_pct / 100) end as mineral_dry_metric_tons,
  case when s.treated_metric_tons is null or s.mineral_moisture_pct is null or r.head_grade is null then null else s.treated_metric_tons * (1 - s.mineral_moisture_pct / 100) * r.head_grade / 100 end as feed_fine_metric_tons,
  case when r.head_grade is null or r.concentrate_grade is null or r.tailings_grade is null or r.head_grade = 0 or r.concentrate_grade = r.tailings_grade then null else ((r.head_grade - r.tailings_grade) * r.concentrate_grade) / ((r.concentrate_grade - r.tailings_grade) * r.head_grade) * 100 end as recovery_by_grades_pct,
  case when r.concentrate_wet_metric_tons is null or r.concentrate_moisture_pct is null then null else r.concentrate_wet_metric_tons * (1 - r.concentrate_moisture_pct / 100) end as concentrate_dry_metric_tons,
  case when r.concentrate_wet_metric_tons is null or r.concentrate_moisture_pct is null or r.concentrate_grade is null then null else r.concentrate_wet_metric_tons * (1 - r.concentrate_moisture_pct / 100) * r.concentrate_grade / 100 end as concentrate_fine_metric_tons,
  case
    when s.treated_metric_tons is null or s.mineral_moisture_pct is null or r.head_grade is null or r.concentrate_wet_metric_tons is null or r.concentrate_moisture_pct is null or r.concentrate_grade is null then null
    when s.treated_metric_tons * (1 - s.mineral_moisture_pct / 100) * r.head_grade / 100 = 0 then null
    else (r.concentrate_wet_metric_tons * (1 - r.concentrate_moisture_pct / 100) * r.concentrate_grade / 100) / (s.treated_metric_tons * (1 - s.mineral_moisture_pct / 100) * r.head_grade / 100) * 100
  end as recovery_by_fine_balance_pct,
  encode(extensions.digest(concat_ws('|', 'production_metallurgy_deterministic_v2', 'v2', s.source_hash, coalesce(r.source_hash, 'NO_ASSAY'), coalesce(s.treated_metric_tons::text, 'NULL'), coalesce(s.mineral_moisture_pct::text, 'NULL'), coalesce(r.head_grade::text, 'NULL'), coalesce(r.concentrate_grade::text, 'NULL'), coalesce(r.tailings_grade::text, 'NULL'), coalesce(r.concentrate_wet_metric_tons::text, 'NULL'), coalesce(r.concentrate_moisture_pct::text, 'NULL')), 'sha256'), 'hex') as deterministic_hash
from public.production_plant_shifts s
left join public.production_metallurgy_results r on r.plant_shift_id = s.id and r.organization_id = s.organization_id;

revoke all on public.production_metallurgy_deterministic_v2 from anon, authenticated;
grant select on public.production_metallurgy_deterministic_v2 to service_role;

create table if not exists public.production_concentrate_shipment_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  shipment_id uuid not null references public.production_concentrate_shipments(id) on delete restrict,
  plant_shift_id uuid not null references public.production_plant_shifts(id) on delete restrict,
  allocated_wet_metric_tons numeric not null check (allocated_wet_metric_tons > 0),
  allocation_rule_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique (organization_id, shipment_id, plant_shift_id)
);

alter table public.production_concentrate_shipment_allocations enable row level security;
revoke all on public.production_concentrate_shipment_allocations from anon, authenticated;
grant select, insert, update, delete on public.production_concentrate_shipment_allocations to service_role;
create index if not exists production_concentrate_allocations_shift_idx on public.production_concentrate_shipment_allocations (organization_id, plant_shift_id);
create index if not exists production_concentrate_allocations_shipment_idx on public.production_concentrate_shipment_allocations (organization_id, shipment_id);

create or replace view public.production_concentrate_dispatch_balance_v1
with (security_invoker = true)
as
select
  m.organization_id,
  m.plant_shift_id,
  m.operation_date,
  m.shift_code,
  m.metallurgy_state,
  m.concentrate_wet_metric_tons as produced_wet_metric_tons,
  coalesce(sum(a.allocated_wet_metric_tons), 0::numeric) as allocated_wet_metric_tons,
  case when m.concentrate_wet_metric_tons is null then null else m.concentrate_wet_metric_tons - coalesce(sum(a.allocated_wet_metric_tons), 0::numeric) end as available_wet_metric_tons,
  case
    when m.concentrate_wet_metric_tons is null then 'unquantified'
    when coalesce(sum(a.allocated_wet_metric_tons), 0::numeric) > m.concentrate_wet_metric_tons then 'overallocated'
    when coalesce(sum(a.allocated_wet_metric_tons), 0::numeric) = m.concentrate_wet_metric_tons then 'fully_allocated'
    when coalesce(sum(a.allocated_wet_metric_tons), 0::numeric) > 0 then 'partially_allocated'
    else 'available'
  end as dispatch_balance_state
from public.production_metallurgy_deterministic_v2 m
left join public.production_concentrate_shipment_allocations a on a.organization_id = m.organization_id and a.plant_shift_id = m.plant_shift_id
group by m.organization_id, m.plant_shift_id, m.operation_date, m.shift_code, m.metallurgy_state, m.concentrate_wet_metric_tons;

revoke all on public.production_concentrate_dispatch_balance_v1 from anon, authenticated;
grant select on public.production_concentrate_dispatch_balance_v1 to service_role;
