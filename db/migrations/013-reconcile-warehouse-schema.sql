-- Reconciliacion productiva de Bodega / Inventario
-- Hace Fase 4 idempotente y autosuficiente para entornos con drift

create extension if not exists pgcrypto;

create table if not exists public.spare_parts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    part_code text not null,
    part_name text not null,
    asset_type text,
    current_stock integer default 0,
    minimum_stock_level integer,
    maximum_stock_level integer,
    unit_cost numeric,
    supplier_id uuid,
    lead_time_days integer,
    created_at timestamp default now(),
    unique (organization_id, part_code)
);

create table if not exists public.warehouse_zones (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    zone_code text not null,
    zone_name text not null,
    description text,
    created_at timestamp default now(),
    unique (organization_id, zone_code)
);

create table if not exists public.warehouse_racks (
    id uuid primary key default gen_random_uuid(),
    zone_id uuid not null references public.warehouse_zones(id) on delete cascade,
    rack_code text not null,
    rack_name text not null,
    capacity_units integer,
    created_at timestamp default now(),
    unique (zone_id, rack_code)
);

create table if not exists public.warehouse_bins (
    id uuid primary key default gen_random_uuid(),
    rack_id uuid not null references public.warehouse_racks(id) on delete cascade,
    bin_code text not null,
    bin_location text,
    capacity_units integer,
    current_stock integer default 0,
    created_at timestamp default now(),
    unique (rack_id, bin_code)
);

create table if not exists public.warehouse_stock (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    part_id uuid references public.spare_parts(id) on delete set null,
    part_code text not null,
    part_name text not null,
    bin_id uuid references public.warehouse_bins(id) on delete set null,
    quantity_on_hand integer default 0,
    quantity_reserved integer default 0,
    reorder_level integer,
    reorder_quantity integer,
    unit_cost numeric,
    last_counted_date date,
    expiry_date date,
    batch_number text,
    supplier_lot text,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

create table if not exists public.stock_movements (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    stock_id uuid not null references public.warehouse_stock(id) on delete cascade,
    movement_type text not null,
    quantity integer not null,
    from_bin_id uuid references public.warehouse_bins(id) on delete set null,
    to_bin_id uuid references public.warehouse_bins(id) on delete set null,
    reference_doc text,
    reference_id uuid,
    performed_by uuid references auth.users(id) on delete set null,
    reason text,
    notes text,
    created_at timestamp default now()
);

create table if not exists public.qr_codes (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    qr_code_value text not null,
    stock_id uuid not null references public.warehouse_stock(id) on delete cascade,
    bin_id uuid references public.warehouse_bins(id),
    status text default 'active',
    scans_count integer default 0,
    last_scan_date timestamp,
    created_at timestamp default now(),
    unique (organization_id, qr_code_value)
);

create table if not exists public.stock_transfers (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    transfer_number text not null,
    from_bin_id uuid not null references public.warehouse_bins(id) on delete cascade,
    to_bin_id uuid not null references public.warehouse_bins(id) on delete cascade,
    stock_id uuid not null references public.warehouse_stock(id) on delete cascade,
    quantity integer not null,
    status text default 'pending',
    requested_by uuid references auth.users(id) on delete set null,
    approved_by uuid references auth.users(id) on delete set null,
    completed_by uuid references auth.users(id) on delete set null,
    requested_at timestamp default now(),
    approved_at timestamp,
    completed_at timestamp,
    reason text,
    unique (organization_id, transfer_number)
);

create table if not exists public.reorder_alerts (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    stock_id uuid not null references public.warehouse_stock(id) on delete cascade,
    alert_type text,
    threshold_value integer,
    current_value integer,
    status text default 'active',
    acknowledged_by uuid references auth.users(id) on delete set null,
    acknowledged_at timestamp,
    created_at timestamp default now()
);

alter table public.warehouse_stock
    add column if not exists quantity_available integer generated always as (quantity_on_hand - quantity_reserved) stored;

alter table public.warehouse_zones
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
    add column if not exists zone_code text,
    add column if not exists zone_name text,
    add column if not exists description text,
    add column if not exists created_at timestamp default now();

alter table public.warehouse_racks
    add column if not exists zone_id uuid references public.warehouse_zones(id) on delete cascade,
    add column if not exists rack_code text,
    add column if not exists rack_name text,
    add column if not exists capacity_units integer,
    add column if not exists created_at timestamp default now();

alter table public.warehouse_bins
    add column if not exists rack_id uuid references public.warehouse_racks(id) on delete cascade,
    add column if not exists bin_code text,
    add column if not exists bin_location text,
    add column if not exists capacity_units integer,
    add column if not exists current_stock integer default 0,
    add column if not exists created_at timestamp default now();

alter table public.warehouse_stock
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
    add column if not exists part_id uuid references public.spare_parts(id) on delete set null,
    add column if not exists part_code text,
    add column if not exists part_name text,
    add column if not exists bin_id uuid references public.warehouse_bins(id) on delete set null,
    add column if not exists quantity_on_hand integer default 0,
    add column if not exists quantity_reserved integer default 0,
    add column if not exists reorder_level integer,
    add column if not exists reorder_quantity integer,
    add column if not exists unit_cost numeric,
    add column if not exists last_counted_date date,
    add column if not exists expiry_date date,
    add column if not exists batch_number text,
    add column if not exists supplier_lot text,
    add column if not exists created_at timestamp default now(),
    add column if not exists updated_at timestamp default now();

alter table public.stock_movements
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
    add column if not exists stock_id uuid references public.warehouse_stock(id) on delete cascade,
    add column if not exists movement_type text,
    add column if not exists quantity integer,
    add column if not exists from_bin_id uuid references public.warehouse_bins(id) on delete set null,
    add column if not exists to_bin_id uuid references public.warehouse_bins(id) on delete set null,
    add column if not exists reference_doc text,
    add column if not exists reference_id uuid,
    add column if not exists performed_by uuid references auth.users(id) on delete set null,
    add column if not exists reason text,
    add column if not exists notes text,
    add column if not exists created_at timestamp default now();

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'warehouse_stock_org_part_batch_key'
    ) then
        alter table public.warehouse_stock
            add constraint warehouse_stock_org_part_batch_key
            unique (organization_id, part_code, batch_number);
    end if;
exception
    when duplicate_table or duplicate_object then null;
end $$;

update public.warehouse_stock
set
    quantity_on_hand = coalesce(quantity_on_hand, 0),
    quantity_reserved = coalesce(quantity_reserved, 0),
    reorder_level = coalesce(reorder_level, 0),
    reorder_quantity = coalesce(reorder_quantity, 0),
    unit_cost = coalesce(unit_cost, 0),
    updated_at = coalesce(updated_at, now())
where true;

create index if not exists idx_warehouse_stock_org on public.warehouse_stock(organization_id);
create index if not exists idx_warehouse_stock_part_code on public.warehouse_stock(part_code);
create index if not exists idx_warehouse_stock_bin_id on public.warehouse_stock(bin_id);
create index if not exists idx_warehouse_stock_quantity on public.warehouse_stock(quantity_on_hand);
create index if not exists idx_warehouse_zones_org on public.warehouse_zones(organization_id);
create index if not exists idx_warehouse_racks_zone_id on public.warehouse_racks(zone_id);
create index if not exists idx_warehouse_bins_rack_id on public.warehouse_bins(rack_id);
create index if not exists idx_stock_movements_stock_id on public.stock_movements(stock_id);
create index if not exists idx_reorder_alerts_stock on public.reorder_alerts(stock_id);
