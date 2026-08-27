create table if not exists public.work_order_standard_plan_step_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete cascade,
  plan_application_id uuid not null references public.maintenance_standard_job_plan_applications(id) on delete cascade,
  plan_step_id uuid not null references public.maintenance_standard_job_plan_steps(id),
  status text not null default 'completed' check (status in ('completed')),
  observation text,
  completed_by uuid,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(plan_application_id,plan_step_id)
);

create index if not exists idx_work_order_standard_plan_step_executions_work_order
  on public.work_order_standard_plan_step_executions(organization_id,work_order_id);

alter table public.work_order_standard_plan_step_executions enable row level security;
revoke all on table public.work_order_standard_plan_step_executions from public,anon,authenticated;
grant select,insert,update on table public.work_order_standard_plan_step_executions to service_role;

create or replace view public.work_order_standard_plan_execution_v1
with (security_invoker=true)
as
select
  a.organization_id,
  a.work_order_id,
  a.id as plan_application_id,
  p.id as plan_id,
  p.plan_code,
  p.name as plan_name,
  s.id as plan_step_id,
  s.sequence_no,
  s.title,
  s.instructions,
  s.control_requirement,
  s.required_document_reference,
  s.estimated_minutes,
  case when e.id is null then 'pending' else 'completed' end as execution_status,
  e.observation,
  e.completed_by,
  e.completed_at
from public.maintenance_standard_job_plan_applications a
join public.maintenance_standard_job_plans p on p.id=a.plan_id and p.organization_id=a.organization_id
join public.maintenance_standard_job_plan_steps s on s.plan_id=p.id and s.organization_id=a.organization_id
left join public.work_order_standard_plan_step_executions e
  on e.plan_application_id=a.id
 and e.plan_step_id=s.id
 and e.work_order_id=a.work_order_id
 and e.organization_id=a.organization_id
where a.status='active' and a.work_order_id is not null and p.status='approved';

revoke all on public.work_order_standard_plan_execution_v1 from public,anon,authenticated;
grant select on public.work_order_standard_plan_execution_v1 to service_role;

create or replace function public.complete_work_order_standard_plan_step_v1(
  p_work_order_id uuid,
  p_plan_step_id uuid,
  p_observation text default null
)
returns uuid
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_actor uuid;
  v_org uuid;
  v_application uuid;
  v_id uuid;
  v_asset uuid;
begin
  v_actor := public.current_application_user_id();
  select organization_id,canonical_asset_id into v_org,v_asset
  from public.maintenance_work_orders
  where id=p_work_order_id;
  if not found then raise exception 'Orden no encontrada'; end if;
  if not exists(select 1 from public.user_roles where user_id=v_actor and organization_id=v_org) then raise exception 'Sin permisos'; end if;

  select a.id into v_application
  from public.maintenance_standard_job_plan_applications a
  join public.maintenance_standard_job_plans p on p.id=a.plan_id and p.organization_id=a.organization_id
  join public.maintenance_standard_job_plan_steps s on s.plan_id=p.id and s.organization_id=a.organization_id
  where a.organization_id=v_org
    and a.work_order_id=p_work_order_id
    and a.status='active'
    and p.status='approved'
    and s.id=p_plan_step_id
  limit 1;
  if v_application is null then raise exception 'El paso no pertenece al plan estándar activo de esta OT'; end if;

  insert into public.work_order_standard_plan_step_executions(
    organization_id,work_order_id,plan_application_id,plan_step_id,status,observation,completed_by,completed_at
  ) values(
    v_org,p_work_order_id,v_application,p_plan_step_id,'completed',nullif(trim(coalesce(p_observation,'')),''),v_actor,now()
  )
  on conflict(plan_application_id,plan_step_id) do update
    set observation=excluded.observation,completed_by=excluded.completed_by,completed_at=excluded.completed_at
  returning id into v_id;

  insert into public.work_order_events(
    organization_id,work_order_id,canonical_asset_id,event_type,actor_id,source_table,source_record_id,summary,payload
  ) values(
    v_org,p_work_order_id,v_asset,'standard_plan_step_completed',v_actor,'maintenance_standard_job_plan_steps',p_plan_step_id::text,
    'Paso de plan estándar realizado',
    jsonb_build_object('plan_step_id',p_plan_step_id,'observation',nullif(trim(coalesce(p_observation,'')),''),'completed_at',now())
  );
  return v_id;
end $$;

revoke all on function public.complete_work_order_standard_plan_step_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.complete_work_order_standard_plan_step_v1(uuid,uuid,text) to service_role;

create or replace function public.close_work_order_safely(p_work_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare v_wo public.maintenance_work_orders%rowtype; v_cost record; v_sequence integer; v_actor uuid; v_runtime_evidence record; v_pending_plan_steps integer;
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

  select count(*) into v_pending_plan_steps
  from public.work_order_standard_plan_execution_v1
  where organization_id=v_wo.organization_id and work_order_id=p_work_order_id and execution_status='pending';
  if v_pending_plan_steps>0 then raise exception 'Completa todos los pasos del plan estándar antes de cerrar la OT'; end if;

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
  insert into public.work_order_closure_cost_snapshots(
    organization_id,work_order_id,closure_sequence,canonical_asset_id,cost_center_id,parts_cost,labor_cost,external_services_cost,
    legacy_external_cost,effective_external_cost,procurement_received_cost,procurement_currency,procurement_currency_count,total_cost,
    external_cost_basis,closed_by,closed_at
  ) values(
    v_wo.organization_id,p_work_order_id,v_sequence,v_wo.canonical_asset_id,v_wo.cost_center_id,coalesce(v_cost.parts_cost,0),
    coalesce(v_cost.labor_cost,0),coalesce(v_cost.external_services_cost,0),coalesce(v_cost.legacy_external_cost,0),
    coalesce(v_cost.effective_external_cost,0),v_cost.procurement_received_cost,v_cost.procurement_currency,
    coalesce(v_cost.procurement_currency_count,0),coalesce(v_cost.total_cost,0),v_cost.external_cost_basis,v_actor,now()
  );

  update public.maintenance_work_orders set status='completed',completion_date=now(),closed_at=now(),closed_by=v_actor,updated_at=now() where id=p_work_order_id;
  update public.work_order_supply_needs set status='fulfilled',updated_at=now() where work_order_id=p_work_order_id and status not in ('cancelled','fulfilled');
  update public.procurement_intake_requests set status='closed',updated_at=now() where work_order_id=p_work_order_id and status not in ('cancelled','closed');
  update public.procurement_operational_orders set status='closed',updated_at=now() where work_order_id=p_work_order_id and status='received';

  insert into public.work_order_events(organization_id,work_order_id,canonical_asset_id,event_type,actor_id,source_table,source_record_id,summary,payload)
  values(
    v_wo.organization_id,p_work_order_id,v_wo.canonical_asset_id,'work_order_closed',v_actor,'maintenance_work_orders',p_work_order_id::text,
    'Orden cerrada con costo final trazable',
    jsonb_build_object(
      'closed_at',now(),'closure_sequence',v_sequence,'cost_center_id',v_wo.cost_center_id,
      'parts_cost',coalesce(v_cost.parts_cost,0),'labor_cost',coalesce(v_cost.labor_cost,0),
      'external_cost',coalesce(v_cost.effective_external_cost,0),'total_cost',coalesce(v_cost.total_cost,0),
      'procurement_received_cost',v_cost.procurement_received_cost,'procurement_currency',v_cost.procurement_currency,
      'procurement_currency_count',coalesce(v_cost.procurement_currency_count,0),'procurement_received_cost_is_evidence_only',true,
      'external_cost_basis',v_cost.external_cost_basis,
      'runtime_evidence_status',case when lower(coalesce(v_wo.work_type,''))='correctivo' then v_runtime_evidence.evidence_status else null end,
      'runtime_reading_id',case when lower(coalesce(v_wo.work_type,''))='correctivo' then v_runtime_evidence.runtime_reading_id else null end,
      'standard_plan_pending_steps',v_pending_plan_steps
    )
  );
  return p_work_order_id;
end $$;

revoke all on function public.close_work_order_safely(uuid) from public,anon,authenticated;
grant execute on function public.close_work_order_safely(uuid) to service_role;
