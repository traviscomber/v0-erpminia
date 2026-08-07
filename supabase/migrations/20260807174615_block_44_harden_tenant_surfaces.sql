alter table public.maintenance_feedback_exception_escalation_sources
  add column if not exists organization_id uuid;

update public.maintenance_feedback_exception_escalation_sources s
set organization_id = e.organization_id
from public.maintenance_feedback_exception_escalations e
where e.id = s.escalation_id
  and s.organization_id is null;

alter table public.maintenance_feedback_exception_escalation_sources
  alter column organization_id set not null;

create index if not exists maintenance_feedback_exception_escalation_sources_org_idx
  on public.maintenance_feedback_exception_escalation_sources (organization_id, escalation_id);

alter table public.maintenance_feedback_exception_escalations
  drop constraint if exists maintenance_feedback_exception_escalatio_recurrence_count_check;

alter table public.maintenance_feedback_exception_escalations
  add constraint maintenance_feedback_exception_escalations_recurrence_or_overdue_check
  check (recurrence_count >= 2 or overdue_followup_count > 0);

revoke all on public.maintenance_feedback_exception_escalation_sources from anon, authenticated;
grant select, insert, update, delete on public.maintenance_feedback_exception_escalation_sources to service_role;

revoke all on
  public.sensor_readings,
  public.sostenibilidad_compliance_history,
  public.sostenibilidad_nonconformances,
  public.tire_events,
  public.tire_master,
  public.tire_photos,
  public.tire_work_order_actions
from anon;

drop policy if exists sensor_readings_allow_all on public.sensor_readings;
create policy sensor_readings_org_isolation on public.sensor_readings
for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

drop policy if exists sostenibilidad_compliance_insert on public.sostenibilidad_compliance_history;
drop policy if exists sostenibilidad_compliance_select on public.sostenibilidad_compliance_history;
create policy sostenibilidad_compliance_org_select on public.sostenibilidad_compliance_history
for select to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));
create policy sostenibilidad_compliance_org_insert on public.sostenibilidad_compliance_history
for insert to authenticated
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

drop policy if exists sostenibilidad_nc_delete on public.sostenibilidad_nonconformances;
drop policy if exists sostenibilidad_nc_insert on public.sostenibilidad_nonconformances;
drop policy if exists sostenibilidad_nc_select on public.sostenibilidad_nonconformances;
drop policy if exists sostenibilidad_nc_update on public.sostenibilidad_nonconformances;
create policy sostenibilidad_nc_org_isolation on public.sostenibilidad_nonconformances
for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

drop policy if exists tire_events_allow_all on public.tire_events;
create policy tire_events_org_isolation on public.tire_events
for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

drop policy if exists tire_master_allow_all on public.tire_master;
create policy tire_master_org_isolation on public.tire_master
for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

drop policy if exists tire_photos_allow_all on public.tire_photos;
create policy tire_photos_org_isolation on public.tire_photos
for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

drop policy if exists tire_actions_allow_all on public.tire_work_order_actions;
create policy tire_actions_org_isolation on public.tire_work_order_actions
for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));
