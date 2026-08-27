create or replace function public.recalculate_work_order_material_coverage(
  p_work_order_id uuid,
  p_actor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
begin
  return public.refresh_work_order_supply_need(p_work_order_id);
end;
$function$;

revoke all on function public.recalculate_work_order_material_coverage(uuid,uuid) from public, anon, authenticated;
grant execute on function public.recalculate_work_order_material_coverage(uuid,uuid) to service_role;
