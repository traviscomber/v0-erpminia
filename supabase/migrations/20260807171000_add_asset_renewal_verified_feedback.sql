create table if not exists public.asset_renewal_verified_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  validation_id uuid not null references public.asset_renewal_post_commissioning_validations(id) on delete restrict,
  canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
  feedback_type text not null check (feedback_type in ('strategy_review','preventive_frequency_review','lifecycle_review')),
  status text not null default 'proposed' check (status in ('proposed','accepted','discarded','inactive')),
  reason text not null,
  evidence_reference text null,
  proposed_by uuid null,
  proposed_at timestamptz not null default now(),
  decided_by uuid null,
  decided_at timestamptz null,
  decision_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists asset_renewal_feedback_one_active_per_validation_type
  on public.asset_renewal_verified_feedback (organization_id, validation_id, feedback_type)
  where status in ('proposed','accepted');
create index if not exists asset_renewal_feedback_validation_idx on public.asset_renewal_verified_feedback (validation_id);
create index if not exists asset_renewal_feedback_asset_idx on public.asset_renewal_verified_feedback (canonical_asset_id);
create index if not exists asset_renewal_feedback_org_status_idx on public.asset_renewal_verified_feedback (organization_id, status, updated_at desc);

alter table public.asset_renewal_verified_feedback enable row level security;
revoke all on table public.asset_renewal_verified_feedback from anon, authenticated;
grant select, insert, update, delete on table public.asset_renewal_verified_feedback to service_role;
