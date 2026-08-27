create or replace view public.operational_tasks_by_cargo_v7
with (security_invoker=true) as
with production_freshness as (
  select org.organization_id,
         t.transport_date,
         p.plant_date,
         d.drilling_date
  from (
    select organization_id from public.production_material_movements
    union select organization_id from public.production_metallurgy_deterministic_v2
    union select organization_id from public.production_drilling_source_reports
  ) org
  left join (
    select organization_id, max(movement_date)::date as transport_date
    from public.production_material_movements
    group by organization_id
  ) t using (organization_id)
  left join (
    select organization_id, max(operation_date)::date as plant_date
    from public.production_metallurgy_deterministic_v2
    group by organization_id
  ) p using (organization_id)
  left join (
    select organization_id, max(operation_date)::date as drilling_date
    from public.production_drilling_source_reports
    group by organization_id
  ) d using (organization_id)
)
select *
from public.operational_tasks_by_cargo_v6
where task_key <> 'data_health:production:freshness'
union all
select pf.organization_id,c.id,c.name,
       'data_health:production:transport_freshness'::text,
       'plant'::text,
       case when pf.transport_date is null or current_date-pf.transport_date>14 then 'critical' else 'warning' end,
       case when pf.transport_date is null or current_date-pf.transport_date>14 then 95 else 70 end,
       'Actualizar fuente de Transporte'::text,
       'Último dato de Transporte: '||coalesce(pf.transport_date::text,'sin dato'),
       'pending'::text,false,pf.transport_date::timestamptz,
       'refresh_production_transport_source'::text,
       'owner'::text,
       'Actualizar Transporte antes de usar ritmo, forecast o excepciones como lectura actual.'::text
from production_freshness pf
join public.cargos c on upper(c.name)='JEFE PLANTA'
where pf.transport_date is null or current_date-pf.transport_date>7
union all
select pf.organization_id,c.id,c.name,
       'data_health:production:plant_freshness'::text,
       'plant'::text,
       case when pf.plant_date is null or current_date-pf.plant_date>14 then 'critical' else 'warning' end,
       case when pf.plant_date is null or current_date-pf.plant_date>14 then 95 else 70 end,
       'Actualizar fuente de Planta'::text,
       'Último dato de Planta: '||coalesce(pf.plant_date::text,'sin dato'),
       'pending'::text,false,pf.plant_date::timestamptz,
       'refresh_production_plant_source'::text,
       'owner'::text,
       'Actualizar Planta antes de usar recuperación, leyes o producción como lectura actual.'::text
from production_freshness pf
join public.cargos c on upper(c.name)='JEFE PLANTA'
where pf.plant_date is null or current_date-pf.plant_date>7
union all
select pf.organization_id,c.id,c.name,
       'data_health:production:drilling_freshness'::text,
       'plant'::text,
       case when pf.drilling_date is null or current_date-pf.drilling_date>14 then 'critical' else 'warning' end,
       case when pf.drilling_date is null or current_date-pf.drilling_date>14 then 95 else 70 end,
       'Actualizar fuente de Sondaje'::text,
       'Último dato de Sondaje: '||coalesce(pf.drilling_date::text,'sin dato'),
       'pending'::text,false,pf.drilling_date::timestamptz,
       'refresh_production_drilling_source'::text,
       'owner'::text,
       'Actualizar la fuente propia de Sondaje; el master de Transporte/Planta no reemplaza esta evidencia.'::text
from production_freshness pf
join public.cargos c on upper(c.name)='JEFE PLANTA'
where pf.drilling_date is null or current_date-pf.drilling_date>7;

revoke all on public.operational_tasks_by_cargo_v7 from anon;
revoke all on public.operational_tasks_by_cargo_v7 from authenticated;
grant select on public.operational_tasks_by_cargo_v7 to authenticated, service_role;

create or replace view public.role_tasks_by_cargo_v1
with (security_invoker=true) as
select t.organization_id,t.cargo_id,t.cargo_name,t.task_key,t.domain,t.severity,t.priority_score,t.title,t.evidence_summary,t.status,t.material_related,t.occurred_at,t.recommended_action,t.responsibility,t.role_action,'operational'::text as visibility_scope
from public.operational_tasks_by_cargo_v7 t
union all
select f.organization_id,c.id,c.name,'finance:'::text||coalesce(f.alert_code,md5(coalesce(f.title,''::text))),'finance'::text,coalesce(f.severity,'warning'::text),case lower(coalesce(f.severity,'warning'::text)) when 'critical' then 95 when 'warning' then 60 else 30 end,f.title,concat_ws(' · ',nullif(f.description,''),'casos '||coalesce(f.exception_count,0)::text),'pending'::text,false,null::timestamptz,'review_finance_exception'::text,'owner'::text,'Resolver dentro de Administración; no escalar al tablero operacional salvo impacto demostrado.'::text,'role_private'::text
from public.canonical_finance_alerts f join public.cargos c on upper(c.name)='JEFE ADM.' where coalesce(f.exception_count,0)>0
union all
select r.organization_id,c.id,c.name,'reorder:'::text||r.id::text,'inventory'::text,'warning'::text,60,'Revisar reposición de inventario'::text,concat_ws(' · ','actual '||coalesce(r.current_value,0)::text,'umbral '||coalesce(r.threshold_value,0)::text),coalesce(r.status,'pending'::text),true,r.created_at::timestamptz,'review_reorder_alert'::text,'owner'::text,'Revisar en Bodega. Sólo escalar si bloquea una OT u operación activa.'::text,'role_private'::text
from public.reorder_alerts r join public.cargos c on upper(c.name)='JEFE BODEGA' where coalesce(r.status,'pending'::text)<>all(array['resolved','closed','dismissed','acknowledged']);
