alter table public.motil_ai_decision_cases
  add column if not exists last_revalidated_at timestamptz,
  add column if not exists last_revalidated_by_user_id uuid,
  add column if not exists last_revalidation_evidence_refs jsonb not null default '[]'::jsonb;

comment on column public.motil_ai_decision_cases.last_revalidated_at is
  'Advisory metadata only: timestamp of the latest successful specialist revalidation against authorized MOTIL evidence. Never operational truth, approval, or authorization.';

comment on column public.motil_ai_decision_cases.last_revalidated_by_user_id is
  'User whose authorized specialist request caused the latest advisory revalidation. Does not imply approval or ownership of an operational action.';

comment on column public.motil_ai_decision_cases.last_revalidation_evidence_refs is
  'Server-derived provenance references used by the latest specialist revalidation. Advisory/audit metadata only; never a replacement for canonical source data.';

create index if not exists motil_ai_decision_cases_open_revalidation_idx
  on public.motil_ai_decision_cases (organization_id, created_by_user_id, target_domain, last_revalidated_at desc)
  where status = 'open';
