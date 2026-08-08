create table if not exists public.production_import_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  import_batch_id uuid not null references public.production_import_batches(id) on delete restrict,
  exception_type text not null check (exception_type in ('zero_tonnage','invalid_date','invalid_quantity','duplicate_source','incomplete_source','other')),
  reason text not null,
  movement_number text,
  movement_date date,
  source_file text not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  source_hash text not null,
  source_payload jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending' check (review_status in ('pending','reviewed','resolved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_hash)
);

create index if not exists production_import_exceptions_org_status_idx
  on public.production_import_exceptions (organization_id, review_status, exception_type, movement_date desc);

alter table public.production_import_exceptions enable row level security;
revoke all on public.production_import_exceptions from anon, authenticated;
grant select, insert, update, delete on public.production_import_exceptions to service_role;
