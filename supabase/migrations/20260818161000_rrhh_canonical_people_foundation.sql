alter table public.people
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create unique index if not exists uq_people_org_profile
  on public.people(organization_id, profile_id)
  where profile_id is not null;

create table if not exists public.people_employment_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null references public.people(id) on delete restrict,
  cargo_id uuid references public.cargos(id) on delete set null,
  role_title text,
  area text,
  site_name text,
  cost_center_id uuid,
  supervisor_person_id uuid references public.people(id) on delete set null,
  shift_pattern text,
  employment_type text,
  start_date date not null,
  end_date date,
  end_reason text,
  source_type text not null default 'manual',
  source_reference text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_employment_assignments_dates
    check (end_date is null or end_date >= start_date)
);

create index if not exists idx_people_employment_assignments_person
  on public.people_employment_assignments(organization_id, person_id, start_date desc);

create index if not exists idx_people_employment_assignments_active
  on public.people_employment_assignments(organization_id, start_date desc)
  where end_date is null;

alter table public.production_operator_activity
  drop constraint if exists production_operator_activity_person_id_fkey;

alter table public.production_operator_activity
  add constraint production_operator_activity_person_id_fkey
  foreign key (person_id) references public.people(id) on delete restrict;

alter table public.people enable row level security;
alter table public.people_employment_assignments enable row level security;

revoke all on table public.people from anon, authenticated;
revoke all on table public.people_employment_assignments from anon, authenticated;

grant select, insert, update, delete on table public.people to service_role;
grant select, insert, update, delete on table public.people_employment_assignments to service_role;
