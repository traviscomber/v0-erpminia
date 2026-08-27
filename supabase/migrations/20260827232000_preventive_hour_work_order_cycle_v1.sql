create or replace function public.plan_due_hour_preventive_work_order_v1(p_schedule_id uuid)
returns uuid
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare v_actor uuid; v_org uuid; v_status text; v_wo uuid;
begin
  v_actor := public.current_application_user_id();
  select organization_id, hour_status into v_org, v_status
  from public.preventive_maintenance_hour_status_v1
  where schedule_id=p_schedule_id;
  if not found then raise exception 'Pauta horaria no encontrada'; end if;
  if not exists(select 1 from public.user_roles where user_id=v_actor and organization_id=v_org) then raise exception 'Sin permisos'; end if;
  if v_status <> 'overdue' then raise exception 'La pauta no está vencida según el horómetro disponible'; end if;
  v_wo := public.create_work_order_from_schedule(p_schedule_id, v_actor);
  return v_wo;
end $$;
revoke all on function public.plan_due_hour_preventive_work_order_v1(uuid) from public, anon, authenticated;
grant execute on function public.plan_due_hour_preventive_work_order_v1(uuid) to service_role;

create or replace function public.advance_hour_schedule_on_work_order_close_v1()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare v_schedule public.preventive_maintenance_schedules%rowtype; v_evidence record; v_meter numeric;
begin
  if new.status <> 'completed' or old.status='completed' then return new; end if;
  select * into v_schedule from public.preventive_maintenance_schedules
  where generated_work_order_id=new.id and enabled=true and coalesce(frequency_hours,0)>0
  for update;
  if not found then return new; end if;
  select re.evidence_status,re.runtime_reading_id,rr.meter_hours into v_evidence
  from public.work_order_runtime_evidence re
  left join public.asset_runtime_readings rr on rr.id=re.runtime_reading_id and rr.organization_id=re.organization_id and rr.canonical_asset_id=re.canonical_asset_id
  where re.organization_id=new.organization_id and re.work_order_id=new.id;
  if not found or v_evidence.evidence_status <> 'meter_reading' or v_evidence.runtime_reading_id is null or v_evidence.meter_hours is null then
    raise exception 'La OT preventiva por horas requiere una lectura real de horómetro antes de cerrar';
  end if;
  v_meter := v_evidence.meter_hours;
  update public.preventive_maintenance_schedules
     set last_executed_date=current_date,last_executed_meter=v_meter,current_meter_snapshot=v_meter,
         next_due_meter=v_meter+frequency_hours,generated_work_order_id=null,updated_at=now()
   where id=v_schedule.id;
  insert into public.work_order_events(organization_id,work_order_id,canonical_asset_id,event_type,actor_id,source_table,source_record_id,summary,payload)
  values(new.organization_id,new.id,new.canonical_asset_id,'preventive_hour_cycle_advanced',public.current_application_user_id(),'preventive_maintenance_schedules',v_schedule.id::text,'Pauta preventiva horaria avanzó después del cierre con horómetro real',jsonb_build_object('closing_meter',v_meter,'frequency_hours',v_schedule.frequency_hours,'previous_due_meter',v_schedule.next_due_meter,'next_due_meter',v_meter+v_schedule.frequency_hours));
  return new;
end $$;
revoke all on function public.advance_hour_schedule_on_work_order_close_v1() from public, anon, authenticated;

drop trigger if exists trg_advance_hour_schedule_on_work_order_close_v1 on public.maintenance_work_orders;
create trigger trg_advance_hour_schedule_on_work_order_close_v1
before update of status on public.maintenance_work_orders
for each row execute function public.advance_hour_schedule_on_work_order_close_v1();

drop view if exists public.work_order_close_readiness_v1;
create view public.work_order_close_readiness_v1 with (security_invoker=true) as
select wo.organization_id,wo.id work_order_id,wo.work_order_number,wo.title,wo.status,wo.priority,wo.work_type,wo.canonical_asset_id,wo.cost_center_id,wo.root_cause,wo.preventive_actions,wo.actual_duration_hours,
fc.parts_cost,fc.labor_cost,fc.effective_external_cost,fc.total_cost,fc.open_procurement_orders,fc.pending_parts,fc.unmet_material_requirements,fc.pending_external_services,fc.open_labor_entries,fc.external_cost_conflict,
wo.canonical_asset_id is null missing_asset,coalesce(trim(wo.root_cause),'')='' missing_root_cause,coalesce(trim(wo.preventive_actions),'')='' missing_preventive_actions,coalesce(wo.actual_duration_hours,0)<=0 missing_actual_hours,
re.evidence_status runtime_evidence_status,re.runtime_reading_id,re.unavailable_reason runtime_unavailable_reason,(ps.id is not null) hour_schedule_linked,
((lower(coalesce(wo.work_type,''))='correctivo' and re.id is null) or (ps.id is not null and (re.id is null or re.evidence_status<>'meter_reading' or re.runtime_reading_id is null))) missing_runtime_evidence,
wo.canonical_asset_id is not null and coalesce(trim(wo.root_cause),'')<>'' and coalesce(trim(wo.preventive_actions),'')<>'' and coalesce(wo.actual_duration_hours,0)>0
and (lower(coalesce(wo.work_type,''))<>'correctivo' or re.id is not null)
and (ps.id is null or (re.evidence_status='meter_reading' and re.runtime_reading_id is not null))
and coalesce(fc.open_procurement_orders,0)=0 and coalesce(fc.pending_parts,0)=0 and coalesce(fc.unmet_material_requirements,0)=0 and coalesce(fc.pending_external_services,0)=0 and coalesce(fc.open_labor_entries,0)=0 and not coalesce(fc.external_cost_conflict,false) ready_to_close,
case when wo.canonical_asset_id is null then 'resolve_asset'
when coalesce(fc.open_procurement_orders,0)>0 then 'resolve_procurement'
when coalesce(fc.pending_parts,0)>0 then 'resolve_parts'
when coalesce(fc.unmet_material_requirements,0)>0 then 'resolve_materials'
when coalesce(fc.pending_external_services,0)>0 then 'resolve_external_services'
when coalesce(fc.open_labor_entries,0)>0 then 'resolve_labor'
when coalesce(fc.external_cost_conflict,false) then 'reconcile_external_cost'
when coalesce(trim(wo.root_cause),'')='' then 'record_root_cause'
when coalesce(trim(wo.preventive_actions),'')='' then 'record_preventive_actions'
when coalesce(wo.actual_duration_hours,0)<=0 then 'record_actual_hours'
when lower(coalesce(wo.work_type,''))='correctivo' and re.id is null then 'record_runtime_evidence'
when ps.id is not null and (re.id is null or re.evidence_status<>'meter_reading' or re.runtime_reading_id is null) then 'record_runtime_evidence'
else 'close_work_order' end next_action
from public.maintenance_work_orders wo
left join public.work_order_final_cost_v1 fc on fc.organization_id=wo.organization_id and fc.work_order_id=wo.id
left join public.work_order_runtime_evidence re on re.organization_id=wo.organization_id and re.work_order_id=wo.id
left join public.preventive_maintenance_schedules ps on ps.organization_id=wo.organization_id and ps.generated_work_order_id=wo.id and ps.enabled=true and coalesce(ps.frequency_hours,0)>0
where wo.status<>'completed';
revoke all on public.work_order_close_readiness_v1 from public,anon,authenticated;
grant select on public.work_order_close_readiness_v1 to service_role;