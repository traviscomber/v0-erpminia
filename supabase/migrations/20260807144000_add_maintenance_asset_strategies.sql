create table if not exists public.maintenance_asset_strategies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  canonical_asset_id uuid not null references canonical.assets(id) on delete cascade,
  criticality_level text not null check (criticality_level in ('critical','high','medium','low')),
  maintenance_strategy text not null check (maintenance_strategy in ('preventive','predictive','inspection','run_to_failure')),
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','inactive')),
  reason text not null,
  evidence_reference text,
  proposed_by uuid,
  proposed_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_maintenance_asset_strategy_active
  on public.maintenance_asset_strategies (organization_id, canonical_asset_id)
  where status in ('proposed','approved');

create index if not exists idx_maintenance_asset_strategy_org_status
  on public.maintenance_asset_strategies (organization_id, status, criticality_level, updated_at desc);

alter table public.maintenance_asset_strategies enable row level security;
revoke all on table public.maintenance_asset_strategies from anon, authenticated;
grant select, insert, update, delete on table public.maintenance_asset_strategies to service_role;