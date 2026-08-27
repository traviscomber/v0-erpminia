create table if not exists public.work_order_closure_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  work_order_id uuid not null references public.maintenance_work_orders(id) on delete restrict,
  closure_sequence integer not null,
  canonical_asset_id uuid null,
  cost_center_id uuid null,
  parts_cost numeric not null default 0,
  labor_cost numeric not null default 0,
  external_services_cost numeric not null default 0,
  legacy_external_cost numeric not null default 0,
  effective_external_cost numeric not null default 0,
  procurement_received_cost numeric null,
  procurement_currency text null,
  procurement_currency_count integer not null default 0,
  total_cost numeric not null default 0,
  external_cost_basis text not null check (external_cost_basis in ('none','legacy_external','external_services')),
  closed_by uuid null,
  closed_at timestamptz not null default now(),
  unique(work_order_id, closure_sequence)
);

create index if not exists idx_work_order_closure_cost_snapshots_org_wo
  on public.work_order_closure_cost_snapshots(organization_id, work_order_id, closed_at desc);

alter table public.work_order_closure_cost_snapshots enable row level security;
revoke all on public.work_order_closure_cost_snapshots from public, anon, authenticated;
grant select, insert on public.work_order_closure_cost_snapshots to service_role;

drop view if exists public.work_order_final_cost_v1;
create view public.work_order_final_cost_v1
with (security_invoker=true)
as
select
  wo.organization_id,
  wo.id as work_order_id,
  wo.work_order_number,
  wo.status,
  wo.canonical_asset_id,
  wo.cost_center_id,
  coalesce(parts.parts_cost,0)::numeric as parts_cost,
  coalesce(labor.labor_cost,0)::numeric as labor_cost,
  coalesce(services.external_services_cost,0)::numeric as external_services_cost,
  coalesce(wo.external_cost,0)::numeric as legacy_external_cost,
  case
    when coalesce(services.approved_service_count,0) > 0 and coalesce(wo.external_cost,0) > 0 then null
    when coalesce(services.approved_service_count,0) > 0 then coalesce(services.external_services_cost,0)
    else coalesce(wo.external_cost,0)
  end::numeric as effective_external_cost,
  case
    when coalesce(services.approved_service_count,0) > 0 and coalesce(wo.external_cost,0) > 0 then 'conflict'
    when coalesce(services.approved_service_count,0) > 0 then 'external_services'
    when coalesce(wo.external_cost,0) > 0 then 'legacy_external'
    else 'none'
  end::text as external_cost_basis,
  (coalesce(services.approved_service_count,0) > 0 and coalesce(wo.external_cost,0) > 0) as external_cost_conflict,
  case when coalesce(procurement.procurement_currency_count,0) <= 1 then coalesce(procurement.procurement_received_cost,0) else null end::numeric as procurement_received_cost,
  procurement.procurement_currency,
  coalesce(procurement.procurement_currency_count,0)::integer as procurement_currency_count,
  case
    when coalesce(services.approved_service_count,0) > 0 and coalesce(wo.external_cost,0) > 0 then null
    else (coalesce(parts.parts_cost,0) + coalesce(labor.labor_cost,0) + case when coalesce(services.approved_service_count,0) > 0 then coalesce(services.external_services_cost,0) else coalesce(wo.external_cost,0) end)::numeric
  end as total_cost,
  coalesce(parts.pending_parts,0)::integer as pending_parts,
  coalesce(labor.open_labor_entries,0)::integer as open_labor_entries,
  coalesce(procurement.open_procurement_orders,0)::integer as open_procurement_orders,
  coalesce(services.pending_external_services,0)::integer as pending_external_services,
  coalesce(requirements.unmet_material_requirements,0)::integer as unmet_material_requirements,
  (wo.cost_center_id is null) as cost_center_missing,
  (
    wo.canonical_asset_id is not null
    and coalesce(parts.pending_parts,0)=0
    and coalesce(labor.open_labor_entries,0)=0
    and coalesce(procurement.open_procurement_orders,0)=0
    and coalesce(services.pending_external_services,0)=0
    and coalesce(requirements.unmet_material_requirements,0)=0
    and not (coalesce(services.approved_service_count,0) > 0 and coalesce(wo.external_cost,0) > 0)
  ) as operationally_ready_to_close
from public.maintenance_work_orders wo
left join lateral (
  select
    coalesce(sum(coalesce(p.quantity_installed,0) * coalesce(p.unit_cost,0)),0)::numeric as parts_cost,
    coalesce(sum(greatest(0,coalesce(p.quantity_issued,0)-coalesce(p.quantity_installed,0)-coalesce(p.quantity_returned,0))),0)::integer as pending_parts
  from public.work_order_parts p
  where p.organization_id=wo.organization_id and p.work_order_id=wo.id
) parts on true
left join lateral (
  select
    coalesce(sum(case when l.ended_at is not null then coalesce(l.hours,0)*coalesce(l.hourly_cost,0) else 0 end),0)::numeric as labor_cost,
    count(*) filter (where l.ended_at is null)::integer as open_labor_entries
  from public.work_order_labor_entries l
  where l.organization_id=wo.organization_id and l.work_order_id=wo.id
) labor on true
left join lateral (
  select
    coalesce(sum(case when s.status in ('approved','completed') then coalesce(s.amount,0) else 0 end),0)::numeric as external_services_cost,
    count(*) filter (where s.status in ('approved','completed'))::integer as approved_service_count,
    count(*) filter (where s.status='pending')::integer as pending_external_services
  from public.work_order_external_services s
  where s.organization_id=wo.organization_id and s.work_order_id=wo.id
) services on true
left join lateral (
  select
    coalesce(sum(coalesce(rl.quantity_accepted,0)*coalesce(rl.unit_cost,0)),0)::numeric as procurement_received_cost,
    case when count(distinct o.currency)=1 then min(o.currency) else null end::text as procurement_currency,
    count(distinct o.currency)::integer as procurement_currency_count,
    count(distinct o.id) filter (where o.status in ('issued','partially_received'))::integer as open_procurement_orders
  from public.procurement_operational_orders o
  left join public.procurement_operational_receipts r on r.organization_id=o.organization_id and r.order_id=o.id
  left join public.procurement_operational_receipt_lines rl on rl.organization_id=r.organization_id and rl.receipt_id=r.id
  where o.organization_id=wo.organization_id and o.work_order_id=wo.id
) procurement on true
left join lateral (
  select count(*)::integer as unmet_material_requirements
  from public.work_order_material_requirements req
  where req.organization_id=wo.organization_id
    and req.work_order_id=wo.id
    and req.status <> 'cancelled'
    and coalesce((select sum(coalesce(p.quantity_installed,0)) from public.work_order_parts p where p.organization_id=req.organization_id and p.work_order_id=req.work_order_id and p.canonical_product_id=req.canonical_product_id),0) < req.quantity_required
) requirements on true;

revoke all on public.work_order_final_cost_v1 from public, anon, authenticated;
grant select on public.work_order_final_cost_v1 to service_role;

create or replace function public.close_work_order_safely(p_work_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_wo public.maintenance_work_orders%rowtype;
  v_cost record;
  v_sequence integer;
  v_actor uuid;
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

  select * into v_cost from public.work_order_final_cost_v1 where organization_id=v_wo.organization_id and work_order_id=p_work_order_id;
  if coalesce(v_cost.open_procurement_orders,0)>0 then raise exception 'La orden tiene compras pendientes de recepción'; end if;
  if coalesce(v_cost.pending_parts,0)>0 then raise exception 'Hay repuestos pendientes de instalar o devolver'; end if;
  if coalesce(v_cost.unmet_material_requirements,0)>0 then raise exception 'Hay repuestos requeridos que aún no han sido instalados'; end if;
  if coalesce(v_cost.pending_external_services,0)>0 then raise exception 'Hay servicios externos pendientes de aprobación'; end if;
  if coalesce(v_cost.open_labor_entries,0)>0 then raise exception 'Hay registros de trabajo aún abiertos'; end if;
  if coalesce(v_cost.external_cost_conflict,false) then raise exception 'El costo externo está duplicado entre el campo legado y servicios externos; reconcilie antes de cerrar'; end if;

  select coalesce(max(closure_sequence),0)+1 into v_sequence from public.work_order_closure_cost_snapshots where work_order_id=p_work_order_id;
  insert into public.work_order_closure_cost_snapshots(
    organization_id,work_order_id,closure_sequence,canonical_asset_id,cost_center_id,
    parts_cost,labor_cost,external_services_cost,legacy_external_cost,effective_external_cost,
    procurement_received_cost,procurement_currency,procurement_currency_count,total_cost,external_cost_basis,closed_by,closed_at
  ) values (
    v_wo.organization_id,p_work_order_id,v_sequence,v_wo.canonical_asset_id,v_wo.cost_center_id,
    coalesce(v_cost.parts_cost,0),coalesce(v_cost.labor_cost,0),coalesce(v_cost.external_services_cost,0),coalesce(v_cost.legacy_external_cost,0),coalesce(v_cost.effective_external_cost,0),
    v_cost.procurement_received_cost,v_cost.procurement_currency,coalesce(v_cost.procurement_currency_count,0),coalesce(v_cost.total_cost,0),v_cost.external_cost_basis,v_actor,now()
  );

  update public.maintenance_work_orders set status='completed',completion_date=now(),closed_at=now(),closed_by=v_actor,updated_at=now() where id=p_work_order_id;
  update public.work_order_supply_needs set status='fulfilled',updated_at=now() where work_order_id=p_work_order_id and status not in ('cancelled','fulfilled');
  update public.procurement_intake_requests set status='closed',updated_at=now() where work_order_id=p_work_order_id and status not in ('cancelled','closed');
  update public.procurement_operational_orders set status='closed',updated_at=now() where work_order_id=p_work_order_id and status='received';

  insert into public.work_order_events(organization_id,work_order_id,canonical_asset_id,event_type,actor_id,source_table,source_record_id,summary,payload)
  values(v_wo.organization_id,p_work_order_id,v_wo.canonical_asset_id,'work_order_closed',v_actor,'maintenance_work_orders',p_work_order_id::text,'Orden cerrada con costo final trazable',jsonb_build_object(
    'closed_at',now(),'closure_sequence',v_sequence,'cost_center_id',v_wo.cost_center_id,
    'parts_cost',coalesce(v_cost.parts_cost,0),'labor_cost',coalesce(v_cost.labor_cost,0),'external_cost',coalesce(v_cost.effective_external_cost,0),'total_cost',coalesce(v_cost.total_cost,0),
    'procurement_received_cost',v_cost.procurement_received_cost,'procurement_currency',v_cost.procurement_currency,'procurement_currency_count',coalesce(v_cost.procurement_currency_count,0),
    'procurement_received_cost_is_evidence_only',true,'external_cost_basis',v_cost.external_cost_basis));
  return p_work_order_id;
end
$function$;