create table if not exists public.maintenance_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  campaign_type text not null default 'campaign' check (campaign_type in ('campaign','shutdown')),
  status text not null default 'planned' check (status in ('planned','active','completed','cancelled')),
  start_date date not null,
  end_date date not null,
  scope text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_maintenance_campaigns_org_dates
  on public.maintenance_campaigns (organization_id, start_date, end_date);

create table if not exists public.maintenance_campaign_work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  campaign_id uuid not null references public.maintenance_campaigns(id) on delete cascade,
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete restrict,
  sequence_no integer not null default 0 check (sequence_no >= 0),
  planned_start_date date,
  planned_end_date date,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, work_order_id),
  check (planned_end_date is null or planned_start_date is null or planned_end_date >= planned_start_date)
);

create index if not exists idx_campaign_work_orders_org_campaign
  on public.maintenance_campaign_work_orders (organization_id, campaign_id, sequence_no);
create index if not exists idx_campaign_work_orders_work_order
  on public.maintenance_campaign_work_orders (work_order_id);

create table if not exists public.maintenance_campaign_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  campaign_id uuid not null references public.maintenance_campaigns(id) on delete cascade,
  predecessor_work_order_id uuid not null references public.maintenance_work_orders(id) on delete restrict,
  successor_work_order_id uuid not null references public.maintenance_work_orders(id) on delete restrict,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (campaign_id, predecessor_work_order_id, successor_work_order_id),
  check (predecessor_work_order_id <> successor_work_order_id)
);

create index if not exists idx_campaign_dependencies_org_campaign
  on public.maintenance_campaign_dependencies (organization_id, campaign_id);

alter table public.maintenance_campaigns enable row level security;
alter table public.maintenance_campaign_work_orders enable row level security;
alter table public.maintenance_campaign_dependencies enable row level security;

revoke all on public.maintenance_campaigns from anon, authenticated;
revoke all on public.maintenance_campaign_work_orders from anon, authenticated;
revoke all on public.maintenance_campaign_dependencies from anon, authenticated;

grant select, insert, update, delete on public.maintenance_campaigns to service_role;
grant select, insert, update, delete on public.maintenance_campaign_work_orders to service_role;
grant select, insert, update, delete on public.maintenance_campaign_dependencies to service_role;
