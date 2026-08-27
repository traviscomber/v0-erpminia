revoke insert, update, delete, truncate, references, trigger on public.work_order_close_readiness_v1 from public, anon, authenticated;
revoke select on public.work_order_close_readiness_v1 from public, anon, authenticated;
grant select on public.work_order_close_readiness_v1 to service_role;
