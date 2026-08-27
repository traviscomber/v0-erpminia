alter view public.canonical_product_price_benchmarks_v1 set (security_invoker = true);
alter view public.operational_role_inbox_coverage_v1 set (security_invoker = true);
alter view public.operational_task_inbox_by_user_v2 set (security_invoker = true);
revoke all on public.canonical_product_price_benchmarks_v1 from public, anon, authenticated;
revoke all on public.operational_role_inbox_coverage_v1 from public, anon, authenticated;
revoke all on public.operational_task_inbox_by_user_v2 from public, anon, authenticated;
grant select on public.canonical_product_price_benchmarks_v1 to service_role;
grant select on public.operational_role_inbox_coverage_v1 to service_role;
grant select on public.operational_task_inbox_by_user_v2 to service_role;
