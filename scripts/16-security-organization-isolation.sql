-- Block 16 - Seguridad, permisos y aislamiento por organizacion
-- Applied to production in reviewed migrations.
-- Server API routes use SUPABASE_SERVICE_ROLE_KEY and remain responsible for explicit organization filters.

-- 1) Membership and identity metadata
drop policy if exists "Allow public read user_roles" on public.user_roles;
create policy user_roles_self_read on public.user_roles for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Allow public read organizations" on public.organizations;
drop policy if exists org_users_can_view on public.organizations;
create policy org_users_can_view on public.organizations for select to authenticated
using (exists (
  select 1 from public.user_roles ur
  where ur.organization_id = organizations.id
    and ur.user_id = (select auth.uid())
));

drop policy if exists "Allow public read profiles" on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated
using (id = (select auth.uid()));

-- 2) Current operational core
drop policy if exists maintenance_work_orders_all on public.maintenance_work_orders;
drop policy if exists work_orders_org_isolation on public.maintenance_work_orders;
create policy work_orders_org_isolation on public.maintenance_work_orders for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

drop policy if exists preventive_maint_org_isolation on public.preventive_maintenance_schedules;
create policy preventive_maint_org_isolation on public.preventive_maintenance_schedules for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

alter table public.purchase_orders enable row level security;
create policy purchase_orders_org_isolation on public.purchase_orders for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

alter table public.warehouse_stock enable row level security;
create policy warehouse_stock_org_isolation on public.warehouse_stock for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

alter table public.stock_movements enable row level security;
create policy stock_movements_org_isolation on public.stock_movements for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

-- 3) Remaining public tables that already have organization_id
do $$
declare
  target_table text;
  target_tables text[] := array[
    'inspecciones_externas','inspecciones_internas','maintenance_expedient_records','qr_codes',
    'reorder_alerts','sostenibilidad_capacitaciones','sostenibilidad_comunidades',
    'sostenibilidad_documentos_flujo','sostenibilidad_epp','sostenibilidad_kpis',
    'sostenibilidad_medio_ambiente','spare_parts','stock_transfers','user_permissions','warehouse_zones'
  ];
begin
  foreach target_table in array target_tables loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format(
      'create policy %I on public.%I for all to authenticated using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid()))) with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))',
      target_table || '_org_isolation', target_table
    );
  end loop;
end $$;

-- 4) Canonical reporting sources and public views
alter table canonical.asset_costs enable row level security;
create policy asset_costs_org_access on canonical.asset_costs for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

alter table canonical.cost_centers enable row level security;
create policy cost_centers_org_access on canonical.cost_centers for all to authenticated
using (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

alter view public.canonical_asset_costs_current set (security_invoker = true);
alter view public.canonical_cost_centers_current set (security_invoker = true);
alter view public.canonical_purchase_order_lines_current set (security_invoker = true);

-- 5) Operational SECURITY DEFINER functions are server-side only.
-- Revoke PUBLIC as well because anon/authenticated inherit PUBLIC privileges.
revoke execute on function public.add_work_order_labor(uuid, uuid, uuid, text, numeric, numeric, text, uuid) from public, anon, authenticated;
revoke execute on function public.assign_work_order_person(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.award_intake_quotation(uuid) from public, anon, authenticated;
revoke execute on function public.award_supplier_quotation(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.convert_supply_need_to_intake_request(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.create_intake_quotation(uuid, uuid, integer, text, date, jsonb) from public, anon, authenticated;
revoke execute on function public.create_procurement_request(jsonb, uuid, text) from public, anon, authenticated;
revoke execute on function public.create_supplier_quotation(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.create_work_order_from_schedule(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.install_work_order_part(uuid, uuid, integer, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.issue_available_materials_to_work_order(uuid) from public, anon, authenticated;
revoke execute on function public.issue_work_order_part(uuid, uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.receive_operational_order(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.receive_purchase_order(uuid, jsonb, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.refresh_work_order_supply_need(uuid) from public, anon, authenticated;
revoke execute on function public.return_work_order_part(uuid, uuid, integer, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.close_work_order_safely(uuid) from public, anon, authenticated;
revoke execute on function public.audit_log_trigger() from public, anon, authenticated;
revoke execute on function public.log_work_order_change() from public, anon, authenticated;

-- 6) Legacy function hardening
alter function public.handle_sensor_anomaly() set search_path = public, pg_temp;
alter function public.handle_equipment_status_change() set search_path = public, pg_temp;
alter function public.handle_alarm_created() set search_path = public, pg_temp;
alter function public.get_pending_events(integer) set search_path = public, pg_temp;
alter function public.mark_event_processed(uuid, jsonb) set search_path = public, pg_temp;
alter function public.mark_event_failed(uuid, text) set search_path = public, pg_temp;
alter function public.get_user_for_login(text) set search_path = public, pg_temp;
alter function public.get_user_role(uuid) set search_path = public, pg_temp;
alter function public.handle_incident_reported() set search_path = public, pg_temp;
alter function public.update_module_documents_updated_at() set search_path = public, pg_temp;
alter function public.get_nc_stats(text) set search_path = public, pg_temp;
alter function public.get_ca_stats(text) set search_path = public, pg_temp;
alter function public.audit_log_trigger() set search_path = public, pg_temp;
alter function public.update_maintenance_expedient_records_updated_at() set search_path = public, pg_temp;

revoke execute on function public.get_user_for_login(text) from public, anon, authenticated;
revoke execute on function public.get_user_role(uuid) from public, anon, authenticated;
revoke execute on function public.get_pending_events(integer) from public, anon, authenticated;
revoke execute on function public.mark_event_processed(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.mark_event_failed(uuid, text) from public, anon, authenticated;
