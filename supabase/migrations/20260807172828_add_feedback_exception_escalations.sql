create table if not exists public.maintenance_feedback_exception_escalations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
 target_type text not null check (target_type in ('strategy','preventive','lifecycle')), status text not null default 'open' check (status in ('open','closed','cancelled')),
 recurrence_count integer not null check (recurrence_count >= 2), overdue_followup_count integer not null default 0 check (overdue_followup_count >= 0),
 assigned_to uuid not null references public.profiles(id) on delete restrict, rationale text not null, evidence_reference text, created_by uuid, created_at timestamptz not null default now(),
 closed_by uuid, closed_at timestamptz, closure_note text, updated_at timestamptz not null default now());
create table if not exists public.maintenance_feedback_exception_escalation_sources (
 escalation_id uuid not null references public.maintenance_feedback_exception_escalations(id) on delete cascade,
 verification_id uuid not null references public.maintenance_feedback_change_verifications(id) on delete restrict,
 followup_id uuid references public.maintenance_feedback_exception_followups(id) on delete restrict,
 primary key (escalation_id, verification_id));
create unique index if not exists maintenance_feedback_exception_escalation_open_uq on public.maintenance_feedback_exception_escalations(organization_id,canonical_asset_id,target_type) where status='open';
create index if not exists maintenance_feedback_exception_escalations_org_status_idx on public.maintenance_feedback_exception_escalations(organization_id,status,updated_at desc);
create index if not exists maintenance_feedback_exception_escalations_assignee_idx on public.maintenance_feedback_exception_escalations(assigned_to);
create index if not exists maintenance_feedback_exception_escalation_sources_verification_idx on public.maintenance_feedback_exception_escalation_sources(verification_id);
create index if not exists maintenance_feedback_exception_escalation_sources_followup_idx on public.maintenance_feedback_exception_escalation_sources(followup_id);
alter table public.maintenance_feedback_exception_escalations enable row level security;
alter table public.maintenance_feedback_exception_escalation_sources enable row level security;
revoke all on public.maintenance_feedback_exception_escalations from anon,authenticated;
revoke all on public.maintenance_feedback_exception_escalation_sources from anon,authenticated;
grant select,insert,update,delete on public.maintenance_feedback_exception_escalations to service_role;
grant select,insert,update,delete on public.maintenance_feedback_exception_escalation_sources to service_role;