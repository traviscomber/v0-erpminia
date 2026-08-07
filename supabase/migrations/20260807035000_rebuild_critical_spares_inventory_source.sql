drop view if exists public.critical_spare_observations_v1;

create view public.critical_spare_observations_v1
with (security_invoker = true)
as
with inventory as (
  select organization_id, sku,
    sum(quantity)::numeric as quantity_on_hand,
    max(min_stock)::numeric as inventory_min_stock,
    max(snapshot_date) as snapshot_date
  from public.canonical_inventory_current
  group by organization_id, sku
),
warehouse as (
  select organization_id, canonical_product_id,
    sum(quantity_reserved)::numeric as quantity_reserved,
    max(reorder_level)::numeric as reorder_level
  from public.warehouse_stock
  where canonical_product_id is not null
  group by organization_id, canonical_product_id
),
wo as (
  select organization_id, canonical_product_id,
    sum(quantity_requested)::numeric as quantity_requested,
    sum(quantity_issued)::numeric as quantity_issued,
    sum(quantity_installed)::numeric as quantity_installed,
    count(distinct work_order_id)::integer as work_order_count,
    count(distinct canonical_asset_id) filter (where canonical_asset_id is not null)::integer as affected_assets
  from public.work_order_parts
  where canonical_product_id is not null
  group by organization_id, canonical_product_id
),
req as (
  select organization_id, canonical_product_id,
    sum(quantity_required)::numeric as quantity_required,
    sum(quantity_shortage)::numeric as quantity_shortage,
    count(distinct work_order_id)::integer as shortage_work_orders,
    count(distinct canonical_asset_id) filter (where canonical_asset_id is not null)::integer as shortage_assets
  from public.work_order_material_requirements
  where canonical_product_id is not null
  group by organization_id, canonical_product_id
),
mov as (
  select m.organization_id, coalesce(m.canonical_product_id, s.canonical_product_id) as product_id,
    sum(case when lower(coalesce(m.movement_type,'')) in ('issue','out','consumption','consume','salida','egreso') then abs(m.quantity) else 0 end)::numeric as outbound_quantity,
    max(m.created_at) filter (where lower(coalesce(m.movement_type,'')) in ('issue','out','consumption','consume','salida','egreso')) as last_outbound_at
  from public.stock_movements m
  left join public.warehouse_stock s on s.id = m.stock_id and s.organization_id = m.organization_id
  where coalesce(m.canonical_product_id, s.canonical_product_id) is not null
  group by m.organization_id, coalesce(m.canonical_product_id, s.canonical_product_id)
),
purchases as (
  select pol.organization_id, p.id as product_id,
    count(*)::integer as purchase_line_count,
    sum(pol.quantity)::numeric as purchased_quantity,
    count(distinct po.canonical_supplier_id) filter (where po.canonical_supplier_id is not null)::integer as supplier_count,
    min(po.order_date) as first_purchase_date,
    max(po.order_date) as last_purchase_date,
    avg((po.expected_delivery_date - po.order_date)::numeric) filter (
      where po.expected_delivery_date is not null and po.order_date is not null and po.expected_delivery_date >= po.order_date
    ) as committed_lead_days
  from canonical.purchase_order_lines pol
  join canonical.purchase_orders po on po.id = pol.purchase_order_id and po.organization_id = pol.organization_id
  join canonical.products p on p.organization_id = pol.organization_id
    and (p.id = pol.canonical_product_id or (pol.canonical_product_id is null and p.product_code = pol.product_code))
  group by pol.organization_id, p.id
),
receipts as (
  select gl.organization_id, p.id as product_id,
    avg((gr.received_at::date - po.order_date)::numeric) filter (
      where gr.received_at is not null and po.order_date is not null and gr.received_at::date >= po.order_date
    ) as observed_lead_days,
    max(gr.received_at) as last_received_at
  from canonical.goods_receipt_lines gl
  join canonical.goods_receipts gr on gr.id = gl.receipt_id and gr.organization_id = gl.organization_id
  join canonical.purchase_order_lines pol on pol.id = gl.purchase_order_line_id and pol.organization_id = gl.organization_id
  join canonical.purchase_orders po on po.id = pol.purchase_order_id and po.organization_id = gl.organization_id
  join canonical.products p on p.organization_id = gl.organization_id
    and (p.id = coalesce(gl.canonical_product_id, pol.canonical_product_id) or (gl.canonical_product_id is null and pol.canonical_product_id is null and p.product_code = pol.product_code))
  group by gl.organization_id, p.id
),
relations as (
  select organization_id, source_product_id,
    count(*) filter (where status='approved')::integer as approved_relation_count,
    bool_or(status='approved' and relation_type='obsolete') as approved_obsolete
  from public.spare_part_lifecycle_relations
  group by organization_id, source_product_id
)
select p.organization_id,
  p.id as product_id,
  p.product_code,
  p.name,
  p.family,
  p.unit,
  p.is_active,
  p.is_purchasable,
  inventory.snapshot_date as inventory_snapshot_date,
  p.minimum_stock,
  coalesce(inventory.inventory_min_stock,0) as inventory_min_stock,
  coalesce(warehouse.reorder_level,0) as reorder_level,
  greatest(coalesce(p.minimum_stock,0), coalesce(inventory.inventory_min_stock,0), coalesce(warehouse.reorder_level,0)) as minimum_required,
  coalesce(inventory.quantity_on_hand,0) as quantity_on_hand,
  coalesce(warehouse.quantity_reserved,0) as quantity_reserved,
  coalesce(inventory.quantity_on_hand,0) - coalesce(warehouse.quantity_reserved,0) as quantity_available,
  coalesce(wo.quantity_requested,0) as wo_quantity_requested,
  coalesce(wo.quantity_issued,0) as wo_quantity_issued,
  coalesce(wo.quantity_installed,0) as wo_quantity_installed,
  coalesce(wo.work_order_count,0) as work_order_count,
  greatest(coalesce(wo.affected_assets,0), coalesce(req.shortage_assets,0)) as affected_assets,
  coalesce(req.quantity_required,0) as required_quantity,
  coalesce(req.quantity_shortage,0) as shortage_quantity,
  coalesce(req.shortage_work_orders,0) as shortage_work_orders,
  coalesce(mov.outbound_quantity,0) as outbound_quantity,
  mov.last_outbound_at,
  coalesce(purchases.purchase_line_count,0) as purchase_line_count,
  coalesce(purchases.purchased_quantity,0) as purchased_quantity,
  coalesce(purchases.supplier_count,0) as supplier_count,
  purchases.first_purchase_date,
  purchases.last_purchase_date,
  purchases.committed_lead_days,
  receipts.observed_lead_days,
  receipts.last_received_at,
  coalesce(relations.approved_relation_count,0) as approved_relation_count,
  coalesce(relations.approved_obsolete,false) as approved_obsolete
from canonical.products p
left join inventory on inventory.organization_id=p.organization_id and inventory.sku=p.product_code
left join warehouse on warehouse.organization_id=p.organization_id and warehouse.canonical_product_id=p.id
left join wo on wo.organization_id=p.organization_id and wo.canonical_product_id=p.id
left join req on req.organization_id=p.organization_id and req.canonical_product_id=p.id
left join mov on mov.organization_id=p.organization_id and mov.product_id=p.id
left join purchases on purchases.organization_id=p.organization_id and purchases.product_id=p.id
left join receipts on receipts.organization_id=p.organization_id and receipts.product_id=p.id
left join relations on relations.organization_id=p.organization_id and relations.source_product_id=p.id;

revoke all on table public.critical_spare_observations_v1 from anon, authenticated;
grant select on table public.critical_spare_observations_v1 to service_role;
