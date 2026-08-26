-- Motil operational task system checkpoint
-- Generated from the verified production state on 2026-08-26.
-- This migration is intentionally non-destructive: it asserts that the
-- production migrations applied directly to Supabase are present before
-- subsequent repository-managed migrations depend on them.

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  obj text;
BEGIN
  FOREACH obj IN ARRAY ARRAY[
    'public.product_media_autopilot_runs',
    'public.operational_exception_center_v1',
    'public.operational_attention_global_v1',
    'public.operational_tasks_by_cargo_v4',
    'public.role_tasks_by_cargo_v1',
    'public.operational_task_sla_policies',
    'public.role_tasks_actionable_v1',
    'public.role_task_escalations_v1',
    'public.role_task_worklist_v1',
    'public.role_task_resolution_audit',
    'public.role_task_action_catalog_v1',
    'public.role_task_actions_available_v1',
    'public.role_task_personal_inbox_v1',
    'public.role_task_frontend_v1',
    'public.role_task_frontend_summary_v1',
    'public.role_task_operational_lanes_v1',
    'public.role_task_primary_inbox_v1',
    'public.role_task_primary_inbox_summary_v1',
    'public.role_task_daily_brief_v1'
  ] LOOP
    IF to_regclass(obj) IS NULL THEN
      missing := array_append(missing, obj);
    END IF;
  END LOOP;

  IF to_regprocedure('public.resolve_role_task(text,text,text,uuid,date)') IS NULL THEN
    missing := array_append(missing, 'public.resolve_role_task(text,text,text,uuid,date)');
  END IF;

  IF to_regprocedure('public.set_role_task_personal_state(text,text,timestamp with time zone)') IS NULL THEN
    missing := array_append(missing, 'public.set_role_task_personal_state(text,text,timestamptz)');
  END IF;

  IF to_regprocedure('public.motil_media_autopilot_discover(integer)') IS NULL THEN
    missing := array_append(missing, 'public.motil_media_autopilot_discover(integer)');
  END IF;

  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Motil 2026-08-26 production checkpoint missing objects: %', array_to_string(missing, ', ');
  END IF;
END
$$;

COMMENT ON VIEW public.role_task_daily_brief_v1 IS
  'Motil daily brief by cargo. Separates current operation, aging backlog, historical backlog and escalations.';

COMMENT ON VIEW public.role_task_frontend_v1 IS
  'Frontend contract for Motil role tasks, including responsibility-aware labels, module routes and allowed actions.';

COMMENT ON VIEW public.operational_attention_global_v1 IS
  'Global Motil operational attention surface. Non-operational module noise is excluded unless it directly blocks operation.';

-- Production migrations covered by this checkpoint:
-- 20260826171732 automate_motil_product_media_autopilot
-- 20260826173030 add_unified_exception_center_v1
-- 20260826173353 focus_global_alerts_on_direct_operational_impact
-- 20260826173742 add_operational_tasks_by_cargo_v1
-- 20260826173807 refine_operational_task_ownership_by_cargo_v2
-- 20260826174530 extend_operational_tasks_by_cargo_hse_v3
-- 20260826174631 scope_operational_tasks_by_cargo_hse_to_motil_org_v3_fix
-- 20260826174734 add_personal_operational_task_inbox_v1
-- 20260826175233 extend_operational_tasks_to_plant_and_role_coverage_v4
-- 20260826175356 add_role_module_tasks_v1
-- 20260826175854 motil_role_task_sla_and_escalation_v1
-- 20260826175944 motil_role_task_dynamic_escalation_only_v2
-- 20260826180353 role_task_resolution_actions_v1
-- 20260826180406 role_task_resolution_security_and_catalog_v1
-- 20260826180448 role_task_personal_state_rpc_v1
-- 20260826180808 role_task_frontend_contract_v1
-- 20260826180838 role_task_frontend_labels_v2
-- 20260826181619 motil_role_task_lane_view
-- 20260826181641 motil_role_task_primary_inbox
-- 20260826181715 motil_daily_brief_by_role
-- 20260826181758 motil_daily_brief_priority_fix_v2
