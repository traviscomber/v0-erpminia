create or replace function public.release_work_order_material_reservations_v1(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_canonical_product_id uuid default null
) returns integer
language plpgsql
security definer
set search_path to 'public','canonical','pg_temp'
as $$
declare
  v_part record;
  v_count integer := 0;
begin
  if not exists (
    select 1 from public.maintenance_work_orders w
    where w.id = p_work_order_id and w.organization_id = p_organization_id
  ) then raise exception 'OT no encontrada en la organización'; end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = public.current_application_user_id()
      and ur.organization_id = p_organization_id
  ) then raise exception 'Sin acceso a la organización'; end if;

  for v_part in
    select wp.id, wp.warehouse_stock_id, wp.quantity_reserved
    from public.work_order_parts wp
    where wp.organization_id = p_organization_id
      and wp.work_order_id = p_work_order_id
      and wp.status = 'reserved'
      and wp.quantity_reserved > 0
      and (p_canonical_product_id is null or wp.canonical_product_id = p_canonical_product_id)
    order by wp.created_at, wp.id
    for update
  loop
    if v_part.warehouse_stock_id is not null then
      update public.warehouse_stock ws
      set quantity_reserved = greatest(coalesce(ws.quantity_reserved,0) - v_part.quantity_reserved, 0),
          updated_at = now()
      where ws.id = v_part.warehouse_stock_id
        and ws.organization_id = p_organization_id;
    end if;

    update public.work_order_parts
    set quantity_reserved = 0,
        status = 'cancelled',
        updated_at = now()
    where id = v_part.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.reserve_available_materials_to_work_order_v1(
  p_organization_id uuid,
  p_work_order_id uuid
) returns jsonb
language plpgsql
security definer
set search_path to 'public','canonical','pg_temp'
as $$
declare
  v_wo public.maintenance_work_orders%rowtype;
  v_req record;
  v_stock record;
  v_existing_reserved integer;
  v_issued numeric;
  v_needed integer;
  v_take integer;
  v_reserved_units integer := 0;
  v_lines integer := 0;
begin
  select * into v_wo
  from public.maintenance_work_orders
  where id = p_work_order_id
    and organization_id = p_organization_id
  for update;

  if not found then raise exception 'OT no encontrada en la organización'; end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = public.current_application_user_id()
      and ur.organization_id = p_organization_id
  ) then raise exception 'Sin acceso a la organización'; end if;

  for v_req in
    select r.*
    from public.work_order_material_requirements r
    where r.organization_id = p_organization_id
      and r.work_order_id = p_work_order_id
      and r.status <> 'cancelled'
    order by r.created_at, r.id
    for update
  loop
    select coalesce(sum(wp.quantity_reserved),0)::integer,
           coalesce(sum(greatest(wp.quantity_issued - wp.quantity_returned,0)),0)
      into v_existing_reserved, v_issued
    from public.work_order_parts wp
    where wp.organization_id = p_organization_id
      and wp.work_order_id = p_work_order_id
      and wp.canonical_product_id = v_req.canonical_product_id
      and wp.status <> 'cancelled';

    v_needed := greatest(ceil(v_req.quantity_required - v_issued - v_existing_reserved)::integer, 0);

    if v_needed > 0 then
      for v_stock in
        select ws.id, ws.quantity_on_hand, ws.quantity_reserved, ws.quantity_available, ws.unit_cost
        from public.warehouse_stock ws
        where ws.organization_id = p_organization_id
          and ws.canonical_product_id = v_req.canonical_product_id
          and coalesce(ws.quantity_available,0) > 0
        order by ws.expiry_date nulls last, ws.created_at, ws.id
        for update
      loop
        exit when v_needed <= 0;
        v_take := least(v_needed, greatest(coalesce(v_stock.quantity_on_hand,0) - coalesce(v_stock.quantity_reserved,0),0));
        if v_take <= 0 then continue; end if;

        update public.warehouse_stock
        set quantity_reserved = coalesce(quantity_reserved,0) + v_take,
            updated_at = now()
        where id = v_stock.id
          and organization_id = p_organization_id;

        insert into public.work_order_parts(
          organization_id, work_order_id, canonical_asset_id, canonical_product_id,
          warehouse_stock_id, quantity_requested, quantity_reserved, quantity_issued,
          quantity_installed, quantity_returned, unit_cost, status, created_by
        ) values (
          p_organization_id, p_work_order_id, v_wo.canonical_asset_id, v_req.canonical_product_id,
          v_stock.id, v_take, v_take, 0, 0, 0, coalesce(v_stock.unit_cost,0), 'reserved',
          public.current_application_user_id()
        );

        v_needed := v_needed - v_take;
        v_reserved_units := v_reserved_units + v_take;
        v_lines := v_lines + 1;
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'work_order_id', p_work_order_id,
    'reservation_lines', v_lines,
    'units_reserved', v_reserved_units
  );
end;
$$;

create or replace function public.refresh_work_order_supply_need(p_work_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public','canonical','pg_temp'
as $$
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

  perform public.reserve_available_materials_to_work_order_v1(v_wo.organization_id, p_work_order_id);

  update public.work_order_material_requirements r
  set quantity_available =
        coalesce((select sum(greatest(coalesce(wp.quantity_reserved,0),0)) from public.work_order_parts wp where wp.organization_id=r.organization_id and wp.work_order_id=r.work_order_id and wp.canonical_product_id=r.canonical_product_id and wp.status='reserved'),0)
        + coalesce((select sum(greatest(coalesce(wp.quantity_issued,0)-coalesce(wp.quantity_returned,0),0)) from public.work_order_parts wp where wp.organization_id=r.organization_id and wp.work_order_id=r.work_order_id and wp.canonical_product_id=r.canonical_product_id and wp.status<>'cancelled'),0),
      status = case
        when r.status = 'cancelled' then 'cancelled'
        when (
          coalesce((select sum(greatest(coalesce(wp.quantity_reserved,0),0)) from public.work_order_parts wp where wp.organization_id=r.organization_id and wp.work_order_id=r.work_order_id and wp.canonical_product_id=r.canonical_product_id and wp.status='reserved'),0)
          + coalesce((select sum(greatest(coalesce(wp.quantity_issued,0)-coalesce(wp.quantity_returned,0),0)) from public.work_order_parts wp where wp.organization_id=r.organization_id and wp.work_order_id=r.work_order_id and wp.canonical_product_id=r.canonical_product_id and wp.status<>'cancelled'),0)
        ) >= r.quantity_required then 'covered'
        else 'procurement_needed'
      end,
      updated_at = now()
  where r.work_order_id = p_work_order_id;

  select count(*) into v_shortage_count from public.work_order_material_requirements where work_order_id=p_work_order_id and quantity_shortage>0 and status<>'cancelled';
  select count(*) into v_covered_count from public.work_order_material_requirements where work_order_id=p_work_order_id and quantity_shortage=0 and status<>'cancelled';
  select status into v_existing_status from public.work_order_supply_needs where work_order_id=p_work_order_id;

  insert into public.work_order_supply_needs(organization_id,work_order_id,canonical_asset_id,status,priority,required_date,created_by)
  values(v_wo.organization_id,v_wo.id,v_wo.canonical_asset_id,
    case when v_shortage_count=0 then 'covered' when v_covered_count>0 then 'partially_covered' else 'open' end,
    coalesce(v_wo.priority,'medium'),v_wo.scheduled_date,public.current_application_user_id())
  on conflict (work_order_id) do update set
    canonical_asset_id=excluded.canonical_asset_id,
    status=case when v_shortage_count=0 then 'covered' when public.work_order_supply_needs.status in ('sent_to_procurement','partially_covered') and v_covered_count>0 then 'partially_covered' when public.work_order_supply_needs.status='sent_to_procurement' then 'sent_to_procurement' when v_covered_count>0 then 'partially_covered' else 'open' end,
    priority=excluded.priority,required_date=excluded.required_date,updated_at=now()
  returning id into v_need_id;

  insert into public.work_order_events(organization_id,work_order_id,canonical_asset_id,event_type,actor_id,source_table,source_record_id,summary,payload)
  values(v_wo.organization_id,v_wo.id,v_wo.canonical_asset_id,'supply_need_refreshed',public.current_application_user_id(),
    'work_order_supply_needs',v_need_id::text,
    case when v_shortage_count=0 then 'Los materiales requeridos están reservados o entregados' when v_covered_count>0 then 'La OT quedó parcialmente cubierta; aún existen faltantes' else 'Se detectaron faltantes de materiales' end,
    jsonb_build_object('shortage_lines',v_shortage_count,'covered_lines',v_covered_count,'previous_status',v_existing_status,'coverage_basis','reserved_or_issued'));

  return v_need_id;
end;
$$;

create or replace function public.issue_available_materials_to_work_order_v2(p_organization_id uuid,p_work_order_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public','canonical','pg_temp' as $$
declare
  v_wo public.maintenance_work_orders%rowtype; v_part record; v_stock record; v_move_id uuid;
  v_qty integer; v_count integer:=0; v_units integer:=0;
begin
  select * into v_wo from public.maintenance_work_orders where id=p_work_order_id and organization_id=p_organization_id for update;
  if not found then raise exception 'OT no encontrada en la organización'; end if;
  if not exists(select 1 from public.user_roles ur where ur.user_id=public.current_application_user_id() and ur.organization_id=p_organization_id) then raise exception 'Sin acceso a la organización'; end if;
  perform public.refresh_work_order_supply_need(p_work_order_id);
  for v_part in select wp.* from public.work_order_parts wp where wp.organization_id=p_organization_id and wp.work_order_id=p_work_order_id and wp.status='reserved' and wp.quantity_reserved>0 order by wp.created_at,wp.id for update
  loop
    select * into v_stock from public.warehouse_stock where id=v_part.warehouse_stock_id and organization_id=p_organization_id for update;
    if not found then raise exception 'Stock reservado no encontrado'; end if;
    v_qty:=least(v_part.quantity_reserved,coalesce(v_stock.quantity_on_hand,0),coalesce(v_stock.quantity_reserved,0));
    if v_qty<=0 then continue; end if;
    update public.warehouse_stock set quantity_on_hand=quantity_on_hand-v_qty,quantity_reserved=greatest(quantity_reserved-v_qty,0),updated_at=now() where id=v_stock.id;
    insert into public.stock_movements(organization_id,stock_id,movement_type,quantity,reference_doc,reference_id,performed_by,reason,work_order_id,canonical_asset_id,canonical_product_id,unit_cost,total_cost,created_at)
    values(p_organization_id,v_stock.id,'issue',v_qty,'work_order',p_work_order_id,auth.uid(),'Entrega de reserva a OT',p_work_order_id,v_wo.canonical_asset_id,v_part.canonical_product_id,v_part.unit_cost,v_qty*v_part.unit_cost,now()) returning id into v_move_id;
    update public.work_order_parts set quantity_reserved=quantity_reserved-v_qty,quantity_issued=quantity_issued+v_qty,stock_movement_id=v_move_id,status=case when quantity_reserved-v_qty>0 then 'reserved' else 'issued' end,updated_at=now() where id=v_part.id;
    v_count:=v_count+1; v_units:=v_units+v_qty;
  end loop;
  perform public.refresh_work_order_supply_need(p_work_order_id);
  insert into public.work_order_events(organization_id,work_order_id,canonical_asset_id,event_type,actor_id,source_table,source_record_id,summary,payload)
  values(p_organization_id,p_work_order_id,v_wo.canonical_asset_id,'materials_issued',public.current_application_user_id(),'work_order_parts',p_work_order_id::text,'Reservas de materiales entregadas a la OT',jsonb_build_object('lines_issued',v_count,'units_issued',v_units,'source','explicit_reservation'));
  return jsonb_build_object('organization_id',p_organization_id,'work_order_id',p_work_order_id,'lines_issued',v_count,'units_issued',v_units);
end;
$$;

create or replace function public.replace_work_order_material_requirements_v1(p_organization_id uuid,p_work_order_id uuid,p_materials jsonb)
returns jsonb language plpgsql security definer set search_path to 'public','canonical','pg_temp' as $$
declare
  v_wo public.maintenance_work_orders%rowtype; v_item jsonb; v_product_id uuid; v_qty numeric; v_required_date date; v_notes text; v_supply_need_id uuid; v_status jsonb;
begin
  select * into v_wo from public.maintenance_work_orders where id=p_work_order_id and organization_id=p_organization_id for update;
  if not found then raise exception 'OT no encontrada en la organización'; end if;
  if not exists(select 1 from public.user_roles ur where ur.user_id=public.current_application_user_id() and ur.organization_id=p_organization_id) then raise exception 'Sin acceso a la organización'; end if;
  if p_materials is null or jsonb_typeof(p_materials)<>'array' then raise exception 'materials debe ser un arreglo'; end if;
  perform public.release_work_order_material_reservations_v1(p_organization_id,p_work_order_id,null);
  delete from public.work_order_material_requirements where organization_id=p_organization_id and work_order_id=p_work_order_id;
  for v_item in select value from jsonb_array_elements(p_materials)
  loop
    v_product_id:=nullif(v_item->>'canonicalProductId','')::uuid;
    v_qty:=nullif(v_item->>'quantityRequired','')::numeric;
    v_required_date:=nullif(v_item->>'requiredDate','')::date;
    v_notes:=nullif(trim(coalesce(v_item->>'notes','')),'');
    if v_product_id is null or v_qty is null or v_qty<=0 then raise exception 'Producto y cantidad requerida son obligatorios'; end if;
    if not exists(select 1 from canonical.products p where p.id=v_product_id and p.organization_id=p_organization_id) then raise exception 'Producto no pertenece a la organización'; end if;
    insert into public.work_order_material_requirements(organization_id,work_order_id,canonical_asset_id,canonical_product_id,quantity_required,required_date,notes,created_by,updated_at)
    values(p_organization_id,p_work_order_id,v_wo.canonical_asset_id,v_product_id,v_qty,v_required_date,v_notes,public.current_application_user_id(),now());
  end loop;
  v_supply_need_id:=public.refresh_work_order_supply_need(p_work_order_id);
  v_status:=public.get_work_order_supply_status_v1(p_organization_id,p_work_order_id);
  return jsonb_build_object('supply_need_id',v_supply_need_id,'supply_status',v_status);
end;
$$;

revoke all on function public.release_work_order_material_reservations_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.reserve_available_materials_to_work_order_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.issue_available_materials_to_work_order_v2(uuid,uuid) from public,anon,authenticated;
revoke all on function public.replace_work_order_material_requirements_v1(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.release_work_order_material_reservations_v1(uuid,uuid,uuid) to authenticated,service_role;
grant execute on function public.reserve_available_materials_to_work_order_v1(uuid,uuid) to authenticated,service_role;
grant execute on function public.issue_available_materials_to_work_order_v2(uuid,uuid) to authenticated,service_role;
grant execute on function public.replace_work_order_material_requirements_v1(uuid,uuid,jsonb) to authenticated,service_role;
