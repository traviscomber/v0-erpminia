create table if not exists public.production_normalization_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  rule_code text not null,
  source_type text not null check (source_type in ('tm','ley','leyes','other')),
  source_file_pattern text,
  effective_from date,
  effective_to date,
  raw_unit text not null,
  target_unit text not null default 'metric_ton',
  multiplier numeric not null,
  rule_version text not null,
  status text not null default 'approved' check (status in ('draft','approved','retired')),
  evidence text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rule_code, rule_version)
);

alter table public.production_normalization_rules enable row level security;
revoke all on public.production_normalization_rules from anon, authenticated;
grant select, insert, update, delete on public.production_normalization_rules to service_role;

insert into public.production_normalization_rules
(organization_id,rule_code,source_type,source_file_pattern,effective_from,effective_to,raw_unit,target_unit,multiplier,rule_version,status,evidence)
values
('2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee','tm_metric_tons_pre_2020_10','tm','TM%',null,'2020-09-30','metric_ton','metric_ton',1,'v1','approved','TM sheets through Sep-2020 show per-trip medians around 28-31 and decimals consistent with metric tonnes.'),
('2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee','tm_kg_from_2020_10','tm','TM%','2020-10-01',null,'kg','metric_ton',0.001,'v1','approved','TM Oct-2020 onward changes the same per-trip grain to values around 30000 while route/vehicle patterns remain comparable.'),
('2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee','ley_treated_metric_tons','ley','LEY.xlsx',null,null,'metric_ton','metric_ton',1,'v1','approved','LEY treated-ton values use decimals such as 187.324 and fine-metal formulas divide by 100.'),
('2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee','leyes_treated_kg','leyes','LEYES.xlsx',null,null,'kg','metric_ton',0.001,'v1','approved','LEYES represents comparable treated quantities as integers such as 190377 and corresponding fine-metal formulas divide by 100000.')
on conflict (organization_id,rule_code,rule_version) do nothing;

update public.production_import_batches
set normalization_rule_version='v1', updated_at=now()
where organization_id='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee' and status='pending_normalization';