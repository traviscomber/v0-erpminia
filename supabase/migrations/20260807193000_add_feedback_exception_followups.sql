create table if not exists public.maintenance_feedback_exception_followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  verification_id uuid not null references public.maintenance_feedback_change_verifications(id) on delete restrict,
  proposal_id uuid not null references public.maintenance_feedback_change_proposals(id) on delete restrict,
  canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
  action_type text not null check (action_type in ('investigate','evidence_collection','change_review','rollback_review')),
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  title text not null,
  description text not null,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  due_date date not null,
  evidence_reference text null,
  closure_note text null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_by uuid null references public.profiles(id) on delete set null,
  closed_at timestamptz null,
  updated_at timestamptz not null default now()
);

create unique index if not exists maintenance_feedback_exception_one_open_type
  on public.maintenance_feedback_exception_followups (organization_id,verification_id,action_type)
  where status='open';
create index if not exists maintenance_feedback_exception_org_status_idx on public.maintenance_feedback_exception_followups (organization_id,status,due_date);
create index if not exists maintenance_feedback_exception_assignee_idx on public.maintenance_feedback_exception_followups (assigned_to,status,due_date);
create index if not exists maintenance_feedback_exception_asset_idx on public.maintenance_feedback_exception_followups (canonical_asset_id);

alter table public.maintenance_feedback_exception_followups enable row level security;
revoke all on table public.maintenance_feedback_exception_followups from anon,authenticated;
grant select,insert,update,delete on table public.maintenance_feedback_exception_followups to service_role;
