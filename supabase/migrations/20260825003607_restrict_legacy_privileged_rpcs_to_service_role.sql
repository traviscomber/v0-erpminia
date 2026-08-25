revoke execute on function public.approve_procurement_supplier_candidate(uuid,boolean,text) from public, anon, authenticated;
revoke execute on function public.approve_role_matrix_change(uuid,text,boolean,text) from public, anon, authenticated;
revoke execute on function public.submit_role_matrix_change(uuid,uuid,text,text,text,text) from public, anon, authenticated;

grant execute on function public.approve_procurement_supplier_candidate(uuid,boolean,text) to service_role;
grant execute on function public.approve_role_matrix_change(uuid,text,boolean,text) to service_role;
grant execute on function public.submit_role_matrix_change(uuid,uuid,text,text,text,text) to service_role;
