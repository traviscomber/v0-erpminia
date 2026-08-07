create table if not exists public.asset_renewal_execution_initiatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  investment_need_id uuid not null references public.asset_renewal_investment_needs(id) on delete restrict,
  canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
  status text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled')),
  execution_note text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_asset_renewal_execution_active
  on public.asset_renewal_execution_initiatives (organization_id, investment_need_id)
  where status <> 'cancelled';

create index if not exists idx_asset_renewal_execution_org_status
  on public.asset_renewal_execution_initiatives (organization_id, status, updated_at desc);

create table if not exists public.asset_renewal_execution_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  initiative_id uuid not null references public.asset_renewal_execution_initiatives(id) on delete cascade,
  link_type text not null check (link_type in ('purchase_order','contract','work_order')),
  purchase_order_id uuid references public.purchase_orders(id) on delete restrict,
  contract_id uuid references public.contracts(id) on delete restrict,
  work_order_id uuid references public.maintenance_work_orders(id) on delete restrict,
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint asset_renewal_execution_link_exactly_one check (
    ((purchase_order_id is not null)::int + (contract_id is not null)::int + (work_order_id is not null)::int) = 1
  ),
  constraint asset_renewal_execution_link_type_match check (
    (link_type = 'purchase_order' and purchase_order_id is not null and contract_id is null and work_order_id is null)
    or (link_type = 'contract' and contract_id is not null and purchase_order_id is null and work_order_id is null)
    or (link_type = 'work_order' and work_order_id is not null and purchase_order_id is null and contract_id is null)
  )
);

create unique index if not exists uq_asset_renewal_execution_po
  on public.asset_renewal_execution_links (initiative_id, purchase_order_id)
  where purchase_order_id is not null;
create unique index if not exists uq_asset_renewal_execution_contract
  on public.asset_renewal_execution_links (initiative_id, contract_id)
  where contract_id is not null;
create unique index if not exists uq_asset_renewal_execution_wo
  on public.asset_renewal_execution_links (initiative_id, work_order_id)
  where work_order_id is not null;
create index if not exists idx_asset_renewal_execution_links_org
  on public.asset_renewal_execution_links (organization_id, initiative_id, created_at desc);

alter table public.asset_renewal_execution_initiatives enable row level security;
alter table public.asset_renewal_execution_links enable row level security;
revoke all on table public.asset_renewal_execution_initiatives from anon, authenticated;
revoke all on table public.asset_renewal_execution_links from anon, authenticated;
grant select, insert, update, delete on table public.asset_renewal_execution_initiatives to service_role;
grant select, insert, update, delete on table public.asset_renewal_execution_links to service_role;