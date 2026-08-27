alter view public.operational_attention_global_v1 set (security_invoker = true);
alter view public.operational_attention_global_summary_v1 set (security_invoker = true);
revoke all on public.operational_attention_global_v1 from public, anon, authenticated;
revoke all on public.operational_attention_global_summary_v1 from public, anon, authenticated;
grant select on public.operational_attention_global_v1 to service_role;
grant select on public.operational_attention_global_summary_v1 to service_role;

alter view public.operational_tasks_by_cargo_v1 set (security_invoker = true);
alter view public.operational_tasks_by_cargo_v2 set (security_invoker = true);
alter view public.operational_tasks_by_cargo_v3 set (security_invoker = true);
alter view public.operational_tasks_by_cargo_v4 set (security_invoker = true);
alter view public.operational_tasks_by_cargo_v5 set (security_invoker = true);

alter view public.operational_tasks_by_cargo_summary_v1 set (security_invoker = true);
alter view public.operational_tasks_by_cargo_summary_v2 set (security_invoker = true);
alter view public.operational_tasks_by_cargo_summary_v3 set (security_invoker = true);
alter view public.operational_tasks_by_cargo_summary_v4 set (security_invoker = true);
