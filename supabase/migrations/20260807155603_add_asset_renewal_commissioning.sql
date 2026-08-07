create table if not exists public.asset_renewal_commissioning_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  initiative_id uuid not null references public.asset_renewal_execution_initiatives(id) on delete restrict,
  previous_asset_id uuid not null references canonical.assets(id) on delete restrict,
  replacement_asset_id uuid null references canonical.assets(id) on delete restrict,
  decision_type text not null check (decision_type in ('commissioned','closed','replacement_effective')),
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','inactive')),
  commissioning_date date null,
  reason text not null,
  evidence_reference text null,
  proposed_by uuid null,
  proposed_at timestamptz not null default now(),
  approved_by uuid null,
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (replacement_asset_id is null or replacement_asset_id <> previous_asset_id),
  check (decision_type = 'replacement_effective' or replacement_asset_id is null)
);

create unique index if not exists asset_renewal_commissioning_one_active_per_initiative
  on public.asset_renewal_commissioning_decisions (organization_id, initiative_id)
  where status in ('proposed','approved');

create index if not exists asset_renewal_commissioning_previous_asset_idx
  on public.asset_renewal_commissioning_decisions (organization_id, previous_asset_id);

create index if not exists asset_renewal_commissioning_replacement_asset_idx
  on public.asset_renewal_commissioning_decisions (organization_id, replacement_asset_id)
  where replacement_asset_id is not null;

alter table public.asset_renewal_commissioning_decisions enable row level security;
revoke select, insert, update, delete on public.asset_renewal_commissioning_decisions from anon, authenticated;
grant select, insert, update, delete on public.asset_renewal_commissioning_decisions to service_role;
