create table if not exists public.work_order_runtime_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete cascade,
  canonical_asset_id uuid not null,
  evidence_status text not null check (evidence_status in ('meter_reading','not_available')),
  runtime_reading_id uuid null references public.asset_runtime_readings(id),
  unavailable_reason text null,
  notes text null,
  recorded_by uuid null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_order_id),
  check ((evidence_status='meter_reading' and runtime_reading_id is not null and unavailable_reason is null) or (evidence_status='not_available' and runtime_reading_id is null and nullif(trim(unavailable_reason),'') is not null))
);

alter table public.work_order_runtime_evidence enable row level security;
revoke all privileges on table public.work_order_runtime_evidence from public, anon, authenticated;
grant select, insert, update on table public.work_order_runtime_evidence to service_role;

create or replace function public.record_work_order_runtime_evidence_v1(
  p_work_order_id uuid,
  p_meter_hours numeric default null,
  p_recorded_at timestamptz default now(),
  p_unavailable_reason text default null,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_wo public.maintenance_work_orders%rowtype; v_actor uuid; v_reading_id uuid; v_evidence_id uuid;
begin
  select * into v_wo from public.maintenance_work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  if v_wo.canonical_asset_id is null then raise exception 'La orden no tiene activo canónico'; end if;
  if v_wo.status='completed' then raise exception 'La orden ya está cerrada'; end if;
  v_actor := public.current_application_user_id();
  if v_wo.organization_id not in (select organization_id from public.user_roles where user_id=v_actor) then raise exception 'Sin permisos'; end if;
  if p_meter_hours is not null then
    if p_meter_hours < 0 then raise exception 'El horómetro no puede ser negativo'; end if;
    insert into public.asset_runtime_readings(organization_id,canonical_asset_id,meter_hours,recorded_at,source_type,source_reference,notes,recorded_by)
    values(v_wo.organization_id,v_wo.canonical_asset_id,p_meter_hours,coalesce(p_recorded_at,now()),'manual','work_order_close:'||p_work_order_id::text,p_notes,v_actor)
    returning id into v_reading_id;
    insert into public.work_order_runtime_evidence(organization_id,work_order_id,canonical_asset_id,evidence_status,runtime_reading_id,unavailable_reason,notes,recorded_by,recorded_at,updated_at)
    values(v_wo.organization_id,p_work_order_id,v_wo.canonical_asset_id,'meter_reading',v_reading_id,null,p_notes,v_actor,now(),now())
    on conflict (work_order_id) do update set canonical_asset_id=excluded.canonical_asset_id,evidence_status='meter_reading',runtime_reading_id=excluded.runtime_reading_id,unavailable_reason=null,notes=excluded.notes,recorded_by=excluded.recorded_by,recorded_at=excluded.recorded_at,updated_at=now()
    returning id into v_evidence_id;
  else
    if nullif(trim(coalesce(p_unavailable_reason,'')),'') is null then raise exception 'Indica por qué el horómetro no está disponible'; end if;
    insert into public.work_order_runtime_evidence(organization_id,work_order_id,canonical_asset_id,evidence_status,runtime_reading_id,unavailable_reason,notes,recorded_by,recorded_at,updated_at)
    values(v_wo.organization_id,p_work_order_id,v_wo.canonical_asset_id,'not_available',null,trim(p_unavailable_reason),p_notes,v_actor,now(),now())
    on conflict (work_order_id) do update set canonical_asset_id=excluded.canonical_asset_id,evidence_status='not_available',runtime_reading_id=null,unavailable_reason=excluded.unavailable_reason,notes=excluded.notes,recorded_by=excluded.recorded_by,recorded_at=excluded.recorded_at,updated_at=now()
    returning id into v_evidence_id;
  end if;
  insert into public.work_order_events(organization_id,work_order_id,canonical_asset_id,event_type,actor_id,source_table,source_record_id,summary,payload)
  values(v_wo.organization_id,p_work_order_id,v_wo.canonical_asset_id,'runtime_evidence_recorded',v_actor,'work_order_runtime_evidence',v_evidence_id::text,'Evidencia de horómetro registrada para cierre',jsonb_build_object('status',case when v_reading_id is null then 'not_available' else 'meter_reading' end,'runtime_reading_id',v_reading_id));
  return v_evidence_id;
end $$;
revoke all on function public.record_work_order_runtime_evidence_v1(uuid,numeric,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.record_work_order_runtime_evidence_v1(uuid,numeric,timestamptz,text,text) to postgres, service_role;

drop view if exists public.work_order_close_readiness_v1;
create view public.work_order_close_readiness_v1 with (security_invoker=true) as
select wo.organization_id,wo.id as work_order_id,wo.work_order_number,wo.title,wo.status,wo.priority,wo.work_type,wo.canonical_asset_id,wo.cost_center_id,wo.root_cause,wo.preventive_actions,wo.actual_duration_hours,
fc.parts_cost,fc.labor_cost,fc.effective_external_cost,fc.total_cost,fc.open_procurement_orders,fc.pending_parts,fc.unmet_material_requirements,fc.pending_external_services,fc.open_labor_entries,fc.external_cost_conflict,
wo.canonical_asset_id is null as missing_asset,
coalesce(trim(wo.root_cause),'')='' as missing_root_cause,
coalesce(trim(wo.preventive_actions),'')='' as missing_preventive_actions,
coalesce(wo.actual_duration_hours,0)<=0 as missing_actual_hours,
re.evidence_status as runtime_evidence_status,re.runtime_reading_id,re.unavailable_reason as runtime_unavailable_reason,
(lower(coalesce(wo.work_type,''))='correctivo' and re.id is null) as missing_runtime_evidence,
(wo.canonical_asset_id is not null and coalesce(trim(wo.root_cause),'')<>'' and coalesce(trim(wo.preventive_actions),'')<>'' and coalesce(wo.actual_duration_hours,0)>0 and (lower(coalesce(wo.work_type,''))<>'correctivo' or re.id is not null) and coalesce(fc.open_procurement_orders,0)=0 and coalesce(fc.pending_parts,0)=0 and coalesce(fc.unmet_material_requirements,0)=0 and coalesce(fc.pending_external_services,0)=0 and coalesce(fc.open_labor_entries,0)=0 and not coalesce(fc.external_cost_conflict,false)) as ready_to_close,
case when wo.canonical_asset_id is null then 'resolve_asset' when coalesce(fc.open_procurement_orders,0)>0 then 'resolve_procurement' when coalesce(fc.pending_parts,0)>0 then 'resolve_parts' when coalesce(fc.unmet_material_requirements,0)>0 then 'resolve_materials' when coalesce(fc.pending_external_services,0)>0 then 'resolve_external_services' when coalesce(fc.open_labor_entries,0)>0 then 'resolve_labor' when coalesce(fc.external_cost_conflict,false) then 'reconcile_external_cost' when coalesce(trim(wo.root_cause),'')='' then 'record_root_cause' when coalesce(trim(wo.preventive_actions),'')='' then 'record_preventive_actions' when coalesce(wo.actual_duration_hours,0)<=0 then 'record_actual_hours' when lower(coalesce(wo.work_type,''))='correctivo' and re.id is null then 'record_runtime_evidence' else 'close_work_order' end as next_action
from public.maintenance_work_orders wo
left join public.work_order_final_cost_v1 fc on fc.organization_id=wo.organization_id and fc.work_order_id=wo.id
left join public.work_order_runtime_evidence re on re.organization_id=wo.organization_id and re.work_order_id=wo.id
where wo.status<>'completed';
revoke all privileges on table public.work_order_close_readiness_v1 from public, anon, authenticated;
grant select on table public.work_order_close_readiness_v1 to service_role;

create or replace function public.close_work_order_safely(p_work_order_id uuid) returns uuid language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare v_wo public.maintenance_work_orders%rowtype; v_cost record; v_sequence integer; v_actor uuid; v_runtime_evidence record;
begin
  select * into v_wo from public.maintenance_work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Orden no encontrada'; end if;
  v_actor := public.current_application_user_id();
  if v_wo.organization_id not in (select organization_id from public.user_roles where user_id=v_actor) then raise exception 'Sin permisos'; end if;
  if v_wo.status='completed' then raise exception 'La orden ya está cerrada'; end if;
  if v_wo.canonical_asset_id is null then raise exception 'La orden no puede cerrarse sin equipo asociado'; end if;
  if coalesce(trim(v_wo.root_cause),'')='' then raise exception 'Registra la causa principal antes de cerrar'; end if;
  if coalesce(trim(v_wo.preventive_actions),'')='' then raise exception 'Registra la acción preventiva antes de cerrar'; end if;
  if coalesce(v_wo.actual_duration_hours,0)<=0 then raise exception 'Registra las horas reales antes de cerrar'; end if;
  if lower(coalesce(v_wo.work_type,''))='correctivo' then
    select * into v_runtime_evidence from public.work_order_runtime_evidence where organization_id=v_wo.organization_id and work_order_id=p_work_order_id;
    if not found then raise exception 'Registra el horómetro o documenta por qué no está disponible antes de cerrar'; end if;
  end if;
  select * into v_cost from public.work_order_final_cost_v1 where organization_id=v_wo.organization_id and work_order_id=p_work_order_id;
  if coalesce(v_cost.open_procurement_orders,0)>0 then raise exception 'La orden tiene compras pendientes de recepción'; end if;
  if coalesce(v_cost.pending_parts,0)>0 then raise exception 'Hay repuestos pendientes de instalar o devolver'; end if;
  if coalesce(v_cost.unmet_material_requirements,0)>0 then raise exception 'Hay repuestos requeridos que aún no han sido instalados'; end if;
  if coalesce(v_cost.pending_external_services,0)>0 then raise exception 'Hay servicios externos pendientes de aprobación'; end if;
  if coalesce(v_cost.open_labor_entries,0)>0 then raise exception 'Hay registros de trabajo aún abiertos'; end if;
  if coalesce(v_cost.external_cost_conflict,false) then raise exception 'El costo externo está duplicado entre el campo legado y servicios externos; reconcilie antes de cerrar'; end if;
  select coalesce(max(closure_sequence),0)+1 into v_sequence from public.work_order_closure_cost_snapshots where work_order_id=p_work_order_id;
  insert into public.work_order_closure_cost_snapshots(organization_id,work_order_id,closure_sequence,canonical_asset_id,cost_center_id,parts_cost,labor_cost,external_services_cost,legacy_external_cost,effective_external_cost,procurement_received_cost,procurement_currency,procurement_currency_count,total_cost,external_cost_basis,closed_by,closed_at)
  values(v_wo.organization_id,p_work_order_id,v_sequence,v_wo.canonical_asset_id,v_wo.cost_center_id,coalesce(v_cost.parts_cost,0),coalesce(v_cost.labor_cost,0),coalesce(v_cost.external_services_cost,0),coalesce(v_cost.legacy_external_cost,0),coalesce(v_cost.effective_external_cost,0),v_cost.procurement_received_cost,v_cost.procurement_currency,coalesce(v_cost.procurement_currency_count,0),coalesce(v_cost.total_cost,0),v_cost.external_cost_basis,v_actor,now());
  update public.maintenance_work_orders set status='completed',completion_date=now(),closed_at=now(),closed_by=v_actor,updated_at=now() where id=p_work_order_id;
  update public.work_order_supply_needs set status='fulfilled',updated_at=now() where work_order_id=p_work_order_id and status not in ('cancelled','fulfilled');
  update public.procurement_intake_requests set status='closed',updated_at=now() where work_order_id=p_work_order_id and status not in ('cancelled','closed');
  update public.procurement_operational_orders set status='closed',updated_at=now() where work_order_id=p_work_order_id and status='received';
  insert into public.work_order_events(organization_id,work_order_id,canonical_asset_id,event_type,actor_id,source_table,source_record_id,summary,payload)
  values(v_wo.organization_id,p_work_order_id,v_wo.canonical_asset_id,'work_order_closed',v_actor,'maintenance_work_orders',p_work_order_id::text,'Orden cerrada con costo final trazable',jsonb_build_object('closed_at',now(),'closure_sequence',v_sequence,'cost_center_id',v_wo.cost_center_id,'parts_cost',coalesce(v_cost.parts_cost,0),'labor_cost',coalesce(v_cost.labor_cost,0),'external_cost',coalesce(v_cost.effective_external_cost,0),'total_cost',coalesce(v_cost.total_cost,0),'procurement_received_cost',v_cost.procurement_received_cost,'procurement_currency',v_cost.procurement_currency,'procurement_currency_count',coalesce(v_cost.procurement_currency_count,0),'procurement_received_cost_is_evidence_only',true,'external_cost_basis',v_cost.external_cost_basis,'runtime_evidence_status',case when lower(coalesce(v_wo.work_type,''))='correctivo' then v_runtime_evidence.evidence_status else null end,'runtime_reading_id',case when lower(coalesce(v_wo.work_type,''))='correctivo' then v_runtime_evidence.runtime_reading_id else null end));
  return p_work_order_id;
end $$;
revoke all on function public.close_work_order_safely(uuid) from public, anon, authenticated;
grant execute on function public.close_work_order_safely(uuid) to postgres, service_role;
