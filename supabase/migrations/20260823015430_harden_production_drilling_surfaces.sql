-- Persist the production/drilling security posture already applied in Supabase.
-- These tables are intentionally server-only. service_role keeps backend access;
-- anon/authenticated receive no direct table grants and therefore need no RLS policies.

alter table public.maintenance_drilling_source_schedules enable row level security;
alter table public.production_drilling_dataset_summary enable row level security;
alter table public.production_drilling_hole_summary enable row level security;
alter table public.production_drilling_monthly_metrics enable row level security;
alter table public.production_drilling_operator_monthly enable row level security;
alter table public.production_drilling_source_reports enable row level security;
alter table public.production_internal_stage_auth enable row level security;
alter table public.production_monthly_plan_lines enable row level security;
alter table public.production_monthly_plans enable row level security;
alter table public.production_source_documents enable row level security;

revoke all on table public.maintenance_drilling_source_schedules from anon, authenticated;
revoke all on table public.production_drilling_dataset_summary from anon, authenticated;
revoke all on table public.production_drilling_hole_summary from anon, authenticated;
revoke all on table public.production_drilling_monthly_metrics from anon, authenticated;
revoke all on table public.production_drilling_operator_monthly from anon, authenticated;
revoke all on table public.production_drilling_source_reports from anon, authenticated;
revoke all on table public.production_internal_stage_auth from anon, authenticated;
revoke all on table public.production_monthly_plan_lines from anon, authenticated;
revoke all on table public.production_monthly_plans from anon, authenticated;
revoke all on table public.production_source_documents from anon, authenticated;
