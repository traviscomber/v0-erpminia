create or replace function public.propose_standard_job_plan_from_schedule_v1(p_schedule_id uuid)
returns uuid
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare v_actor uuid; v_s public.preventive_maintenance_schedules%rowtype; v_plan uuid; v_code text;
begin
  v_actor := public.current_application_user_id();
  select * into v_s from public.preventive_maintenance_schedules where id=p_schedule_id;
  if not found then raise exception 'Pauta preventiva no encontrada'; end if;
  if not exists(select 1 from public.user_roles where user_id=v_actor and organization_id=v_s.organization_id) then raise exception 'Sin permisos'; end if;
  select a.plan_id into v_plan from public.maintenance_standard_job_plan_applications a join public.maintenance_standard_job_plans p on p.id=a.plan_id where a.organization_id=v_s.organization_id and a.preventive_schedule_id=v_s.id and p.status in ('proposed','approved') order by a.created_at desc limit 1;
  if v_plan is not null then return v_plan; end if;
  v_code := 'SJP-' || upper(substr(replace(v_s.id::text,'-',''),1,10));
  insert into public.maintenance_standard_job_plans(organization_id,plan_code,name,work_type,canonical_asset_id,status,estimated_duration_hours,reason,evidence_reference,proposed_by,proposed_at,created_at,updated_at)
  values(v_s.organization_id,v_code,v_s.task_name,'preventive',coalesce(v_s.canonical_asset_id,v_s.asset_id),'proposed',v_s.estimated_duration_hours,'Propuesto desde pauta preventiva existente',v_s.source_reference,v_actor,now(),now(),now()) returning id into v_plan;
  insert into public.maintenance_standard_job_plan_applications(organization_id,plan_id,preventive_schedule_id,status,applied_by,applied_at,created_at)
  values(v_s.organization_id,v_plan,v_s.id,'inactive',v_actor,now(),now());
  return v_plan;
end $$;

create or replace function public.add_standard_job_plan_step_v1(p_plan_id uuid,p_title text,p_instructions text default null,p_control_requirement text default null,p_estimated_minutes numeric default null)
returns uuid
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare v_actor uuid; v_org uuid; v_status text; v_id uuid; v_seq integer;
begin
  v_actor := public.current_application_user_id();
  select organization_id,status into v_org,v_status from public.maintenance_standard_job_plans where id=p_plan_id for update;
  if not found then raise exception 'Plan estándar no encontrado'; end if;
  if not exists(select 1 from public.user_roles where user_id=v_actor and organization_id=v_org) then raise exception 'Sin permisos'; end if;
  if v_status<>'proposed' then raise exception 'Sólo se editan planes propuestos'; end if;
  if nullif(trim(coalesce(p_title,'')),'') is null then raise exception 'El paso requiere título'; end if;
  select coalesce(max(sequence_no),0)+1 into v_seq from public.maintenance_standard_job_plan_steps where plan_id=p_plan_id;
  insert into public.maintenance_standard_job_plan_steps(organization_id,plan_id,sequence_no,title,instructions,control_requirement,estimated_minutes,created_at)
  values(v_org,p_plan_id,v_seq,trim(p_title),nullif(trim(coalesce(p_instructions,'')),''),nullif(trim(coalesce(p_control_requirement,'')),''),p_estimated_minutes,now()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.approve_standard_job_plan_v1(p_plan_id uuid)
returns uuid
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare v_actor uuid; v_org uuid; v_status text;
begin
  v_actor := public.current_application_user_id();
  select organization_id,status into v_org,v_status from public.maintenance_standard_job_plans where id=p_plan_id for update;
  if not found then raise exception 'Plan estándar no encontrado'; end if;
  if not exists(select 1 from public.user_roles where user_id=v_actor and organization_id=v_org) then raise exception 'Sin permisos'; end if;
  if v_status<>'proposed' then raise exception 'El plan no está propuesto'; end if;
  if not exists(select 1 from public.maintenance_standard_job_plan_steps where plan_id=p_plan_id) then raise exception 'Agrega al menos un paso antes de aprobar'; end if;
  update public.maintenance_standard_job_plans set status='approved',approved_by=v_actor,approved_at=now(),updated_at=now() where id=p_plan_id;
  update public.maintenance_standard_job_plan_applications set status='active' where organization_id=v_org and plan_id=p_plan_id and preventive_schedule_id is not null;
  return p_plan_id;
end $$;

revoke all on function public.propose_standard_job_plan_from_schedule_v1(uuid) from public,anon,authenticated;
revoke all on function public.add_standard_job_plan_step_v1(uuid,text,text,text,numeric) from public,anon,authenticated;
revoke all on function public.approve_standard_job_plan_v1(uuid) from public,anon,authenticated;
grant execute on function public.propose_standard_job_plan_from_schedule_v1(uuid) to service_role;
grant execute on function public.add_standard_job_plan_step_v1(uuid,text,text,text,numeric) to service_role;
grant execute on function public.approve_standard_job_plan_v1(uuid) to service_role;
