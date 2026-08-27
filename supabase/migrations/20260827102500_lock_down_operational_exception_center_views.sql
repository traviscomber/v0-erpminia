alter view public.operational_exception_center_v1 set (security_invoker = true);
alter view public.operational_exception_center_summary_v1 set (security_invoker = true);
revoke all on public.operational_exception_center_v1 from anon, authenticated;
revoke all on public.operational_exception_center_summary_v1 from anon, authenticated;
grant select on public.operational_exception_center_v1, public.operational_exception_center_summary_v1 to service_role;
