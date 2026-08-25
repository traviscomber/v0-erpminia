alter table public.maintenance_work_orders
  add column if not exists timer_status text not null default 'idle',
  add column if not exists timer_start_time timestamptz,
  add column if not exists total_timer_minutes integer not null default 0;

alter table public.maintenance_work_orders
  drop constraint if exists maintenance_work_orders_timer_status_check,
  add constraint maintenance_work_orders_timer_status_check
    check (timer_status in ('idle', 'running', 'paused')),
  drop constraint if exists maintenance_work_orders_total_timer_minutes_check,
  add constraint maintenance_work_orders_total_timer_minutes_check
    check (total_timer_minutes >= 0);

create or replace function public.update_work_order_timer(
  p_organization_id uuid,
  p_work_order_id uuid,
  p_action text,
  p_actor_id uuid default null,
  p_actor_name text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_wo public.maintenance_work_orders%rowtype;
  v_now timestamptz := now();
  v_new_status text;
  v_new_start timestamptz;
  v_total_minutes integer;
  v_elapsed_minutes integer := 0;
  v_summary text;
begin
  if p_action not in ('play', 'pause', 'resume', 'terminate') then
    raise exception 'Invalid timer action: %', p_action using errcode = '22023';
  end if;

  select *
    into v_wo
    from public.maintenance_work_orders
   where id = p_work_order_id
     and organization_id = p_organization_id
   for update;

  if not found then
    raise exception 'Work order not found' using errcode = 'P0002';
  end if;

  v_new_status := coalesce(v_wo.timer_status, 'idle');
  v_new_start := v_wo.timer_start_time;
  v_total_minutes := coalesce(v_wo.total_timer_minutes, 0);

  if p_action = 'play' then
    if v_new_status <> 'idle' then
      raise exception 'Timer can only start from idle' using errcode = '55000';
    end if;
    v_new_status := 'running';
    v_new_start := v_now;
    v_summary := 'Temporizador de trabajo iniciado';
  elsif p_action = 'pause' then
    if v_new_status <> 'running' or v_new_start is null then
      raise exception 'Timer can only pause while running' using errcode = '55000';
    end if;
    v_elapsed_minutes := greatest(0, floor(extract(epoch from (v_now - v_new_start)) / 60)::integer);
    v_total_minutes := v_total_minutes + v_elapsed_minutes;
    v_new_status := 'paused';
    v_new_start := null;
    v_summary := 'Temporizador de trabajo pausado';
  elsif p_action = 'resume' then
    if v_new_status <> 'paused' then
      raise exception 'Timer can only resume from paused' using errcode = '55000';
    end if;
    v_new_status := 'running';
    v_new_start := v_now;
    v_summary := 'Temporizador de trabajo reanudado';
  elsif p_action = 'terminate' then
    if v_new_status not in ('running', 'paused') then
      raise exception 'Timer can only terminate while running or paused' using errcode = '55000';
    end if;
    if v_new_status = 'running' and v_new_start is not null then
      v_elapsed_minutes := greatest(0, floor(extract(epoch from (v_now - v_new_start)) / 60)::integer);
      v_total_minutes := v_total_minutes + v_elapsed_minutes;
    end if;
    v_new_status := 'idle';
    v_new_start := null;
    v_summary := 'Temporizador de trabajo finalizado';
  end if;

  update public.maintenance_work_orders
     set timer_status = v_new_status,
         timer_start_time = v_new_start,
         total_timer_minutes = v_total_minutes,
         actual_duration_hours = v_total_minutes::numeric / 60,
         updated_at = v_now
   where id = p_work_order_id
     and organization_id = p_organization_id;

  insert into public.work_order_events (
    organization_id,
    work_order_id,
    canonical_asset_id,
    event_type,
    event_at,
    actor_id,
    actor_name,
    source_table,
    source_record_id,
    summary,
    payload
  ) values (
    p_organization_id,
    p_work_order_id,
    v_wo.canonical_asset_id,
    'timer_' || p_action,
    v_now,
    p_actor_id,
    nullif(trim(coalesce(p_actor_name, '')), ''),
    'public.maintenance_work_orders',
    p_work_order_id::text,
    v_summary,
    jsonb_build_object(
      'action', p_action,
      'previous_status', coalesce(v_wo.timer_status, 'idle'),
      'new_status', v_new_status,
      'elapsed_minutes', v_elapsed_minutes,
      'total_minutes', v_total_minutes,
      'notes', nullif(trim(coalesce(p_notes, '')), '')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'action', p_action,
    'timer_status', v_new_status,
    'timer_start_time', v_new_start,
    'total_minutes', v_total_minutes,
    'total_hours', round((v_total_minutes::numeric / 60), 1)
  );
end;
$$;

revoke all on function public.update_work_order_timer(uuid, uuid, text, uuid, text, text) from public;
revoke all on function public.update_work_order_timer(uuid, uuid, text, uuid, text, text) from anon;
revoke all on function public.update_work_order_timer(uuid, uuid, text, uuid, text, text) from authenticated;
grant execute on function public.update_work_order_timer(uuid, uuid, text, uuid, text, text) to service_role;
