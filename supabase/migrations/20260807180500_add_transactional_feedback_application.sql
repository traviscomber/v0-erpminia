alter table public.maintenance_feedback_change_proposals add column if not exists before_snapshot jsonb null;
alter table public.maintenance_feedback_change_proposals add column if not exists after_snapshot jsonb null;

create or replace function public.apply_maintenance_feedback_change(p_proposal_id uuid, p_organization_id uuid, p_actor uuid)
returns uuid
language plpgsql
security definer
set search_path = public, canonical
as $$
declare
  p public.maintenance_feedback_change_proposals%rowtype;
  current_row jsonb;
  result_row jsonb;
  new_id uuid;
  payload jsonb;
begin
  select * into p from public.maintenance_feedback_change_proposals where id=p_proposal_id and organization_id=p_organization_id for update;
  if not found then raise exception 'proposal_not_found'; end if;
  if p.status <> 'approved' then raise exception 'proposal_not_approved'; end if;
  payload := coalesce(p.proposed_payload, '{}'::jsonb);
  if p.target_type='strategy' then
    select to_jsonb(s) into current_row from public.maintenance_asset_strategies s where s.organization_id=p_organization_id and s.canonical_asset_id=p.canonical_asset_id and s.status='approved' order by s.approved_at desc nulls last,s.updated_at desc limit 1 for update;
    update public.maintenance_asset_strategies set status='inactive',updated_at=now() where organization_id=p_organization_id and canonical_asset_id=p.canonical_asset_id and status in ('approved','proposed');
    insert into public.maintenance_asset_strategies(organization_id,canonical_asset_id,criticality_level,maintenance_strategy,status,reason,evidence_reference,proposed_by,proposed_at,approved_by,approved_at,updated_at)
    values(p_organization_id,p.canonical_asset_id,payload->>'criticalityLevel',payload->>'maintenanceStrategy','approved',p.reason,p.evidence_reference,p.proposed_by,p.proposed_at,p_actor,now(),now()) returning id,to_jsonb(maintenance_asset_strategies.*) into new_id,result_row;
  elsif p.target_type='lifecycle' then
    select to_jsonb(l) into current_row from public.maintenance_asset_lifecycle_decisions l where l.organization_id=p_organization_id and l.canonical_asset_id=p.canonical_asset_id and l.status='approved' order by l.approved_at desc nulls last,l.updated_at desc limit 1 for update;
    update public.maintenance_asset_lifecycle_decisions set status='inactive',updated_at=now() where organization_id=p_organization_id and canonical_asset_id=p.canonical_asset_id and status in ('approved','proposed');
    insert into public.maintenance_asset_lifecycle_decisions(organization_id,canonical_asset_id,decision_type,status,reason,evidence_reference,target_date,proposed_by,proposed_at,approved_by,approved_at,updated_at)
    values(p_organization_id,p.canonical_asset_id,payload->>'decisionType','approved',p.reason,p.evidence_reference,nullif(payload->>'targetDate','')::date,p.proposed_by,p.proposed_at,p_actor,now(),now()) returning id,to_jsonb(maintenance_asset_lifecycle_decisions.*) into new_id,result_row;
  elsif p.target_type='preventive' then
    select to_jsonb(pm) into current_row from public.preventive_maintenance_schedules pm where pm.id=p.target_record_id and pm.organization_id=p_organization_id and pm.canonical_asset_id=p.canonical_asset_id and coalesce(pm.enabled,true)=true for update;
    if current_row is null then raise exception 'preventive_target_invalid'; end if;
    update public.preventive_maintenance_schedules set frequency_days=case when payload ? 'frequencyDays' then nullif(payload->>'frequencyDays','')::integer else frequency_days end,frequency_hours=case when payload ? 'frequencyHours' then nullif(payload->>'frequencyHours','')::numeric else frequency_hours end,updated_at=now() where id=p.target_record_id and organization_id=p_organization_id returning id,to_jsonb(preventive_maintenance_schedules.*) into new_id,result_row;
  else raise exception 'unsupported_target_type';
  end if;
  update public.maintenance_feedback_change_proposals set status='applied',applied_by=p_actor,applied_at=now(),result_record_id=new_id,before_snapshot=current_row,after_snapshot=result_row,updated_at=now() where id=p.id;
  return new_id;
end;
$$;
revoke all on function public.apply_maintenance_feedback_change(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_maintenance_feedback_change(uuid,uuid,uuid) to service_role;