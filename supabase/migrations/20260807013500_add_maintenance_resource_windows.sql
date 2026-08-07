create table if not exists public.maintenance_resource_windows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  resource_type text not null check (resource_type in ('person','asset')),
  resource_id uuid not null,
  start_date date not null,
  end_date date not null,
  availability text not null default 'unavailable' check (availability in ('available','unavailable')),
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_resource_windows_dates check (end_date >= start_date)
);

create index if not exists idx_maintenance_resource_windows_org_dates
  on public.maintenance_resource_windows (organization_id, start_date, end_date);
create index if not exists idx_maintenance_resource_windows_resource
  on public.maintenance_resource_windows (organization_id, resource_type, resource_id);

alter table public.maintenance_resource_windows enable row level security;
revoke all on table public.maintenance_resource_windows from anon, authenticated;
grant select, insert, update, delete on table public.maintenance_resource_windows to service_role;
