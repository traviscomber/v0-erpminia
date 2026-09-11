create or replace view public.canonical_inventory_current
with (security_invoker = true)
as
with latest_snapshots as (
  select distinct on (inventory_snapshots.organization_id, upper(trim(inventory_snapshots.product_code)))
    inventory_snapshots.organization_id,
    upper(trim(inventory_snapshots.product_code)) as normalized_product_code,
    inventory_snapshots.product_code,
    inventory_snapshots.snapshot_date,
    inventory_snapshots.warehouse_code,
    inventory_snapshots.quantity,
    inventory_snapshots.unit_cost,
    inventory_snapshots.total_value,
    inventory_snapshots.family,
    inventory_snapshots.validation_status,
    inventory_snapshots.validation_notes,
    inventory_snapshots.imported_at
  from canonical.inventory_snapshots
  order by inventory_snapshots.organization_id,
           upper(trim(inventory_snapshots.product_code)),
           inventory_snapshots.snapshot_date desc,
           inventory_snapshots.imported_at desc
), operational_inventory as (
  select distinct on (upper(trim(bodega_inventory.sku)))
    '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid as organization_id,
    upper(trim(bodega_inventory.sku)) as product_code,
    bodega_inventory.quantity,
    bodega_inventory.min_stock,
    bodega_inventory.max_stock,
    bodega_inventory.unit_cost,
    bodega_inventory.category,
    bodega_inventory.description,
    bodega_inventory.location,
    bodega_inventory.created_at,
    coalesce(bodega_inventory.updated_at, bodega_inventory.created_at) as source_at
  from bodega_inventory
  where nullif(trim(bodega_inventory.sku), '') is not null
  order by upper(trim(bodega_inventory.sku)),
           bodega_inventory.updated_at desc nulls last,
           bodega_inventory.created_at desc nulls last
)
select
  p.id,
  p.organization_id,
  p.product_code as sku,
  p.name,
  coalesce(p.family, oi.category::text, s.family, 'Otros'::text) as category,
  coalesce(nullif(p.description, ''::text), oi.description, oi.location::text, ''::text) as description,
  case
    when oi.source_at is not null
      and (s.snapshot_date is null or oi.source_at::date >= s.snapshot_date)
      then oi.quantity::numeric
    else coalesce(s.quantity, oi.quantity::numeric, 0::numeric)
  end as quantity,
  p.minimum_stock::numeric as min_stock,
  p.maximum_stock::numeric as max_stock,
  case
    when oi.source_at is not null
      and (s.snapshot_date is null or oi.source_at::date >= s.snapshot_date)
      then coalesce(oi.unit_cost, p.standard_cost, 0::numeric)
    else coalesce(s.unit_cost, oi.unit_cost, p.standard_cost, 0::numeric)
  end as unit_cost,
  case
    when oi.source_at is not null
      and (s.snapshot_date is null or oi.source_at::date >= s.snapshot_date)
      then oi.quantity::numeric * coalesce(oi.unit_cost, p.standard_cost, 0::numeric)
    else coalesce(s.total_value, coalesce(s.quantity, 0::numeric) * coalesce(s.unit_cost, p.standard_cost, 0::numeric), 0::numeric)
  end as total_value,
  case
    when oi.source_at is not null
      and (s.snapshot_date is null or oi.source_at::date >= s.snapshot_date)
      then oi.source_at::date
    else coalesce(s.snapshot_date, oi.created_at::date)
  end as snapshot_date,
  case
    when oi.source_at is not null
      and (s.snapshot_date is null or oi.source_at::date >= s.snapshot_date)
      then nullif(oi.location::text, '')
    else coalesce(s.warehouse_code, nullif(oi.location::text, ''))
  end as warehouse_code,
  p.is_active,
  case
    when p.validation_status = 'invalid'::text or s.validation_status = 'invalid'::text then 'invalid'::text
    when p.validation_status = 'warning'::text or s.validation_status = 'warning'::text then 'warning'::text
    when p.validation_status = 'pending'::text or s.validation_status = 'pending'::text then 'pending'::text
    else 'valid'::text
  end as validation_status
from canonical.products p
left join latest_snapshots s
  on s.organization_id = p.organization_id
 and s.normalized_product_code = upper(trim(p.product_code))
left join operational_inventory oi
  on oi.organization_id = p.organization_id
 and oi.product_code = upper(trim(p.product_code))
where p.is_active = true;
