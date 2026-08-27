create or replace function public.upsert_work_order_material_requirement_v1(
  p_work_order_id uuid,
  p_canonical_product_id uuid,
  p_quantity_required numeric,
  p_required_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
declare
  v_actor uuid := public.current_application_user_id();
  v_wo public.maintenance_work_orders%rowtype;
  v_existing public.work_order_material_requirements%rowtype;
  v_requirement_id uuid;
  v_need_id uuid;
begin
  if v_actor is null then
    raise exception 'Usuario autenticado requerido';
  end if;

  if p_quantity_required is null or p_quantity_required <= 0 then
    raise exception 'La cantidad requerida debe ser mayor que cero';
  end if;

  select * into v_wo
  from public.maintenance_work_orders
  where id = p_work_order_id
  for update;

  if not found then
    raise exception 'Orden de trabajo no encontrada';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_actor
      and ur.organization_id = v_wo.organization_id
  ) then
    raise exception 'Sin acceso a la organización';
  end if;

  if not exists (
    select 1
    from canonical.products p
    where p.id = p_canonical_product_id
      and p.organization_id = v_wo.organization_id
      and p.is_active = true
  ) then
    raise exception 'Producto canónico activo no encontrado en esta organización';
  end if;

  select * into v_existing
  from public.work_order_material_requirements
  where work_order_id = p_work_order_id
    and canonical_product_id = p_canonical_product_id
  for update;

  if found and v_existing.status in ('ordered','received') then
    raise exception 'El requerimiento ya está comprometido en abastecimiento y no puede editarse';
  end if;

  insert into public.work_order_material_requirements (
    organization_id,
    work_order_id,
    canonical_asset_id,
    canonical_product_id,
    quantity_required,
    required_date,
    notes,
    status,
    created_by
  ) values (
    v_wo.organization_id,
    v_wo.id,
    v_wo.canonical_asset_id,
    p_canonical_product_id,
    p_quantity_required,
    coalesce(p_required_date, v_wo.scheduled_date),
    nullif(btrim(p_notes),''),
    'pending',
    v_actor
  )
  on conflict (work_order_id, canonical_product_id) do update set
    quantity_required = excluded.quantity_required,
    required_date = excluded.required_date,
    notes = excluded.notes,
    status = 'pending',
    updated_at = now()
  returning id into v_requirement_id;

  v_need_id := public.refresh_work_order_supply_need(p_work_order_id);

  insert into public.work_order_events (
    organization_id, work_order_id, canonical_asset_id, event_type, actor_id,
    source_table, source_record_id, summary, payload
  ) values (
    v_wo.organization_id, v_wo.id, v_wo.canonical_asset_id,
    'material_requirement_set', v_actor,
    'work_order_material_requirements', v_requirement_id::text,
    'Repuesto requerido registrado en la OT',
    jsonb_build_object(
      'canonical_product_id', p_canonical_product_id,
      'quantity_required', p_quantity_required,
      'supply_need_id', v_need_id
    )
  );

  return jsonb_build_object(
    'requirement_id', v_requirement_id,
    'supply_need_id', v_need_id,
    'supply_status', public.get_work_order_supply_status_v1(v_wo.organization_id, v_wo.id)
  );
end;
$function$;

revoke all on function public.upsert_work_order_material_requirement_v1(uuid,uuid,numeric,date,text) from public, anon;
grant execute on function public.upsert_work_order_material_requirement_v1(uuid,uuid,numeric,date,text) to authenticated, service_role;
