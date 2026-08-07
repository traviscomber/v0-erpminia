create table if not exists public.operational_shift_handovers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  outgoing_person_id uuid not null,
  incoming_person_id uuid not null,
  work_order_id uuid,
  canonical_asset_id uuid,
  summary text not null,
  risk text,
  status text not null default 'open' check (status in ('open','received')),
  created_by uuid,
  created_at timestamptz not null default now(),
  received_by uuid,
  received_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint operational_shift_handovers_people check (outgoing_person_id <> incoming_person_id)
);

create index if not exists idx_shift_handovers_org_created
  on public.operational_shift_handovers (organization_id, created_at desc);
create index if not exists idx_shift_handovers_incoming_status
  on public.operational_shift_handovers (organization_id, incoming_person_id, status);
create index if not exists idx_shift_handovers_work_order
  on public.operational_shift_handovers (organization_id, work_order_id) where work_order_id is not null;
create index if not exists idx_shift_handovers_asset
  on public.operational_shift_handovers (organization_id, canonical_asset_id) where canonical_asset_id is not null;

alter table public.operational_shift_handovers enable row level security;
revoke all on table public.operational_shift_handovers from anon, authenticated;
grant select, insert, update, delete on table public.operational_shift_handovers to service_role;
