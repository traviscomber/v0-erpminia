create table if not exists public.production_geology_hypotheses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  drill_hole_id uuid not null references public.production_drill_holes(id) on delete restrict,
  hole_code text not null,
  origin_type text not null default 'observed_pattern' check (origin_type in ('observed_pattern','manual','assistant_suggestion')),
  origin_pattern_type text,
  title text not null,
  hypothesis_text text not null,
  canonical_observation text not null,
  required_validation text not null,
  guardrail text not null,
  source_rows integer[] not null default '{}'::integer[],
  source_snapshot jsonb not null default '{}'::jsonb,
  evidence_for jsonb not null default '[]'::jsonb,
  evidence_against jsonb not null default '[]'::jsonb,
  missing_evidence jsonb not null default '[]'::jsonb,
  state text not null default 'detected' check (state in ('detected','in_review','supported','rejected','closed')),
  assigned_to text,
  reviewer_comment text,
  created_by text not null,
  created_by_name text,
  reviewed_by text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  closed_at timestamptz,
  last_actor_id text not null,
  last_actor_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_geology_hypotheses_origin_unique unique (organization_id, drill_hole_id, origin_type, origin_pattern_type)
);

create index if not exists production_geology_hypotheses_org_state_idx
  on public.production_geology_hypotheses (organization_id, state, updated_at desc);
create index if not exists production_geology_hypotheses_hole_idx
  on public.production_geology_hypotheses (organization_id, drill_hole_id, updated_at desc);

create table if not exists public.production_geology_hypothesis_events (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.production_geology_hypotheses(id) on delete restrict,
  organization_id uuid not null,
  event_type text not null check (event_type in ('created','updated','state_changed')),
  previous_state text,
  next_state text not null,
  actor_id text not null,
  actor_name text,
  reviewer_comment text,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists production_geology_hypothesis_events_hypothesis_idx
  on public.production_geology_hypothesis_events (hypothesis_id, created_at asc);
create index if not exists production_geology_hypothesis_events_org_idx
  on public.production_geology_hypothesis_events (organization_id, created_at desc);

create or replace function public.capture_production_geology_hypothesis_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.state = 'closed' and old.state is distinct from 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
  end if;
  if new.state in ('supported','rejected') and old.state is distinct from new.state then
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.log_production_geology_hypothesis_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.production_geology_hypothesis_events (
    hypothesis_id, organization_id, event_type, previous_state, next_state,
    actor_id, actor_name, reviewer_comment, snapshot
  ) values (
    new.id,
    new.organization_id,
    case
      when tg_op = 'INSERT' then 'created'
      when old.state is distinct from new.state then 'state_changed'
      else 'updated'
    end,
    case when tg_op = 'INSERT' then null else old.state end,
    new.state,
    new.last_actor_id,
    new.last_actor_name,
    new.reviewer_comment,
    jsonb_build_object(
      'state', new.state,
      'assigned_to', new.assigned_to,
      'evidence_for', new.evidence_for,
      'evidence_against', new.evidence_against,
      'missing_evidence', new.missing_evidence,
      'reviewed_by', new.reviewed_by,
      'reviewed_by_name', new.reviewed_by_name,
      'reviewed_at', new.reviewed_at,
      'closed_at', new.closed_at
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_prepare_production_geology_hypothesis on public.production_geology_hypotheses;
create trigger trg_prepare_production_geology_hypothesis
before update on public.production_geology_hypotheses
for each row execute function public.capture_production_geology_hypothesis_event();

drop trigger if exists trg_log_production_geology_hypothesis on public.production_geology_hypotheses;
create trigger trg_log_production_geology_hypothesis
after insert or update on public.production_geology_hypotheses
for each row execute function public.log_production_geology_hypothesis_event();

revoke all on public.production_geology_hypotheses from anon, authenticated;
revoke all on public.production_geology_hypothesis_events from anon, authenticated;
grant select, insert, update on public.production_geology_hypotheses to service_role;
grant select, insert on public.production_geology_hypothesis_events to service_role;

comment on table public.production_geology_hypotheses is 'Human-review workflow for derived geological hypotheses. Rows are review-layer objects and never source geological facts.';
comment on table public.production_geology_hypothesis_events is 'Append-only audit history for geological hypothesis review.';
comment on column public.production_geology_hypotheses.state is 'Workflow state only. supported does not promote a hypothesis into canonical source geology.';
comment on column public.production_geology_hypotheses.source_snapshot is 'Immutable-at-creation snapshot of the observed pattern evidence used to originate the hypothesis.';
