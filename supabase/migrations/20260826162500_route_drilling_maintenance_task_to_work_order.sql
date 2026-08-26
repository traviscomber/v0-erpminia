create or replace function public.create_work_order_from_operational_review(
  p_organization_id uuid,
  p_review_id uuid,
  p_created_by uuid,
  p_title text,
  p_work_type text default null,
  p_priority text default null,
  p_scheduled_date date default null,
  p_description text default null
)
returns table(
  work_order_id uuid,
  work_order_number text,
  canonical_asset_id uuid,
  work_order_status text,
  review_status text,
  source_report_id uuid
)
language plpgsql
security definer
set search_path to 'public', 'canonical', 'pg_temp'
as $function$
declare
  v_review public.operational_maintenance_reviews%rowtype;
  v_work_order public.maintenance_work_orders%rowtype;
  v_number text;
  v_description text;
begin
  select * into v_review
  from public.operational_maintenance_reviews
  where id = p_review_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'operational_review_not_found';
  end if;

  if v_review.linked_work_order_id is not null then
    select * into v_work_order
    from public.maintenance_work_orders
    where id = v_review.linked_work_order_id;

    return query
    select v_work_order.id, v_work_order.work_order_number, v_work_order.canonical_asset_id,
           v_work_order.status, v_review.status, v_review.source_report_id;
    return;
  end if;

  if v_review.status not in ('accepted', 'pending') then
    raise exception 'operational_review_must_be_accepted';
  end if;

  if v_review.status = 'pending' and v_review.review_reason <> 'out_of_service' then
    raise exception 'operational_review_must_be_accepted';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'work_order_title_required';
  end if;

  v_number := 'WO-DRILL-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_review.id::text, '-', ''), 1, 8));
  v_description := concat_ws(E'\n',
    nullif(trim(p_description), ''),
    'Origen: revisión operacional de Sondaje (' || v_review.review_reason || ').',
    'Evidencia: production_drilling_source_reports:' || v_review.source_report_id::text || '.'
  );

  insert into public.maintenance_work_orders (
    organization_id, work_order_number, asset_id, canonical_asset_id, title, description,
    work_type, status, priority, scheduled_date, created_by
  ) values (
    p_organization_id, v_number, v_review.canonical_asset_id, v_review.canonical_asset_id,
    left(trim(p_title), 180), v_description, coalesce(nullif(trim(p_work_type), ''), 'corrective'), 'pending',
    coalesce(nullif(trim(p_priority), ''), 'critical'), p_scheduled_date, p_created_by
  )
  returning * into v_work_order;

  update public.operational_maintenance_reviews
  set status = 'work_order_created',
      linked_work_order_id = v_work_order.id,
      reviewed_by = p_created_by,
      reviewed_at = now(),
      updated_at = now()
  where id = v_review.id;

  return query
  select v_work_order.id, v_work_order.work_order_number, v_work_order.canonical_asset_id,
         v_work_order.status, 'work_order_created'::text, v_review.source_report_id;
end;
$function$;

create or replace view public.role_task_frontend_v1 as
with action_rollup as (
  select organization_id, cargo_id, task_key,
         jsonb_agg(
           jsonb_build_object(
             'code', action_code,
             'label', action_label,
             'mutates_source', mutates_source,
             'description', action_description
           ) order by action_label
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
    when i.domain = 'maintenance' and q.review_id is not null then
      '/dashboard/mantenimiento/ordenes-trabajo/create?assetId=' || q.canonical_asset_id::text ||
      '&reviewId=' || q.review_id::text ||
      '&workType=corrective&priority=critical'
    when i.domain = 'maintenance' then '/dashboard/mantenimiento'
    when i.domain = 'hse' then '/sustainability'
    when i.domain = 'plant' then '/production'
    when i.domain = 'finance' then '/finance'
    when i.domain = 'inventory' then '/inventory'
    else '/'
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
