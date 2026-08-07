create table if not exists public.maintenance_asset_lifecycle_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  canonical_asset_id uuid not null references canonical.assets(id) on delete cascade,
  decision_type text not null check (decision_type in ('maintain','repair','rebuild','replace','retire')),
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','inactive')),
  reason text not null,
  evidence_reference text,
  target_date date,
  proposed_by uuid,
  proposed_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_asset_lifecycle_decision_active
  on public.maintenance_asset_lifecycle_decisions (organization_id, canonical_asset_id)
  where status in ('proposed','approved');

create index if not exists idx_asset_lifecycle_decision_org_status
  on public.maintenance_asset_lifecycle_decisions (organization_id, status, decision_type, updated_at desc);

alter table public.maintenance_asset_lifecycle_decisions enable row level security;
revoke all on table public.maintenance_asset_lifecycle_decisions from anon, authenticated;
grant select, insert, update, delete on table public.maintenance_asset_lifecycle_decisions to service_role;