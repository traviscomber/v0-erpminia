-- Ficha tecnica y fallas por componente
-- Ejecutar en Supabase sin borrar tablas existentes

create extension if not exists pgcrypto;

create table if not exists asset_technical_sheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  asset_id uuid not null references maintenance_assets(id) on delete cascade,
  model_name text,
  brand_name text,
  source_url text,
  source_type text default 'manual',
  source_version text,
  validated boolean not null default false,
  validated_by uuid,
  validated_at timestamptz,
  notes text,
  raw_specs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_id)
);

create table if not exists asset_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  asset_id uuid not null references maintenance_assets(id) on delete cascade,
  technical_sheet_id uuid references asset_technical_sheets(id) on delete set null,
  component_code text not null,
  component_name text not null,
  parent_component_id uuid references asset_components(id) on delete set null,
  component_level integer not null default 1,
  criticality text default 'media',
  status text default 'activo',
  source_type text default 'manual',
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_id, component_code)
);

create table if not exists asset_component_fault_modes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  asset_component_id uuid not null references asset_components(id) on delete cascade,
  fault_code text not null,
  fault_name text not null,
  symptom text,
  cause text,
  effect text,
  severity text default 'media',
  recommended_action text,
  source_type text default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_component_id, fault_code)
);

create index if not exists idx_asset_technical_sheets_org_asset on asset_technical_sheets (organization_id, asset_id);
create index if not exists idx_asset_components_org_asset on asset_components (organization_id, asset_id);
create index if not exists idx_asset_components_parent on asset_components (parent_component_id);
create index if not exists idx_asset_component_fault_modes_component on asset_component_fault_modes (asset_component_id);
create index if not exists idx_asset_component_fault_modes_org on asset_component_fault_modes (organization_id);

alter table asset_technical_sheets enable row level security;
alter table asset_components enable row level security;
alter table asset_component_fault_modes enable row level security;

drop policy if exists "asset_technical_sheets_allow_all" on asset_technical_sheets;
drop policy if exists "asset_components_allow_all" on asset_components;
drop policy if exists "asset_component_fault_modes_allow_all" on asset_component_fault_modes;

create policy "asset_technical_sheets_allow_all"
  on asset_technical_sheets
  for all
  using (true)
  with check (true);

create policy "asset_components_allow_all"
  on asset_components
  for all
  using (true)
  with check (true);

create policy "asset_component_fault_modes_allow_all"
  on asset_component_fault_modes
  for all
  using (true)
  with check (true);

