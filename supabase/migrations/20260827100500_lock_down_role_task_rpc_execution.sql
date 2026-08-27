revoke execute on function public.resolve_role_task(text,text,text,uuid,date) from public, anon;
revoke execute on function public.set_my_operational_task_state(text,text,timestamptz) from public, anon;
revoke execute on function public.set_role_task_personal_state(text,text,timestamptz) from public, anon;

grant execute on function public.resolve_role_task(text,text,text,uuid,date) to authenticated, service_role;
grant execute on function public.set_my_operational_task_state(text,text,timestamptz) to authenticated, service_role;
grant execute on function public.set_role_task_personal_state(text,text,timestamptz) to authenticated, service_role;
