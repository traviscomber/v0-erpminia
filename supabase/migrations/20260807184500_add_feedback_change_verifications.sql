create table if not exists public.maintenance_feedback_change_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  proposal_id uuid not null references public.maintenance_feedback_change_proposals(id) on delete restrict,
  canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
  result text not null check (result in ('verified','diverged','needs_follow_up')),
  status text not null default 'closed' check (status in ('closed','reopened')),
  note text not null,
  observed_snapshot jsonb null,
  verified_by uuid null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists maintenance_feedback_verification_one_closed_per_proposal
  on public.maintenance_feedback_change_verifications (organization_id,proposal_id)
  where status='closed';
create index if not exists maintenance_feedback_verification_asset_idx on public.maintenance_feedback_change_verifications (canonical_asset_id);
create index if not exists maintenance_feedback_verification_org_idx on public.maintenance_feedback_change_verifications (organization_id,verified_at desc);

alter table public.maintenance_feedback_change_verifications enable row level security;
revoke all on table public.maintenance_feedback_change_verifications from anon,authenticated;
grant select,insert,update,delete on table public.maintenance_feedback_change_verifications to service_role;