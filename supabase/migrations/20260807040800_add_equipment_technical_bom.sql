create table if not exists public.equipment_technical_bom_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  canonical_asset_id uuid not null references canonical.assets(id) on delete cascade,
  canonical_product_id uuid not null references canonical.products(id) on delete restrict,
  component_code text,
  component_name text not null,
  component_path text,
  quantity_required numeric not null default 1 check (quantity_required > 0),
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','inactive')),
  reason text not null,
  evidence_reference text,
  proposed_by uuid,
  proposed_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_equipment_technical_bom_active_line
  on public.equipment_technical_bom_lines (organization_id, canonical_asset_id, lower(coalesce(component_code,'')), canonical_product_id)
  where status in ('proposed','approved');
create index if not exists idx_equipment_technical_bom_asset
  on public.equipment_technical_bom_lines (organization_id, canonical_asset_id, status);
create index if not exists idx_equipment_technical_bom_product
  on public.equipment_technical_bom_lines (organization_id, canonical_product_id, status);

alter table public.equipment_technical_bom_lines enable row level security;
revoke all on table public.equipment_technical_bom_lines from anon, authenticated;
grant select, insert, update, delete on table public.equipment_technical_bom_lines to service_role;
