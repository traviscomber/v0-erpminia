create table if not exists public.data_reconciliation_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  issue_key text not null,
  entity_type text not null check (entity_type in ('product','supplier','asset','person','inventory','work_order')),
  entity_id uuid,
  issue_type text not null,
  field_name text,
  status text not null default 'open' check (status in ('open','accepted','resolved','ignored')),
  resolution_note text,
  evidence_reference text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, issue_key)
);

create index if not exists idx_data_reconciliation_reviews_org_status
  on public.data_reconciliation_reviews (organization_id, status, updated_at desc);
create index if not exists idx_data_reconciliation_reviews_entity
  on public.data_reconciliation_reviews (organization_id, entity_type, entity_id);

alter table public.data_reconciliation_reviews enable row level security;
revoke all on table public.data_reconciliation_reviews from anon, authenticated;
grant select, insert, update, delete on table public.data_reconciliation_reviews to service_role;
