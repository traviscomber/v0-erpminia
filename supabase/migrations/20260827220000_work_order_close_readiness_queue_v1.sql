create or replace view public.work_order_close_readiness_v1
with (security_invoker=true)
as
select
  wo.organization_id,
  wo.id as work_order_id,
  wo.work_order_number,
  wo.title,
  wo.status,
  wo.priority,
  wo.work_type,
  wo.canonical_asset_id,
  wo.cost_center_id,
  wo.root_cause,
  wo.preventive_actions,
  wo.actual_duration_hours,
  fc.parts_cost,
  fc.labor_cost,
  fc.effective_external_cost,
  fc.total_cost,
  fc.open_procurement_orders,
  fc.pending_parts,
  fc.unmet_material_requirements,
  fc.pending_external_services,
  fc.open_labor_entries,
  fc.external_cost_conflict,
  (wo.canonical_asset_id is null) as missing_asset,
  (coalesce(trim(wo.root_cause),'')='') as missing_root_cause,
  (coalesce(trim(wo.preventive_actions),'')='') as missing_preventive_actions,
  (coalesce(wo.actual_duration_hours,0)<=0) as missing_actual_hours,
  (
    wo.canonical_asset_id is not null
    and coalesce(trim(wo.root_cause),'') <> ''
    and coalesce(trim(wo.preventive_actions),'') <> ''
    and coalesce(wo.actual_duration_hours,0) > 0
    and coalesce(fc.open_procurement_orders,0)=0
    and coalesce(fc.pending_parts,0)=0
    and coalesce(fc.unmet_material_requirements,0)=0
    and coalesce(fc.pending_external_services,0)=0
    and coalesce(fc.open_labor_entries,0)=0
    and not coalesce(fc.external_cost_conflict,false)
  ) as ready_to_close,
  case
    when wo.canonical_asset_id is null then 'resolve_asset'
    when coalesce(fc.open_procurement_orders,0)>0 then 'resolve_procurement'
    when coalesce(fc.pending_parts,0)>0 then 'resolve_parts'
    when coalesce(fc.unmet_material_requirements,0)>0 then 'resolve_materials'
    when coalesce(fc.pending_external_services,0)>0 then 'resolve_external_services'
    when coalesce(fc.open_labor_entries,0)>0 then 'resolve_labor'
    when coalesce(fc.external_cost_conflict,false) then 'reconcile_external_cost'
    when coalesce(trim(wo.root_cause),'')='' then 'record_root_cause'
    when coalesce(trim(wo.preventive_actions),'')='' then 'record_preventive_actions'
    when coalesce(wo.actual_duration_hours,0)<=0 then 'record_actual_hours'
    else 'close_work_order'
  end::text as next_action
from public.maintenance_work_orders wo
left join public.work_order_final_cost_v1 fc
  on fc.organization_id=wo.organization_id and fc.work_order_id=wo.id
where wo.status <> 'completed';

revoke select on public.work_order_close_readiness_v1 from public, anon, authenticated;
grant select on public.work_order_close_readiness_v1 to service_role;
