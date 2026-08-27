create or replace view intelligence.work_order_supply_status as
select
  n.id as supply_need_id,
  n.organization_id,
  n.work_order_id,
  wo.work_order_number,
  wo.title,
  wo.canonical_asset_id,
  a.asset_code,
  a.name as asset_name,
  n.status as supply_status,
  n.priority,
  n.required_date,
  n.procurement_request_id,
  count(r.id) as required_lines,
  count(r.id) filter (where r.quantity_shortage > 0 and r.status <> 'cancelled') as shortage_lines,
  coalesce(sum(r.quantity_shortage) filter (where r.status <> 'cancelled'), 0) as total_shortage_units,
  jsonb_agg(
    jsonb_build_object(
      'requirement_id', r.id,
      'product_id', r.canonical_product_id,
      'product_code', p.product_code,
      'product_name', p.name,
      'required', r.quantity_required,
      'available', r.quantity_available,
      'reserved', coalesce((
        select sum(greatest(coalesce(wp.quantity_reserved, 0), 0))
        from public.work_order_parts wp
        where wp.organization_id = n.organization_id
          and wp.work_order_id = n.work_order_id
          and wp.canonical_product_id = r.canonical_product_id
          and wp.status = 'reserved'
      ), 0),
      'issued', coalesce((
        select sum(greatest(coalesce(wp.quantity_issued, 0) - coalesce(wp.quantity_returned, 0), 0))
        from public.work_order_parts wp
        where wp.organization_id = n.organization_id
          and wp.work_order_id = n.work_order_id
          and wp.canonical_product_id = r.canonical_product_id
          and wp.status <> 'cancelled'
      ), 0),
      'in_procurement', coalesce((
        select sum(coalesce(l.quantity, 0))
        from public.procurement_intake_request_lines l
        join public.procurement_intake_requests ir on ir.id = l.intake_request_id
        where l.organization_id = n.organization_id
          and ir.organization_id = n.organization_id
          and ir.source_supply_need_id = n.id
          and l.material_requirement_id = r.id
      ), 0),
      'shortage', r.quantity_shortage,
      'status', r.status
    ) order by p.product_code
  ) filter (where r.id is not null) as materials
from public.work_order_supply_needs n
join public.maintenance_work_orders wo on wo.id = n.work_order_id
left join canonical.assets a on a.id = wo.canonical_asset_id
left join public.work_order_material_requirements r on r.work_order_id = wo.id
left join canonical.products p on p.id = r.canonical_product_id
group by
  n.id, n.organization_id, n.work_order_id,
  wo.work_order_number, wo.title, wo.canonical_asset_id,
  a.asset_code, a.name,
  n.status, n.priority, n.required_date, n.procurement_request_id;
