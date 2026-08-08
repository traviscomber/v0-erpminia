create table if not exists public.production_import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_type text not null check (source_type in ('tm','ley','leyes','other')),
  source_file text not null,
  source_file_sha256 text not null,
  period_start date,
  period_end date,
  status text not null default 'analyzed' check (status in ('analyzed','pending_normalization','approved_for_import','imported','rejected')),
  normalization_rule_version text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_file_sha256)
);

create table if not exists public.production_mine_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text,
  name text not null,
  normalized_name text not null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive','review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, normalized_name)
);

create table if not exists public.production_mine_sectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  mine_source_id uuid not null references public.production_mine_sources(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  status text not null default 'active' check (status in ('active','inactive','review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, mine_source_id, normalized_name)
);

create table if not exists public.production_material_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  import_batch_id uuid not null references public.production_import_batches(id) on delete restrict,
  movement_number text,
  movement_date date not null,
  movement_time time,
  mine_source_id uuid references public.production_mine_sources(id) on delete set null,
  mine_sector_id uuid references public.production_mine_sectors(id) on delete set null,
  mine_name_raw text,
  sector_name_raw text,
  driver_name_raw text,
  driver_profile_id uuid references public.profiles(id) on delete set null,
  carrier_name_raw text,
  carrier_supplier_id uuid references public.suppliers(id) on delete set null,
  vehicle_plate_raw text,
  vehicle_asset_id uuid references canonical.assets(id) on delete set null,
  seal_number text,
  raw_quantity numeric,
  raw_unit text,
  normalized_metric_tons numeric,
  normalization_status text not null default 'pending' check (normalization_status in ('pending','approved','rejected','not_required')),
  normalization_rule text,
  source_file text not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  source_hash text not null,
  source_payload jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending','valid','review','rejected')),
  validation_notes text,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_hash)
);

create table if not exists public.production_plant_shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  import_batch_id uuid not null references public.production_import_batches(id) on delete restrict,
  operation_date date not null,
  shift_code text not null,
  raw_treated_quantity numeric,
  raw_treated_unit text,
  treated_metric_tons numeric,
  normalization_status text not null default 'pending' check (normalization_status in ('pending','approved','rejected','not_required')),
  normalization_rule text,
  source_file text not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  source_hash text not null,
  source_payload jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending','valid','review','rejected')),
  validation_notes text,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_hash)
);

create table if not exists public.production_metallurgy_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_shift_id uuid not null references public.production_plant_shifts(id) on delete restrict,
  head_grade numeric,
  concentrate_grade numeric,
  tailings_grade numeric,
  recovery_reported numeric,
  recovery_calculated numeric,
  fine_metal_reported numeric,
  fine_metal_calculated numeric,
  concentrate_quantity numeric,
  concentrate_quantity_unit text,
  analysis_status text not null default 'observed' check (analysis_status in ('observed','calculated','partial','review')),
  calculation_rule_version text,
  source_file text not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  source_hash text not null,
  source_payload jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending','valid','review','rejected')),
  validation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, plant_shift_id),
  unique (organization_id, source_hash)
);

create table if not exists public.production_concentrate_shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  import_batch_id uuid references public.production_import_batches(id) on delete restrict,
  shipment_date date not null,
  shipment_number text,
  destination text,
  carrier_name_raw text,
  carrier_supplier_id uuid references public.suppliers(id) on delete set null,
  vehicle_plate_raw text,
  vehicle_asset_id uuid references canonical.assets(id) on delete set null,
  raw_quantity numeric,
  raw_unit text,
  normalized_metric_tons numeric,
  normalization_status text not null default 'pending' check (normalization_status in ('pending','approved','rejected','not_required')),
  normalization_rule text,
  source_file text,
  source_sheet text,
  source_row integer check (source_row is null or source_row > 0),
  source_hash text,
  source_payload jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending','valid','review','rejected')),
  validation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists production_concentrate_shipments_source_hash_uq on public.production_concentrate_shipments (organization_id, source_hash) where source_hash is not null;

create table if not exists public.production_entity_reconciliation (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  entity_type text not null check (entity_type in ('driver','carrier','vehicle','mine','sector')),
  raw_value text not null,
  normalized_value text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  asset_id uuid references canonical.assets(id) on delete set null,
  mine_source_id uuid references public.production_mine_sources(id) on delete set null,
  mine_sector_id uuid references public.production_mine_sectors(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','matched','rejected','needs_review')),
  confidence text check (confidence in ('high','medium','low')),
  evidence text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, entity_type, normalized_value)
);

create index if not exists production_movements_org_date_idx on public.production_material_movements (organization_id, movement_date desc);
create index if not exists production_movements_mine_idx on public.production_material_movements (organization_id, mine_source_id, movement_date desc);
create index if not exists production_movements_carrier_idx on public.production_material_movements (organization_id, carrier_supplier_id, movement_date desc);
create index if not exists production_movements_vehicle_idx on public.production_material_movements (organization_id, vehicle_asset_id, movement_date desc);
create index if not exists production_plant_shifts_org_date_idx on public.production_plant_shifts (organization_id, operation_date desc, shift_code);
create index if not exists production_metallurgy_shift_idx on public.production_metallurgy_results (plant_shift_id);
create index if not exists production_shipments_org_date_idx on public.production_concentrate_shipments (organization_id, shipment_date desc);
create index if not exists production_reconciliation_org_status_idx on public.production_entity_reconciliation (organization_id, status, entity_type);

alter table public.production_import_batches enable row level security;
alter table public.production_mine_sources enable row level security;
alter table public.production_mine_sectors enable row level security;
alter table public.production_material_movements enable row level security;
alter table public.production_plant_shifts enable row level security;
alter table public.production_metallurgy_results enable row level security;
alter table public.production_concentrate_shipments enable row level security;
alter table public.production_entity_reconciliation enable row level security;

revoke all on public.production_import_batches from anon, authenticated;
revoke all on public.production_mine_sources from anon, authenticated;
revoke all on public.production_mine_sectors from anon, authenticated;
revoke all on public.production_material_movements from anon, authenticated;
revoke all on public.production_plant_shifts from anon, authenticated;
revoke all on public.production_metallurgy_results from anon, authenticated;
revoke all on public.production_concentrate_shipments from anon, authenticated;
revoke all on public.production_entity_reconciliation from anon, authenticated;

grant select, insert, update, delete on public.production_import_batches to service_role;
grant select, insert, update, delete on public.production_mine_sources to service_role;
grant select, insert, update, delete on public.production_mine_sectors to service_role;
grant select, insert, update, delete on public.production_material_movements to service_role;
grant select, insert, update, delete on public.production_plant_shifts to service_role;
grant select, insert, update, delete on public.production_metallurgy_results to service_role;
grant select, insert, update, delete on public.production_concentrate_shipments to service_role;
grant select, insert, update, delete on public.production_entity_reconciliation to service_role;