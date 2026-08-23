create table if not exists public.production_chemistry_samples (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  sample_code text not null,
  sample_type text not null,
  sample_date date,
  mine_source_id uuid,
  mine_sector_id uuid,
  drill_hole_id uuid,
  depth_from_m numeric,
  depth_to_m numeric,
  source_file text,
  source_sheet text,
  source_row integer,
  source_hash text,
  source_payload jsonb,
  validation_status text not null default 'valid',
  validation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sample_code, source_file, source_sheet, source_row)
);
create table if not exists public.production_chemistry_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  sample_id uuid not null references public.production_chemistry_samples(id) on delete cascade,
  analyte_code text not null,
  analyte_name text,
  result_value numeric,
  result_unit text,
  detection_limit numeric,
  method_code text,
  laboratory text,
  result_date date,
  source_file text,
  source_sheet text,
  source_row integer,
  source_hash text,
  source_payload jsonb,
  validation_status text not null default 'valid',
  validation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sample_id, analyte_code, source_file, source_sheet, source_row)
);
create index if not exists idx_production_chemistry_samples_org_hole on public.production_chemistry_samples(organization_id, drill_hole_id);
create index if not exists idx_production_chemistry_samples_org_sector on public.production_chemistry_samples(organization_id, mine_sector_id);
create index if not exists idx_production_chemistry_results_org_sample on public.production_chemistry_results(organization_id, sample_id);
alter table public.production_chemistry_samples enable row level security;
alter table public.production_chemistry_results enable row level security;
revoke all on public.production_chemistry_samples from anon, authenticated;
revoke all on public.production_chemistry_results from anon, authenticated;
grant all on public.production_chemistry_samples to service_role;
grant all on public.production_chemistry_results to service_role;
create or replace view public.production_chemistry_source_quality_v1 as
select
  o.organization_id,
  count(distinct s.id)::int as samples,
  count(r.id)::int as results,
  count(distinct s.drill_hole_id)::int as holes_with_samples,
  count(distinct s.mine_sector_id)::int as sectors_with_samples,
  count(*) filter (where s.validation_status='review')::int as sample_review_rows,
  count(*) filter (where r.validation_status='review')::int as result_review_rows
from (select distinct organization_id from public.production_source_documents) o
left join public.production_chemistry_samples s on s.organization_id=o.organization_id
left join public.production_chemistry_results r on r.organization_id=o.organization_id and r.sample_id=s.id
group by o.organization_id;
