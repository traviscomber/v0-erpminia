create or replace function public.add_work_order_labor(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_technician_id uuid,
  p_technician_name text,
  p_hours numeric,
  p_hourly_cost numeric,
  p_notes text default null,
  p_actor_id uuid default null
)
returns public.work_order_labor_entries
language plpgsql
security definer
set search_path to 'public','canonical','pg_temp'
as $function$
declare
  v_asset_id uuid;
  v_entry public.work_order_labor_entries;
  v_recorded_at timestamptz := now();
begin
  if p_hours <= 0 then raise exception 'Las horas deben ser mayores que cero'; end if;
  if p_hourly_cost < 0 then raise exception 'El costo por hora no puede ser negativo'; end if;

  select canonical_asset_id into v_asset_id
  from public.maintenance_work_orders
  where id=p_work_order_id and organization_id=p_organization_id;
  if not found then raise exception 'OT no encontrada'; end if;
  if v_asset_id is null then raise exception 'La OT requiere un activo canónico para registrar mano de obra'; end if;

  insert into public.work_order_labor_entries(
    organization_id,work_order_id,canonical_asset_id,technician_id,technician_name,
    started_at,ended_at,hours,hourly_cost,notes,created_by
  ) values (
    p_organization_id,p_work_order_id,v_asset_id,p_technician_id,p_technician_name,
    v_recorded_at,v_recorded_at,p_hours,p_hourly_cost,p_notes,p_actor_id
  )
  returning * into v_entry;

  insert into public.work_order_events(
    organization_id,work_order_id,canonical_asset_id,event_type,event_at,actor_id,
    actor_name,source_table,source_record_id,summary,payload
  ) values (
    p_organization_id,p_work_order_id,v_asset_id,'labor_added',v_recorded_at,p_actor_id,
    p_technician_name,'work_order_labor_entries',v_entry.id::text,'Mano de obra registrada',
    jsonb_build_object('hours',p_hours,'hourly_cost',p_hourly_cost,'total',p_hours*p_hourly_cost)
  );

  return v_entry;
end
$function$;
