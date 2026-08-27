revoke all on public.operational_tasks_by_cargo_v1 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_v2 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_v3 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_v4 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_v5 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_v6 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_v7 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_summary_v1 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_summary_v2 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_summary_v3 from anon, authenticated;
revoke all on public.operational_tasks_by_cargo_summary_v4 from anon, authenticated;

grant select on public.operational_tasks_by_cargo_v1, public.operational_tasks_by_cargo_v2, public.operational_tasks_by_cargo_v3, public.operational_tasks_by_cargo_v4, public.operational_tasks_by_cargo_v5, public.operational_tasks_by_cargo_v6, public.operational_tasks_by_cargo_v7, public.operational_tasks_by_cargo_summary_v1, public.operational_tasks_by_cargo_summary_v2, public.operational_tasks_by_cargo_summary_v3, public.operational_tasks_by_cargo_summary_v4 to service_role;

alter table public.operational_task_sla_policies enable row level security;
revoke all on table public.operational_task_sla_policies from anon, authenticated;
grant select on table public.operational_task_sla_policies to service_role;
