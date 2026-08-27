create or replace function public.set_my_operational_task_state(
  p_task_key text,
  p_status text,
  p_snoozed_until timestamptz default null
)
returns public.user_action_states
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_cargo uuid;
  v_row public.user_action_states;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_status not in ('pending','read','snoozed') then raise exception 'invalid task state'; end if;
  if p_status='snoozed' and (p_snoozed_until is null or p_snoozed_until<=now()) then raise exception 'future snoozed_until required'; end if;

  select p.organization_id, p.cargo_id
    into v_org, v_cargo
  from public.auth_profile_identity_links l
  join public.profiles p on p.id=l.profile_id
  where l.auth_user_id=v_uid
    and p.status='active'
  limit 1;

  if v_org is null or v_cargo is null then raise exception 'active profile with cargo required'; end if;

  if not exists (
    select 1
    from public.role_task_worklist_v1 t
    where t.organization_id=v_org
      and t.cargo_id=v_cargo
      and t.task_key=p_task_key
  ) then raise exception 'task unavailable for current cargo'; end if;

  insert into public.user_action_states(organization_id,user_id,source_key,status,snoozed_until)
  values(v_org,v_uid,p_task_key,p_status,case when p_status='snoozed' then p_snoozed_until else null end)
  on conflict(organization_id,user_id,source_key)
  do update set status=excluded.status,snoozed_until=excluded.snoozed_until,updated_at=now()
  returning * into v_row;

  return v_row;
end
$function$;

revoke all on function public.set_my_operational_task_state(text,text,timestamptz) from public;
revoke all on function public.set_my_operational_task_state(text,text,timestamptz) from anon;
grant execute on function public.set_my_operational_task_state(text,text,timestamptz) to authenticated, service_role;
