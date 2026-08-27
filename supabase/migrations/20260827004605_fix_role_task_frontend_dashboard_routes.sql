create or replace view public.role_task_frontend_v1 as
with action_rollup as (
  select
    organization_id,
    cargo_id,
    task_key,
    jsonb_agg(
      jsonb_build_object(
        'code', action_code,
        'label', action_label,
        'mutates_source', mutates_source,
        'description', action_description
      )
      order by action_label
    ) as actions
  from public.role_task_actions_available_v1
  group by organization_id, cargo_id, task_key
)
select
  i.organization_id,
  i.cargo_id,
  i.cargo_name,
  i.task_key,
  i.domain,
  i.severity,
  i.priority_score,
  i.title,
  i.evidence_summary,
  i.status,
  i.responsibility,
  i.role_action,
  i.occurred_at,
  i.due_at,
  i.escalation_at,
  i.age_hours,
  i.urgency_state,
  i.personal_status,
  i.snoozed_until,
  i.visible_now,
  coalesce(a.actions, '[]'::jsonb) as actions,
  case
    when i.domain = 'maintenance' and q.review_id is not null then '/dashboard/mantenimiento/ordenes-trabajo/create?assetId=' || q.canonical_asset_id::text || '&reviewId=' || q.review_id::text || '&workType=corrective&priority=critical'
    when i.domain = 'maintenance' then '/dashboard/mantenimiento'
    when i.domain = 'hse' then '/dashboard/sostenibilidad'
    when i.domain = 'plant' then '/dashboard/produccion'
    when i.domain = 'finance' then '/dashboard/finanzas'
    when i.domain = 'inventory' then '/dashboard/bodega'
    else '/dashboard'
  end as module_route,
  case
    when i.responsibility = 'escalation' then 'Revisar escalación'
    when i.responsibility = 'support' then 'Apoyar'
    when i.urgency_state = 'escalated' then 'Resolver ahora'
    when i.urgency_state = 'overdue' then 'Vencida'
    when i.urgency_state = 'due_soon' then 'Próxima a vencer'
    else 'Pendiente'
  end as urgency_label,
  case
    when i.responsibility = 'owner' then 'Mi tarea'
    when i.responsibility = 'support' then 'Apoyo'
    when i.responsibility = 'escalation' then 'Escalación'
    else initcap(i.responsibility)
  end as responsibility_label
from public.role_task_personal_inbox_v1 i
left join action_rollup a using (organization_id, cargo_id, task_key)
left join public.drilling_maintenance_review_queue_v1 q
  on i.task_key = 'drilling_maintenance:' || q.source_report_id::text
 and i.organization_id = q.organization_id
where i.visible_now = true;
