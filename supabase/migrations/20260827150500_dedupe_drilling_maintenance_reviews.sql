create or replace view public.operational_tasks_by_cargo_v8
with (security_invoker=true) as
select t.*
from public.operational_tasks_by_cargo_v7 t
where not (
  t.task_key like 'drilling_maintenance:%'
  and exists (
    select 1
    from public.operational_maintenance_reviews r
    where r.organization_id=t.organization_id
      and r.source_report_id::text=split_part(t.task_key,':',2)
      and r.status='pending'
  )
);

revoke all on public.operational_tasks_by_cargo_v8 from public, anon, authenticated;
grant select on public.operational_tasks_by_cargo_v8 to service_role;

create or replace view public.role_tasks_by_cargo_v1
with (security_invoker=true) as
select t.organization_id,t.cargo_id,t.cargo_name,t.task_key,t.domain,t.severity,t.priority_score,t.title,t.evidence_summary,t.status,t.material_related,t.occurred_at,t.recommended_action,t.responsibility,t.role_action,'operational'::text as visibility_scope
from public.operational_tasks_by_cargo_v8 t
union all
select f.organization_id,c.id,c.name,'finance:'::text||coalesce(f.alert_code,md5(coalesce(f.title,''::text))),'finance'::text,coalesce(f.severity,'warning'::text),case lower(coalesce(f.severity,'warning'::text)) when 'critical' then 95 when 'warning' then 60 else 30 end,f.title,concat_ws(' · ',nullif(f.description,''),'casos '||coalesce(f.exception_count,0)::text),'pending'::text,false,null::timestamptz,'review_finance_exception'::text,'owner'::text,'Resolver dentro de Administración; no escalar al tablero operacional salvo impacto demostrado.'::text,'role_private'::text
from public.canonical_finance_alerts f join public.cargos c on upper(c.name)='JEFE ADM.' where coalesce(f.exception_count,0)>0
union all
select r.organization_id,c.id,c.name,'reorder:'::text||r.id::text,'inventory'::text,'warning'::text,60,'Revisar reposición de inventario'::text,concat_ws(' · ','actual '||coalesce(r.current_value,0)::text,'umbral '||coalesce(r.threshold_value,0)::text),coalesce(r.status,'pending'::text),true,r.created_at::timestamptz,'review_reorder_alert'::text,'owner'::text,'Revisar en Bodega. Sólo escalar si bloquea una OT u operación activa.'::text,'role_private'::text
from public.reorder_alerts r join public.cargos c on upper(c.name)='JEFE BODEGA' where coalesce(r.status,'pending'::text)<>all(array['resolved','closed','dismissed','acknowledged']);

revoke all on public.role_tasks_by_cargo_v1 from public, anon, authenticated;
grant select on public.role_tasks_by_cargo_v1 to service_role;
