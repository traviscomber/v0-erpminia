-- Mining OS: canonical work-order supply-chain projection and identity propagation.
-- Applied to production on 2026-08-24. This file versions the production contract.

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

create or replace function public.enforce_work_order_child_asset_identity()
returns trigger language plpgsql security definer set search_path = public, canonical as $$
declare wo record;
begin
  if new.work_order_id is null then return new; end if;
  select organization_id, coalesce(canonical_asset_id, asset_id) as canonical_asset_id into wo
  from public.maintenance_work_orders where id = new.work_order_id;
  if not found then raise exception 'work order % not found', new.work_order_id; end if;
  if wo.organization_id <> new.organization_id then raise exception 'child record organization does not match work order'; end if;
  if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from wo.canonical_asset_id then
    raise exception 'child record asset does not match work order canonical asset';
  end if;
  new.canonical_asset_id := wo.canonical_asset_id;
  return new;
end; $$;

create or replace function public.enforce_supply_need_identity()
returns trigger language plpgsql security definer set search_path = public, canonical as $$
declare wo record;
begin
  if new.work_order_id is null then raise exception 'work_order_id is required for supply need'; end if;
  select organization_id, coalesce(canonical_asset_id, asset_id) as canonical_asset_id into wo
  from public.maintenance_work_orders where id = new.work_order_id;
  if not found then raise exception 'work order % not found', new.work_order_id; end if;
  if wo.organization_id <> new.organization_id then raise exception 'supply need organization does not match work order'; end if;
  if new.canonical_asset_id is not null and wo.canonical_asset_id is distinct from new.canonical_asset_id then
    raise exception 'supply need asset does not match work order canonical asset';
  end if;
  new.canonical_asset_id := wo.canonical_asset_id;
  return new;
end; $$;

create or replace function public.enforce_procurement_intake_identity()
returns trigger language plpgsql security definer set search_path = public, canonical as $$
declare need record; wo record;
begin
  if new.source_supply_need_id is not null then
    select organization_id, work_order_id, canonical_asset_id into need
    from public.work_order_supply_needs where id = new.source_supply_need_id;
    if not found then raise exception 'source supply need % not found', new.source_supply_need_id; end if;
    if need.organization_id <> new.organization_id then raise exception 'intake organization does not match supply need'; end if;
    if new.work_order_id is not null and new.work_order_id is distinct from need.work_order_id then raise exception 'intake work order does not match supply need'; end if;
    if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from need.canonical_asset_id then raise exception 'intake asset does not match supply need'; end if;
    new.work_order_id := need.work_order_id;
    new.canonical_asset_id := need.canonical_asset_id;
  elsif new.work_order_id is not null then
    select organization_id, coalesce(canonical_asset_id, asset_id) as canonical_asset_id into wo from public.maintenance_work_orders where id = new.work_order_id;
    if not found then raise exception 'work order % not found', new.work_order_id; end if;
    if wo.organization_id <> new.organization_id then raise exception 'intake organization does not match work order'; end if;
    if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from wo.canonical_asset_id then raise exception 'intake asset does not match work order'; end if;
    new.canonical_asset_id := wo.canonical_asset_id;
  end if;
  return new;
end; $$;

create or replace function public.enforce_procurement_order_identity()
returns trigger language plpgsql security definer set search_path = public, canonical as $$
declare req record; wo record;
begin
  if new.intake_request_id is not null then
    select organization_id, work_order_id, canonical_asset_id into req from public.procurement_intake_requests where id = new.intake_request_id;
    if not found then raise exception 'intake request % not found', new.intake_request_id; end if;
    if req.organization_id <> new.organization_id then raise exception 'order organization does not match intake request'; end if;
    if new.work_order_id is not null and new.work_order_id is distinct from req.work_order_id then raise exception 'order work order does not match intake request'; end if;
    if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from req.canonical_asset_id then raise exception 'order asset does not match intake request'; end if;
    new.work_order_id := req.work_order_id;
    new.canonical_asset_id := req.canonical_asset_id;
  elsif new.work_order_id is not null then
    select organization_id, coalesce(canonical_asset_id, asset_id) as canonical_asset_id into wo from public.maintenance_work_orders where id = new.work_order_id;
    if not found then raise exception 'work order % not found', new.work_order_id; end if;
    if wo.organization_id <> new.organization_id then raise exception 'order organization does not match work order'; end if;
    if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from wo.canonical_asset_id then raise exception 'order asset does not match work order'; end if;
    new.canonical_asset_id := wo.canonical_asset_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_enforce_supply_need_identity on public.work_order_supply_needs;
create trigger trg_enforce_supply_need_identity before insert or update of organization_id, work_order_id, canonical_asset_id on public.work_order_supply_needs for each row execute function public.enforce_supply_need_identity();

drop trigger if exists trg_enforce_procurement_intake_identity on public.procurement_intake_requests;
create trigger trg_enforce_procurement_intake_identity before insert or update of organization_id, source_supply_need_id, work_order_id, canonical_asset_id on public.procurement_intake_requests for each row execute function public.enforce_procurement_intake_identity();

drop trigger if exists trg_enforce_procurement_order_identity on public.procurement_operational_orders;
create trigger trg_enforce_procurement_order_identity before insert or update of organization_id, intake_request_id, work_order_id, canonical_asset_id on public.procurement_operational_orders for each row execute function public.enforce_procurement_order_identity();

drop trigger if exists trg_enforce_material_requirement_asset on public.work_order_material_requirements;
create trigger trg_enforce_material_requirement_asset before insert or update of organization_id, work_order_id, canonical_asset_id on public.work_order_material_requirements for each row execute function public.enforce_work_order_child_asset_identity();

drop trigger if exists trg_enforce_work_order_part_asset on public.work_order_parts;
create trigger trg_enforce_work_order_part_asset before insert or update of organization_id, work_order_id, canonical_asset_id on public.work_order_parts for each row execute function public.enforce_work_order_child_asset_identity();

drop trigger if exists trg_enforce_stock_movement_asset on public.stock_movements;
create trigger trg_enforce_stock_movement_asset before insert or update of organization_id, work_order_id, canonical_asset_id on public.stock_movements for each row execute function public.enforce_work_order_child_asset_identity();
