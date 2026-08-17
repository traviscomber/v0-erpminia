-- Inventory intelligence must reflect the canonical current inventory, not the legacy warehouse_stock table.
create or replace view public.inventory_intelligence_position_v1 as
select
  ci.id as stock_id,
  ci.organization_id,
  ci.id as product_id,
  ci.sku as product_code,
  ci.name as product_name,
  ci.category as family,
  p.unit,
  ci.quantity as quantity_on_hand,
  0::numeric as quantity_reserved,
  ci.quantity as quantity_available,
  ci.unit_cost,
  ci.total_value as stock_value,
  case
    when coalesce(ci.quantity,0) < 0 then 'negative'::text
    when coalesce(ci.quantity,0) <= 0 then 'out_of_stock'::text
    when coalesce(ci.min_stock,0) > 0 and ci.quantity <= ci.min_stock then 'reorder'::text
    else 'healthy'::text
  end as stock_status,
  ci.snapshot_date as last_counted_date,
  null::date as expiry_date,
  ci.warehouse_code,
  ci.validation_status
from public.canonical_inventory_current ci
left join canonical.products p on p.id = ci.id
where ci.is_active = true;

create or replace view public.inventory_intelligence_overview_v1 as
select
  organization_id,
  count(*) filter (where quantity_available > 0)::bigint as products_with_stock,
  coalesce(sum(quantity_on_hand),0)::numeric as units_on_hand,
  coalesce(sum(quantity_reserved),0)::numeric as units_reserved,
  coalesce(sum(quantity_available),0)::numeric as units_available,
  coalesce(sum(stock_value),0)::numeric as total_stock_value,
  count(*) filter (where stock_status='out_of_stock')::bigint as out_of_stock_products,
  count(*) filter (where stock_status='reorder')::bigint as reorder_products,
  count(*) filter (where stock_status='negative')::bigint as negative_stock_products,
  0::bigint as expired_products,
  0::bigint as expiring_products,
  count(*) filter (where last_counted_date is null or last_counted_date < current_date - 90)::bigint as count_overdue_products
from public.inventory_intelligence_position_v1
group by organization_id;
