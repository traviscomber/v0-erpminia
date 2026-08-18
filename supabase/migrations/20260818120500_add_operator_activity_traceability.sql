create table if not exists public.production_operator_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null references public.profiles(id) on delete restrict,
  worker_type text not null check (worker_type in ('operario','mecanico')),
  role_snapshot text,
  operation_date date not null,
  shift_code text not null,
  canonical_asset_id uuid,
  activity_type text not null,
  activity_status text not null default 'completed' check (activity_status in ('planned','in_progress','completed','cancelled')),
  planned_hours numeric,
  actual_hours numeric,
  output_quantity numeric,
  output_unit text,
  checklist_completed boolean,
  safety_observation boolean not null default false,
  incident_id uuid,
  notes text,
  source_type text not null default 'manual' check (source_type in ('manual','import','integration')),
  source_reference text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_operator_activity_hours_nonnegative check ((planned_hours is null or planned_hours >= 0) and (actual_hours is null or actual_hours >= 0)),
  constraint production_operator_activity_output_nonnegative check (output_quantity is null or output_quantity >= 0)
);

create index if not exists idx_operator_activity_org_date
  on public.production_operator_activity (organization_id, operation_date desc);
create index if not exists idx_operator_activity_person_date
  on public.production_operator_activity (organization_id, person_id, operation_date desc);
create index if not exists idx_operator_activity_asset_date
  on public.production_operator_activity (organization_id, canonical_asset_id, operation_date desc)
  where canonical_asset_id is not null;
create index if not exists idx_operator_activity_shift
  on public.production_operator_activity (organization_id, operation_date, shift_code);

alter table public.production_operator_activity enable row level security;
revoke all on table public.production_operator_activity from anon, authenticated;
grant select, insert, update, delete on table public.production_operator_activity to service_role;

comment on table public.production_operator_activity is
  'Canonical operational traceability by person, shift, asset and activity. Historical rows are retained for performance and operational analysis.';
