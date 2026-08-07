create table if not exists public.maintenance_feedback_change_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  feedback_id uuid not null references public.asset_renewal_verified_feedback(id) on delete restrict,
  canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
  target_type text not null check (target_type in ('strategy','preventive','lifecycle')),
  target_record_id uuid null,
  proposed_payload jsonb not null default '{}'::jsonb,
  reason text not null,
  evidence_reference text null,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','applied','cancelled')),
  proposed_by uuid null,
  proposed_at timestamptz not null default now(),
  decided_by uuid null,
  decided_at timestamptz null,
  decision_note text null,
  applied_by uuid null,
  applied_at timestamptz null,
  result_record_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists maintenance_feedback_change_one_active_per_feedback
  on public.maintenance_feedback_change_proposals (organization_id, feedback_id)
  where status in ('proposed','approved','applied');
create index if not exists maintenance_feedback_change_feedback_idx on public.maintenance_feedback_change_proposals (feedback_id);
create index if not exists maintenance_feedback_change_asset_idx on public.maintenance_feedback_change_proposals (canonical_asset_id);
create index if not exists maintenance_feedback_change_org_status_idx on public.maintenance_feedback_change_proposals (organization_id,status,updated_at desc);

alter table public.maintenance_feedback_change_proposals enable row level security;
revoke all on table public.maintenance_feedback_change_proposals from anon, authenticated;
grant select, insert, update, delete on table public.maintenance_feedback_change_proposals to service_role;