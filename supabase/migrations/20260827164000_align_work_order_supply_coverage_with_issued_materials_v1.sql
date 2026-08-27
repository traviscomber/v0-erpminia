create or replace function public.refresh_work_order_supply_need(p_work_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
declare
  v_wo public.maintenance_work_orders%rowtype;
  v_need_id uuid;
  v_shortage_count integer;
  v_covered_count integer;
  v_existing_status text;
begin
  select * into v_wo from public.maintenance_work_orders where id = p_work_order_id;
  if not found then raise exception 'Orden de trabajo no encontrada'; end if;

  if not exists (
    select 1 from public.user_roles
    where user_id = public.current_application_user_id()
      and organization_id = v_wo.organization_id
  ) then raise exception 'Sin acceso a la organización'; end if;

  update public.work_order_material_requirements r
  set quantity_available = coalesce((
        select sum(greatest(coalesce(ws.quantity_on_hand,0) - coalesce(ws.quantity_reserved,0),0))
        from public.warehouse_stock ws
        where ws.organization_id = r.organization_id
          and ws.canonical_product_id = r.canonical_product_id
      ),0)
      + coalesce((
        select sum(greatest(coalesce(wp.quantity_issued,0) - coalesce(wp.quantity_returned,0),0))
        from public.work_order_parts wp
        where wp.organization_id = r.organization_id
          and wp.work_order_id = r.work_order_id
          and wp.canonical_product_id = r.canonical_product_id
      ),0),
      status = case
        when r.status = 'cancelled' then 'cancelled'
        when (
          coalesce((
            select sum(greatest(coalesce(ws.quantity_on_hand,0) - coalesce(ws.quantity_reserved,0),0))
            from public.warehouse_stock ws
            where ws.organization_id = r.organization_id
              and ws.canonical_product_id = r.canonical_product_id
          ),0)
          + coalesce((
            select sum(greatest(coalesce(wp.quantity_issued,0) - coalesce(wp.quantity_returned,0),0))
            from public.work_order_parts wp
            where wp.organization_id = r.organization_id
              and wp.work_order_id = r.work_order_id
              and wp.canonical_product_id = r.canonical_product_id
          ),0)
        ) >= r.quantity_required then 'covered'
        else 'procurement_needed'
      end,
      updated_at = now()
  where r.work_order_id = p_work_order_id;

  select count(*) into v_shortage_count
  from public.work_order_material_requirements
  where work_order_id = p_work_order_id
    and quantity_shortage > 0
    and status <> 'cancelled';

  select count(*) into v_covered_count
  from public.work_order_material_requirements
  where work_order_id = p_work_order_id
    and quantity_shortage = 0
    and status <> 'cancelled';

  select status into v_existing_status
  from public.work_order_supply_needs
  where work_order_id = p_work_order_id;

  insert into public.work_order_supply_needs (
    organization_id, work_order_id, canonical_asset_id, status, priority, required_date, created_by
  ) values (
    v_wo.organization_id, v_wo.id, v_wo.canonical_asset_id,
    case when v_shortage_count = 0 then 'covered'
         when v_covered_count > 0 then 'partially_covered'
         else 'open' end,
    coalesce(v_wo.priority,'medium'), v_wo.scheduled_date, public.current_application_user_id()
  )
  on conflict (work_order_id) do update set
    canonical_asset_id = excluded.canonical_asset_id,
    status = case
      when v_shortage_count = 0 then 'covered'
      when public.work_order_supply_needs.status in ('sent_to_procurement','partially_covered') and v_covered_count > 0 then 'partially_covered'
      when public.work_order_supply_needs.status = 'sent_to_procurement' then 'sent_to_procurement'
      when v_covered_count > 0 then 'partially_covered'
      else 'open'
    end,
    priority = excluded.priority,
    required_date = excluded.required_date,
    updated_at = now()
  returning id into v_need_id;

  insert into public.work_order_events (
    organization_id, work_order_id, canonical_asset_id, event_type, actor_id,
    source_table, source_record_id, summary, payload
  ) values (
    v_wo.organization_id, v_wo.id, v_wo.canonical_asset_id,
    'supply_need_refreshed', public.current_application_user_id(),
    'work_order_supply_needs', v_need_id::text,
    case when v_shortage_count = 0 then 'Los materiales requeridos están cubiertos'
         when v_covered_count > 0 then 'La OT quedó parcialmente cubierta; aún existen faltantes'
         else 'Se detectaron faltantes de materiales' end,
    jsonb_build_object('shortage_lines', v_shortage_count, 'covered_lines', v_covered_count, 'previous_status', v_existing_status)
  );

  return v_need_id;
end;
$function$;

create or replace function public.convert_supply_need_to_intake_request(
  p_supply_need_id uuid,
  p_requested_by uuid default null,
  p_requested_by_name text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
declare
  v_need public.work_order_supply_needs%rowtype;
  v_work_order public.maintenance_work_orders%rowtype;
  v_request_id uuid;
  v_request_number text;
  v_count bigint;
begin
  select * into v_need from public.work_order_supply_needs where id = p_supply_need_id for update;
  if not found then raise exception 'Necesidad de abastecimiento no encontrada'; end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = public.current_application_user_id()
      and ur.organization_id = v_need.organization_id
  ) then raise exception 'Sin permisos para esta organización'; end if;

  select * into v_work_order from public.maintenance_work_orders where id = v_need.work_order_id;
  if not found then raise exception 'Orden de trabajo no encontrada'; end if;

  select id into v_request_id
  from public.procurement_intake_requests
  where organization_id = v_need.organization_id
    and source_supply_need_id = v_need.id;

  if v_request_id is not null then
    update public.work_order_supply_needs
    set procurement_request_id = v_request_id,
        status = case when status = 'covered' then 'covered' else 'sent_to_procurement' end,
        updated_at = now()
    where id = v_need.id;
    return v_request_id;
  end if;

  if not exists (
    select 1 from public.work_order_material_requirements r
    where r.work_order_id = v_need.work_order_id
      and r.quantity_shortage > 0
      and r.status <> 'cancelled'
  ) then raise exception 'La necesidad no tiene faltantes pendientes'; end if;

  select count(*) + 1 into v_count
  from public.procurement_intake_requests
  where organization_id = v_need.organization_id;

  v_request_number := 'SCI-' || to_char(current_date, 'YYYY') || '-' || lpad(v_count::text, 5, '0');

  insert into public.procurement_intake_requests (
    organization_id, request_number, source_supply_need_id, work_order_id, canonical_asset_id,
    requested_by, requested_by_name, priority, required_date, status, justification
  ) values (
    v_need.organization_id, v_request_number, v_need.id, v_need.work_order_id, v_need.canonical_asset_id,
    coalesce(p_requested_by, public.current_application_user_id()), p_requested_by_name,
    coalesce(v_need.priority, 'medium'), v_need.required_date, 'draft',
    'Faltante de materiales para ' || v_work_order.work_order_number
  ) returning id into v_request_id;

  insert into public.procurement_intake_request_lines (
    organization_id, intake_request_id, material_requirement_id, canonical_product_id,
    product_code, description, quantity, unit, estimated_unit_cost
  )
  select r.organization_id, v_request_id, r.id, r.canonical_product_id,
    p.product_code, p.name, r.quantity_shortage, p.unit, p.standard_cost
  from public.work_order_material_requirements r
  join canonical.products p on p.id = r.canonical_product_id
  where r.work_order_id = v_need.work_order_id
    and r.quantity_shortage > 0
    and r.status <> 'cancelled';

  update public.work_order_supply_needs
  set status = 'sent_to_procurement',
      procurement_request_id = v_request_id,
      updated_at = now()
  where id = v_need.id;

  insert into public.work_order_events (
    organization_id, work_order_id, canonical_asset_id, event_type, event_data, created_by
  ) values (
    v_need.organization_id, v_need.work_order_id, v_need.canonical_asset_id,
    'procurement_intake_created',
    jsonb_build_object('intake_request_id', v_request_id, 'request_number', v_request_number),
    public.current_application_user_id()
  );

  return v_request_id;
end;
$function$;

revoke all on function public.refresh_work_order_supply_need(uuid) from public, anon;
grant execute on function public.refresh_work_order_supply_need(uuid) to authenticated, service_role;
revoke all on function public.convert_supply_need_to_intake_request(uuid,uuid,text) from public, anon;
grant execute on function public.convert_supply_need_to_intake_request(uuid,uuid,text) to authenticated, service_role;
