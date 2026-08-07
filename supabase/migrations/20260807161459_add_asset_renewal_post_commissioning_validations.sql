create table if not exists public.asset_renewal_post_commissioning_validations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  commissioning_decision_id uuid not null references public.asset_renewal_commissioning_decisions(id) on delete restrict,
  previous_asset_id uuid not null references canonical.assets(id) on delete restrict,
  evaluated_asset_id uuid not null references canonical.assets(id) on delete restrict,
  baseline_start_date date not null,
  baseline_end_date date not null,
  post_start_date date not null,
  post_end_date date not null,
  result text not null check (result in ('satisfactory','requires_follow_up','insufficient_evidence')),
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','inactive')),
  reason text not null,
  evidence_reference text null,
  evidence_snapshot jsonb null,
  proposed_by uuid null,
  proposed_at timestamptz not null default now(),
  approved_by uuid null,
  approved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (baseline_start_date <= baseline_end_date),
  check (post_start_date <= post_end_date),
  check (baseline_end_date < post_start_date)
);

create unique index if not exists asset_renewal_post_validation_one_active_per_closure
  on public.asset_renewal_post_commissioning_validations (organization_id, commissioning_decision_id)
  where status in ('proposed','approved');

create index if not exists asset_renewal_post_validation_previous_asset_idx
  on public.asset_renewal_post_commissioning_validations (organization_id, previous_asset_id, baseline_end_date);

create index if not exists asset_renewal_post_validation_evaluated_asset_idx
  on public.asset_renewal_post_commissioning_validations (organization_id, evaluated_asset_id, post_end_date);

alter table public.asset_renewal_post_commissioning_validations enable row level security;
revoke all on table public.asset_renewal_post_commissioning_validations from anon, authenticated;
grant all on table public.asset_renewal_post_commissioning_validations to service_role;
