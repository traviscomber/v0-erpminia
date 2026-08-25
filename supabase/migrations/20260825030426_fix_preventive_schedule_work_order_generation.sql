update public.preventive_maintenance_schedules s
set canonical_asset_id = s.asset_id,
    updated_at = now()
where s.canonical_asset_id is null
  and exists (
    select 1
    from canonical.assets ca
    where ca.id = s.asset_id
      and ca.organization_id = s.organization_id
  );

create or replace function public.create_work_order_from_schedule(
  p_schedule_id uuid,
  p_created_by uuid default null::uuid
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'canonical'
as $function$
declare
  s public.preventive_maintenance_schedules%rowtype;
  v_id uuid;
  v_number text;
  v_canonical_asset_id uuid;
  v_auth_created_by uuid;
begin
  select * into s
  from public.preventive_maintenance_schedules
  where id = p_schedule_id
  for update;

  if not found then
    raise exception 'Plan preventivo no encontrado';
  end if;

  if not s.enabled then
    raise exception 'Plan preventivo inactivo';
  end if;

  v_canonical_asset_id := coalesce(s.canonical_asset_id, s.asset_id);

  if not exists (
    select 1
    from canonical.assets ca
    where ca.id = v_canonical_asset_id
      and ca.organization_id = s.organization_id
  ) then
    raise exception 'Plan sin activo canónico';
  end if;

  if s.generated_work_order_id is not null
     and exists (
       select 1
       from public.maintenance_work_orders
       where id = s.generated_work_order_id
         and status not in ('completed', 'closed', 'cancelled')
     ) then
    return s.generated_work_order_id;
  end if;

  v_auth_created_by := p_created_by;

  if v_auth_created_by is not null
     and not exists (select 1 from auth.users u where u.id = v_auth_created_by) then
    select u.id
      into v_auth_created_by
    from public.profiles p
    join auth.users u on lower(u.email) = lower(p.email)
    where p.id = p_created_by
      and p.organization_id = s.organization_id
    limit 1;
  end if;

  if v_auth_created_by is not null
     and not exists (select 1 from auth.users u where u.id = v_auth_created_by) then
    v_auth_created_by := null;
  end if;

  v_number := 'OT-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');

  insert into public.maintenance_work_orders(
    organization_id,
    work_order_number,
    canonical_asset_id,
    title,
    description,
    work_type,
    status,
    priority,
    scheduled_date,
    planned_duration_hours,
    created_by,
    created_at,
    updated_at
  ) values (
    s.organization_id,
    v_number,
    v_canonical_asset_id,
    s.task_name,
    s.description,
    'preventive',
    'planned',
    coalesce(s.priority, 'medium'),
    coalesce(s.next_scheduled_date, current_date),
    s.estimated_duration_hours,
    v_auth_created_by,
    now(),
    now()
  ) returning id into v_id;

  update public.preventive_maintenance_schedules
  set canonical_asset_id = v_canonical_asset_id,
      generated_work_order_id = v_id,
      last_generated_at = now(),
      updated_at = now()
  where id = p_schedule_id;

  insert into public.work_order_events(
    organization_id,
    work_order_id,
    canonical_asset_id,
    event_type,
    actor_id,
    source_table,
    source_record_id,
    summary,
    payload
  ) values (
    s.organization_id,
    v_id,
    v_canonical_asset_id,
    'created_from_schedule',
    p_created_by,
    'preventive_maintenance_schedules',
    p_schedule_id::text,
    'OT generada desde plan preventivo',
    jsonb_build_object('schedule_id', p_schedule_id)
  );

  return v_id;
end;
$function$;
