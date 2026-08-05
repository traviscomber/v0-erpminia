create schema if not exists canonical;

create table if not exists canonical.asset_reconciliation (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  source_table text not null,
  source_record_id uuid not null,
  source_code text,
  source_name text,
  classification text not null check (classification in ('canonical','candidate','reference_financial','duplicate','inactive')),
  linked_asset_id uuid references public.maintenance_assets(id) on delete set null,
  match_basis text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_table, source_record_id)
);

create index if not exists idx_asset_reconciliation_org_class
  on canonical.asset_reconciliation (organization_id, classification);
create index if not exists idx_asset_reconciliation_linked_asset
  on canonical.asset_reconciliation (linked_asset_id)
  where linked_asset_id is not null;

alter table canonical.asset_reconciliation enable row level security;
revoke all on canonical.asset_reconciliation from anon, authenticated;
grant all on canonical.asset_reconciliation to service_role;

insert into canonical.asset_reconciliation (
  organization_id, source_table, source_record_id, source_code, source_name,
  classification, linked_asset_id, match_basis, notes, metadata, updated_at
)
select
  ma.organization_id, 'maintenance_assets', ma.id, ma.asset_code, ma.asset_name,
  'canonical', ma.id, 'self', 'Maestro operativo de activos',
  jsonb_build_object('asset_type', ma.asset_type, 'status', ma.status), now()
from public.maintenance_assets ma
on conflict (organization_id, source_table, source_record_id)
do update set
  source_code = excluded.source_code,
  source_name = excluded.source_name,
  classification = excluded.classification,
  linked_asset_id = excluded.linked_asset_id,
  match_basis = excluded.match_basis,
  notes = excluded.notes,
  metadata = excluded.metadata,
  updated_at = now();

with matched_cost_centers as (
  select distinct on (cc.id)
    cc.organization_id,
    cc.id as cost_center_id,
    cc.code,
    cc.name,
    cc.status,
    e.id as equipment_record_id,
    ma.id as linked_asset_id,
    case
      when lower(trim(coalesce(cc.code,''))) = lower(trim(coalesce(e.code,'')))
       and lower(trim(coalesce(cc.name,''))) = lower(trim(coalesce(e.name,''))) then 'code_and_name'
      when lower(trim(coalesce(cc.code,''))) = lower(trim(coalesce(e.code,''))) then 'code'
      else 'name'
    end as match_basis
  from public.cost_centers cc
  join public.equipment e
    on lower(trim(coalesce(cc.code,''))) = lower(trim(coalesce(e.code,'')))
    or lower(trim(coalesce(cc.name,''))) = lower(trim(coalesce(e.name,'')))
  left join public.maintenance_assets ma
    on ma.organization_id = cc.organization_id
   and (
      lower(trim(coalesce(ma.asset_code,''))) = lower(trim(coalesce(cc.code,'')))
      or lower(trim(coalesce(ma.asset_name,''))) = lower(trim(coalesce(cc.name,'')))
   )
  order by cc.id, ma.id nulls last
)
insert into canonical.asset_reconciliation (
  organization_id, source_table, source_record_id, source_code, source_name,
  classification, linked_asset_id, match_basis, notes, metadata, updated_at
)
select
  organization_id, 'cost_centers', cost_center_id, code, name,
  case when linked_asset_id is null then 'reference_financial' else 'duplicate' end,
  linked_asset_id, match_basis,
  case
    when linked_asset_id is null then 'Referencia financiera derivada; no debe mostrarse como activo operativo'
    else 'Coincide con un activo canónico y no debe duplicarse'
  end,
  jsonb_build_object('equipment_record_id', equipment_record_id, 'cost_center_status', status),
  now()
from matched_cost_centers
on conflict (organization_id, source_table, source_record_id)
do update set
  source_code = excluded.source_code,
  source_name = excluded.source_name,
  classification = excluded.classification,
  linked_asset_id = excluded.linked_asset_id,
  match_basis = excluded.match_basis,
  notes = excluded.notes,
  metadata = excluded.metadata,
  updated_at = now();
