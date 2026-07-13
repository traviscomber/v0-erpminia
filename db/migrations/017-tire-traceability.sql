create table if not exists public.maintenance_tires (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    tire_code text not null,
    tire_name text not null,
    tire_condition text not null default 'used',
    lifecycle_status text not null default 'in_stock',
    size text,
    brand text,
    model text,
    serial_number text,
    purchase_order_id uuid references public.purchase_orders(id) on delete set null,
    purchase_order_number text,
    work_order_id uuid references public.maintenance_work_orders(id) on delete set null,
    installed_asset_id uuid references public.maintenance_assets(id) on delete set null,
    source_stock_id uuid references public.warehouse_stock(id) on delete set null,
    current_stock_id uuid references public.warehouse_stock(id) on delete set null,
    current_bin_id uuid references public.warehouse_bins(id) on delete set null,
    installed_at timestamp,
    removed_at timestamp,
    notes text,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    unique (organization_id, tire_code),
    constraint tire_condition_check check (tire_condition in ('new', 'used')),
    constraint tire_lifecycle_check check (lifecycle_status in ('in_stock', 'installed', 'in_repair', 'replaced', 'retired'))
);

create table if not exists public.maintenance_tire_events (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    tire_id uuid not null references public.maintenance_tires(id) on delete cascade,
    event_type text not null,
    event_status text,
    purchase_order_id uuid references public.purchase_orders(id) on delete set null,
    work_order_id uuid references public.maintenance_work_orders(id) on delete set null,
    stock_movement_id uuid references public.stock_movements(id) on delete set null,
    stock_id uuid references public.warehouse_stock(id) on delete set null,
    asset_id uuid references public.maintenance_assets(id) on delete set null,
    related_tire_id uuid references public.maintenance_tires(id) on delete set null,
    event_date timestamp default now(),
    quantity integer default 1,
    location text,
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamp default now(),
    constraint tire_events_quantity_check check (quantity > 0)
);

alter table public.maintenance_tires enable row level security;
alter table public.maintenance_tire_events enable row level security;

create policy maintenance_tires_org_isolation on public.maintenance_tires
    using (organization_id in (select organization_id from public.user_roles where user_id = auth.uid()));

create policy maintenance_tire_events_org_isolation on public.maintenance_tire_events
    using (organization_id in (select organization_id from public.user_roles where user_id = auth.uid()));

create index if not exists idx_maintenance_tires_org on public.maintenance_tires(organization_id);
create index if not exists idx_maintenance_tires_status on public.maintenance_tires(lifecycle_status);
create index if not exists idx_maintenance_tires_condition on public.maintenance_tires(tire_condition);
create index if not exists idx_maintenance_tires_purchase_order on public.maintenance_tires(purchase_order_id);
create index if not exists idx_maintenance_tires_work_order on public.maintenance_tires(work_order_id);
create index if not exists idx_maintenance_tire_events_org on public.maintenance_tire_events(organization_id);
create index if not exists idx_maintenance_tire_events_tire_id on public.maintenance_tire_events(tire_id);
create index if not exists idx_maintenance_tire_events_date on public.maintenance_tire_events(event_date);
