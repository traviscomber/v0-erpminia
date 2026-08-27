create or replace function public.issue_available_materials_to_work_order(p_work_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','canonical','pg_temp'
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org
  from public.maintenance_work_orders
  where id = p_work_order_id;

  if v_org is null then
    raise exception 'OT no encontrada';
  end if;

  return public.issue_available_materials_to_work_order_v2(v_org,p_work_order_id);
end;
$$;

revoke all on function public.issue_available_materials_to_work_order(uuid) from public,anon;
grant execute on function public.issue_available_materials_to_work_order(uuid) to authenticated,service_role;
