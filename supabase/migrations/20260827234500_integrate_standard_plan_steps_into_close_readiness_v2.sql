create view public.work_order_close_readiness_v2
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
  wo.canonical_asset_id is null as missing_asset,
  coalesce(trim(wo.root_cause),'')='' as missing_root_cause,
  coalesce(trim(wo.preventive_actions),'')='' as missing_preventive_actions,
  coalesce(wo.actual_duration_hours,0)<=0 as missing_actual_hours,
  re.evidence_status as runtime_evidence_status,
  re.runtime_reading_id,
  re.unavailable_reason as runtime_unavailable_reason,
  ps.id is not null as hour_schedule_linked,
  ((lower(coalesce(wo.work_type,''))='correctivo' and re.id is null)
    or (ps.id is not null and (re.id is null or re.evidence_status<>'meter_reading' or re.runtime_reading_id is null))) as missing_runtime_evidence,
  coalesce(sp.total_steps,0) as standard_plan_steps_total,
  coalesce(sp.completed_steps,0) as standard_plan_steps_completed,
  coalesce(sp.pending_steps,0) as standard_plan_steps_pending,
  nsp.plan_step_id as next_plan_step_id,
  nsp.sequence_no as next_plan_step_sequence,
  nsp.title as next_plan_step_title,
  nsp.instructions as next_plan_step_instructions,
  nsp.control_requirement as next_plan_step_control_requirement,
  nsp.required_document_reference as next_plan_step_document_reference,
  wo.canonical_asset_id is not null
    and coalesce(sp.pending_steps,0)=0
    and coalesce(trim(wo.root_cause),'')<>''
    and coalesce(trim(wo.preventive_actions),'')<>''
    and coalesce(wo.actual_duration_hours,0)>0
    and (lower(coalesce(wo.work_type,''))<>'correctivo' or re.id is not null)
    and (ps.id is null or (re.evidence_status='meter_reading' and re.runtime_reading_id is not null))
    and coalesce(fc.open_procurement_orders,0)=0
    and coalesce(fc.pending_parts,0)=0
    and coalesce(fc.unmet_material_requirements,0)=0
    and coalesce(fc.pending_external_services,0)=0
    and coalesce(fc.open_labor_entries,0)=0
    and not coalesce(fc.external_cost_conflict,false) as ready_to_close,
  case
    when wo.canonical_asset_id is null then 'resolve_asset'
    when coalesce(fc.open_procurement_orders,0)>0 then 'resolve_procurement'
    when coalesce(fc.pending_parts,0)>0 then 'resolve_parts'
    when coalesce(fc.unmet_material_requirements,0)>0 then 'resolve_materials'
    when coalesce(fc.pending_external_services,0)>0 then 'resolve_external_services'
    when coalesce(fc.open_labor_entries,0)>0 then 'resolve_labor'
    when coalesce(fc.external_cost_conflict,false) then 'reconcile_external_cost'
    when coalesce(sp.pending_steps,0)>0 then 'complete_standard_plan_step'
    when coalesce(trim(wo.root_cause),'')='' then 'record_root_cause'
    when coalesce(trim(wo.preventive_actions),'')='' then 'record_preventive_actions'
    when coalesce(wo.actual_duration_hours,0)<=0 then 'record_actual_hours'
    when lower(coalesce(wo.work_type,''))='correctivo' and re.id is null then 'record_runtime_evidence'
    when ps.id is not null and (re.id is null or re.evidence_status<>'meter_reading' or re.runtime_reading_id is null) then 'record_runtime_evidence'
    else 'close_work_order'
  end as next_action
from public.maintenance_work_orders wo
left join public.work_order_final_cost_v1 fc on fc.organization_id=wo.organization_id and fc.work_order_id=wo.id
left join public.work_order_runtime_evidence re on re.organization_id=wo.organization_id and re.work_order_id=wo.id
left join public.preventive_maintenance_schedules ps on ps.organization_id=wo.organization_id and ps.generated_work_order_id=wo.id and ps.enabled=true and coalesce(ps.frequency_hours,0)>0
left join lateral (
  select count(*)::int as total_steps,
         count(*) filter (where ex.execution_status='completed')::int as completed_steps,
         count(*) filter (where ex.execution_status<>'completed')::int as pending_steps
  from public.work_order_standard_plan_execution_v1 ex
  where ex.organization_id=wo.organization_id and ex.work_order_id=wo.id
) sp on true
left join lateral (
  select ex.plan_step_id,ex.sequence_no,ex.title,ex.instructions,ex.control_requirement,ex.required_document_reference
  from public.work_order_standard_plan_execution_v1 ex
  where ex.organization_id=wo.organization_id and ex.work_order_id=wo.id and ex.execution_status<>'completed'
  order by ex.sequence_no,ex.plan_step_id
  limit 1
) nsp on true
where wo.status<>'completed';

revoke all on public.work_order_close_readiness_v2 from public,anon,authenticated;
grant select on public.work_order_close_readiness_v2 to service_role;