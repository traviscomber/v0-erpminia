-- Preparacion de base para importar Existencias (compras, proveedores y stock)
-- No borra datos existentes. Solo agrega estructura faltante o refuerza indices.

create extension if not exists pgcrypto;

-- 1) Purchase orders: base minima compatible con la importacion
create table if not exists public.purchase_orders (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    po_number text not null,
    vendor_name text not null,
    item_code text not null,
    quantity numeric(15,2) not null default 0,
    unit_price numeric(15,2) not null default 0,
    total_amount numeric(15,2) not null default 0,
    delivery_date date,
    status text not null default 'draft',
    cost_center_id uuid references public.cost_centers(id) on delete set null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamp default now(),
    updated_at timestamp default now()
);

alter table if exists public.purchase_orders
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
    add column if not exists po_number text,
    add column if not exists vendor_name text,
    add column if not exists item_code text,
    add column if not exists quantity numeric(15,2) default 0,
    add column if not exists unit_price numeric(15,2) default 0,
    add column if not exists total_amount numeric(15,2) default 0,
    add column if not exists delivery_date date,
    add column if not exists status text default 'draft',
    add column if not exists cost_center_id uuid references public.cost_centers(id) on delete set null,
    add column if not exists created_by uuid references auth.users(id) on delete set null,
    add column if not exists created_at timestamp default now(),
    add column if not exists updated_at timestamp default now();

-- Si ya habia datos, esto permite reimportar sin duplicar el mismo documento por empresa.
create unique index if not exists idx_purchase_orders_org_po_number
    on public.purchase_orders (organization_id, po_number);

create index if not exists idx_purchase_orders_org on public.purchase_orders (organization_id);
create index if not exists idx_purchase_orders_status on public.purchase_orders (status);
create index if not exists idx_purchase_orders_delivery_date on public.purchase_orders (delivery_date);
create index if not exists idx_purchase_orders_created_at on public.purchase_orders (created_at);

-- 2) Refuerzos ligeros en proveedores y stock por si el entorno viene incompleto
alter table if exists public.suppliers
    add column if not exists country text default 'CL',
    add column if not exists status text default 'active',
    add column if not exists updated_at timestamp default now();

alter table if exists public.warehouse_stock
    add column if not exists quantity_reserved integer default 0,
    add column if not exists reorder_level integer,
    add column if not exists reorder_quantity integer,
    add column if not exists unit_cost numeric,
    add column if not exists batch_number text,
    add column if not exists supplier_lot text,
    add column if not exists updated_at timestamp default now();

create index if not exists idx_warehouse_stock_batch_number
    on public.warehouse_stock (batch_number);

create index if not exists idx_suppliers_rut
    on public.suppliers (organization_id, rut);
