# Motil operational task system — 2026-08-26

Production state synchronized for the role-based operational task system.

## Included

- Product-media autopilot running from Supabase cron.
- Global operational alerts limited to direct operational impact.
- Role ownership with one primary owner plus support/escalation.
- HSE, maintenance, plant, finance and inventory role routing.
- SLA, due dates and dynamic escalations.
- Task-resolution RPC with source-level mutations and audit trail.
- Personal states: pending, read and snoozed.
- Frontend contract with allowed actions and responsibility-aware labels.
- Daily brief separated into current operation, aging backlog and historical backlog.

## Current canonical surfaces

- `operational_attention_global_v1`
- `operational_tasks_by_cargo_v4`
- `role_tasks_by_cargo_v1`
- `role_task_worklist_v1`
- `role_task_frontend_v1`
- `role_task_daily_brief_v1`
- `resolve_role_task(...)`
- `set_role_task_personal_state(...)`

The SQL checkpoint migration is non-destructive and verifies that the production objects already applied in Supabase are present before later repository migrations depend on them.
