revoke all on public.role_tasks_by_cargo_v1 from anon, authenticated;
revoke all on public.role_tasks_actionable_v1 from anon, authenticated;
revoke all on public.role_task_escalations_v1 from anon, authenticated;
revoke all on public.role_task_worklist_v1 from anon, authenticated;
revoke all on public.role_task_personal_inbox_v1 from anon, authenticated;
revoke all on public.role_task_operational_lanes_v1 from anon, authenticated;
revoke all on public.role_task_primary_inbox_v1 from anon, authenticated;
revoke all on public.role_task_primary_inbox_summary_v1 from anon, authenticated;
revoke all on public.role_task_actions_available_v1 from anon, authenticated;
revoke all on public.role_task_frontend_v1 from anon, authenticated;
revoke all on public.role_task_frontend_summary_v1 from anon, authenticated;
revoke all on public.role_task_daily_brief_v1 from anon, authenticated;
revoke all on public.role_task_action_catalog_v1 from anon, authenticated;
revoke all on public.role_task_worklist_summary_v1 from anon, authenticated;
revoke all on public.role_tasks_by_cargo_summary_v1 from anon, authenticated;

grant select on public.role_tasks_by_cargo_v1, public.role_tasks_actionable_v1, public.role_task_escalations_v1, public.role_task_worklist_v1, public.role_task_personal_inbox_v1, public.role_task_operational_lanes_v1, public.role_task_primary_inbox_v1, public.role_task_primary_inbox_summary_v1, public.role_task_actions_available_v1, public.role_task_frontend_v1, public.role_task_frontend_summary_v1, public.role_task_daily_brief_v1, public.role_task_action_catalog_v1, public.role_task_worklist_summary_v1, public.role_tasks_by_cargo_summary_v1 to service_role;
