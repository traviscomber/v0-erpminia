create table if not exists public.asset_renewal_investment_needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  lifecycle_decision_id uuid not null references public.maintenance_asset_lifecycle_decisions(id) on delete restrict,
  canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
  cost_center_id uuid not null references public.cost_centers(id) on delete restrict,
  target_amount numeric(18,2) not null check (target_amount > 0),
  target_date date,
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

create unique index if not exists uq_asset_renewal_investment_need_active
  on public.asset_renewal_investment_needs (organization_id, lifecycle_decision_id)
  where status in ('proposed','approved');

create index if not exists idx_asset_renewal_investment_need_org_status
  on public.asset_renewal_investment_needs (organization_id, status, cost_center_id, updated_at desc);

alter table public.asset_renewal_investment_needs enable row level security;
revoke all on table public.asset_renewal_investment_needs from anon, authenticated;
grant select, insert, update, delete on table public.asset_renewal_investment_needs to service_role;