alter table public.production_import_batches drop constraint if exists production_import_batches_source_type_check;
alter table public.production_import_batches add constraint production_import_batches_source_type_check check (source_type = any (array['tm'::text,'ley'::text,'leyes'::text,'manual'::text,'other'::text]));

alter table public.production_material_movements add column if not exists source_schema_version text;
alter table public.production_material_movements add column if not exists adapter_version text;
alter table public.production_plant_shifts add column if not exists source_schema_version text;
alter table public.production_plant_shifts add column if not exists adapter_version text;
alter table public.production_metallurgy_results add column if not exists galigher_grade numeric;
alter table public.production_metallurgy_results add column if not exists dispatched_metric_tons numeric;

create table if not exists public.production_data_entry_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  entry_mode text not null check (entry_mode in ('mineral_transport','plant_metallurgy')),
  entry_source text not null check (entry_source in ('manual','excel_import')),
  import_batch_id uuid references public.production_import_batches(id) on delete set null,
  template_version text not null,
  status text not null default 'draft' check (status in ('draft','validated','committed','rejected')),
  validation_summary jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists production_data_entry_sessions_org_status_idx on public.production_data_entry_sessions (organization_id,status,created_at desc);
alter table public.production_data_entry_sessions enable row level security;
revoke all on table public.production_data_entry_sessions from anon, authenticated;
grant select,insert,update,delete on table public.production_data_entry_sessions to service_role;

create table if not exists public.production_import_mapping_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_type text not null check (source_type in ('tm','ley','leyes')),
  source_schema_code text not null,
  source_year_from integer,
  source_year_to integer,
  target_schema_code text not null,
  field_mapping jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved','retired')),
  evidence text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_schema_code, target_schema_code)
);
create index if not exists production_import_mapping_profiles_org_idx on public.production_import_mapping_profiles (organization_id,source_type,status);
alter table public.production_import_mapping_profiles enable row level security;
revoke all on table public.production_import_mapping_profiles from anon, authenticated;
grant select,insert,update,delete on table public.production_import_mapping_profiles to service_role;

create table if not exists public.production_calculation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  rule_code text not null,
  domain text not null check (domain in ('metallurgy','dispatch','cumulative')),
  output_field text not null,
  input_fields jsonb not null,
  formula_description text not null,
  rule_version text not null,
  status text not null default 'approved' check (status in ('draft','approved','retired')),
  evidence text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,rule_code,rule_version)
);
alter table public.production_calculation_rules enable row level security;
revoke all on table public.production_calculation_rules from anon, authenticated;
grant select,insert,update,delete on table public.production_calculation_rules to service_role;

insert into public.production_calculation_rules (organization_id,rule_code,domain,output_field,input_fields,formula_description,rule_version,status,evidence)
select o.id,'MET_RECOVERY_V1','metallurgy','recovery_calculated','["head_grade","concentrate_grade","tailings_grade"]'::jsonb,'((head_grade - tailings_grade) * concentrate_grade) / ((concentrate_grade - tailings_grade) * head_grade) * 100','v1','approved','Replicates the recovery formula observed in LEY.xlsx and LEYES.xlsx using canonical grade inputs.' from public.organizations o where o.name='N3uralia' on conflict do nothing;
insert into public.production_calculation_rules (organization_id,rule_code,domain,output_field,input_fields,formula_description,rule_version,status,evidence)
select o.id,'MET_FINE_TREATED_V1','metallurgy','fine_metal_calculated','["humidity_factor","treated_metric_tons","head_grade"]'::jsonb,'humidity_factor * treated_metric_tons * head_grade / 100','v1','approved','Equivalent to LEY/LEYES fine-contained formula after normalizing treated quantity to metric tons.' from public.organizations o where o.name='N3uralia' on conflict do nothing;
insert into public.production_calculation_rules (organization_id,rule_code,domain,output_field,input_fields,formula_description,rule_version,status,evidence)
select o.id,'MET_REAL_FINE_DISPATCH_V1','dispatch','real_fine_dispatch_calculated','["dispatch_moisture","dispatch_grade","dispatched_metric_tons"]'::jsonb,'(1 - dispatch_moisture / 100) * (dispatch_grade / 100) * dispatched_metric_tons','v1','approved','Equivalent to LEY/LEYES real-fine dispatch formula after normalizing dispatched quantity to metric tons.' from public.organizations o where o.name='N3uralia' on conflict do nothing;

create or replace view public.production_metallurgy_automatic_v1 with (security_invoker=true) as
select r.*,
  case when r.head_grade is null or r.concentrate_grade is null or r.tailings_grade is null or r.head_grade=0 or r.concentrate_grade=r.tailings_grade then null else ((r.head_grade-r.tailings_grade)*r.concentrate_grade)/((r.concentrate_grade-r.tailings_grade)*r.head_grade)*100 end as automatic_recovery,
  case when s.humidity_factor is null or s.treated_metric_tons is null or r.head_grade is null then null else s.humidity_factor*s.treated_metric_tons*r.head_grade/100 end as automatic_fine_treated,
  case when r.dispatch_moisture is null or r.dispatch_grade is null or r.dispatched_metric_tons is null then null else (1-r.dispatch_moisture/100)*(r.dispatch_grade/100)*r.dispatched_metric_tons end as automatic_real_fine_dispatch,
  sum(case when s.humidity_factor is null or s.treated_metric_tons is null or r.head_grade is null then 0 else s.humidity_factor*s.treated_metric_tons*r.head_grade/100 end) over (partition by r.organization_id order by s.operation_date,s.shift_code,r.id rows unbounded preceding) as automatic_fine_treated_cumulative,
  sum(case when r.dispatch_moisture is null or r.dispatch_grade is null or r.dispatched_metric_tons is null then 0 else (1-r.dispatch_moisture/100)*(r.dispatch_grade/100)*r.dispatched_metric_tons end) over (partition by r.organization_id order by s.operation_date,s.shift_code,r.id rows unbounded preceding) as automatic_real_fine_dispatch_cumulative
from public.production_metallurgy_results r
join public.production_plant_shifts s on s.id=r.plant_shift_id and s.organization_id=r.organization_id;
revoke all on public.production_metallurgy_automatic_v1 from anon, authenticated;
grant select on public.production_metallurgy_automatic_v1 to service_role;