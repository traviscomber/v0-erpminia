create or replace view public.work_order_supply_chain_v1 with (security_invoker=true) as
with wo as (
  select
    w.organization_id,
    w.id as work_order_id,
    w.work_order_number,
    coalesce(w.canonical_asset_id, w.asset_id) as canonical_asset_id,
    w.title,
    w.status as work_order_status,
    w.priority,
    w.scheduled_date,
    w.created_at
  from public.maintenance_work_orders w
), material as (
  select organization_id, work_order_id,
    count(*) as material_requirement_count,
    count(*) filter (where coalesce(quantity_shortage,0) > 0) as material_shortage_count,
    sum(quantity_shortage) filter (where quantity_shortage is not null) as material_shortage_quantity
  from public.work_order_material_requirements
  group by organization_id, work_order_id
), supply as (
  select organization_id, work_order_id,
    count(*) as supply_need_count,
    count(*) filter (where lower(coalesce(status,'')) not in ('completed','closed','resolved','cancelled','canceled')) as open_supply_need_count,
    count(*) filter (where procurement_request_id is not null) as supply_needs_with_request
  from public.work_order_supply_needs
  group by organization_id, work_order_id
), intake as (
  select organization_id, work_order_id,
    count(*) as procurement_request_count,
    count(*) filter (where lower(coalesce(status,'')) not in ('completed','closed','resolved','cancelled','canceled','rejected')) as open_procurement_request_count,
    count(*) filter (where promoted_request_id is not null) as promoted_procurement_request_count
  from public.procurement_intake_requests
  group by organization_id, work_order_id
), orders as (
  select organization_id, work_order_id,
    count(*) as procurement_order_count,
    count(*) filter (where actual_delivery_date is null and lower(coalesce(status,'')) not in ('cancelled','canceled','rejected')) as undelivered_order_count,
    count(*) filter (where actual_delivery_date is not null) as delivered_order_count,
    sum(total_amount) filter (where total_amount is not null) as procurement_order_amount
  from public.procurement_operational_orders
  group by organization_id, work_order_id
), parts as (
  select organization_id, work_order_id,
    count(*) as part_line_count,
    sum(quantity_requested) filter (where quantity_requested is not null) as parts_requested,
    sum(quantity_issued) filter (where quantity_issued is not null) as parts_issued,
    sum(quantity_installed) filter (where quantity_installed is not null) as parts_installed,
    sum(total_cost) filter (where total_cost is not null) as parts_cost
  from public.work_order_parts
  group by organization_id, work_order_id
), stock as (
  select organization_id, work_order_id,
    count(*) as stock_movement_count,
    sum(total_cost) filter (where total_cost is not null) as stock_movement_cost
  from public.stock_movements
  where work_order_id is not null
  group by organization_id, work_order_id
)
select
  wo.organization_id,
  wo.work_order_id,
  wo.work_order_number,
  wo.canonical_asset_id,
  wo.title,
  wo.work_order_status,
  wo.priority,
  wo.scheduled_date,
  coalesce(material.material_requirement_count,0) as material_requirement_count,
  coalesce(material.material_shortage_count,0) as material_shortage_count,
  material.material_shortage_quantity,
  coalesce(supply.supply_need_count,0) as supply_need_count,
  coalesce(supply.open_supply_need_count,0) as open_supply_need_count,
  coalesce(supply.supply_needs_with_request,0) as supply_needs_with_request,
  coalesce(intake.procurement_request_count,0) as procurement_request_count,
  coalesce(intake.open_procurement_request_count,0) as open_procurement_request_count,
  coalesce(intake.promoted_procurement_request_count,0) as promoted_procurement_request_count,
  coalesce(orders.procurement_order_count,0) as procurement_order_count,
  coalesce(orders.undelivered_order_count,0) as undelivered_order_count,
  coalesce(orders.delivered_order_count,0) as delivered_order_count,
  orders.procurement_order_amount,
  coalesce(parts.part_line_count,0) as part_line_count,
  parts.parts_requested,
  parts.parts_issued,
  parts.parts_installed,
  parts.parts_cost,
  coalesce(stock.stock_movement_count,0) as stock_movement_count,
  stock.stock_movement_cost,
  case
    when wo.canonical_asset_id is null then 'missing_asset'
    when coalesce(material.material_shortage_count,0) > 0 and coalesce(intake.procurement_request_count,0)=0 then 'shortage_without_request'
    when coalesce(intake.open_procurement_request_count,0) > 0 and coalesce(orders.procurement_order_count,0)=0 then 'waiting_procurement'
    when coalesce(orders.undelivered_order_count,0) > 0 then 'waiting_delivery'
    when coalesce(parts.part_line_count,0) > 0 and coalesce(parts.parts_installed,0) < coalesce(parts.parts_requested,0) then 'waiting_installation'
    when coalesce(parts.part_line_count,0) > 0 and coalesce(parts.parts_installed,0) >= coalesce(parts.parts_requested,0) then 'materials_complete'
    else 'no_supply_evidence'
  end as supply_chain_status
from wo
left join material on material.organization_id=wo.organization_id and material.work_order_id=wo.work_order_id
left join supply on supply.organization_id=wo.organization_id and supply.work_order_id=wo.work_order_id
left join intake on intake.organization_id=wo.organization_id and intake.work_order_id=wo.work_order_id
left join orders on orders.organization_id=wo.organization_id and orders.work_order_id=wo.work_order_id
left join parts on parts.organization_id=wo.organization_id and parts.work_order_id=wo.work_order_id
left join stock on stock.organization_id=wo.organization_id and stock.work_order_id=wo.work_order_id;
