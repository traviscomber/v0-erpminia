alter function public.record_maintenance_asset_lifecycle_history() set search_path = public, pg_temp;
alter function public.guard_role_matrix_direct_write() set search_path = public, pg_temp;

revoke execute on function public.enforce_procurement_intake_identity() from public, anon, authenticated;
revoke execute on function public.enforce_procurement_order_identity() from public, anon, authenticated;
revoke execute on function public.enforce_supply_need_identity() from public, anon, authenticated;
revoke execute on function public.enforce_work_order_child_asset_identity() from public, anon, authenticated;
revoke execute on function public.record_maintenance_asset_lifecycle_history() from public, anon, authenticated;
revoke execute on function public.guard_role_matrix_direct_write() from public, anon, authenticated;

grant execute on function public.enforce_procurement_intake_identity() to service_role;
grant execute on function public.enforce_procurement_order_identity() to service_role;
grant execute on function public.enforce_supply_need_identity() to service_role;
grant execute on function public.enforce_work_order_child_asset_identity() to service_role;
grant execute on function public.record_maintenance_asset_lifecycle_history() to service_role;
grant execute on function public.guard_role_matrix_direct_write() to service_role;
