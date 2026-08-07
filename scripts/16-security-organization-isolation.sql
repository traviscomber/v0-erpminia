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

-- 7) Legacy tables with verified organization relationships
alter table public.compliance_events enable row level security;
create policy compliance_events_org_isolation on public.compliance_events for all to authenticated
using (org_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())))
with check (org_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid())));

alter table public.plants enable row level security;
drop policy if exists plants_allow_all on public.plants;
create policy plants_org_isolation on public.plants for all to authenticated
using (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = plants.created_by
    and viewer_role.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = plants.created_by
    and viewer_role.user_id = (select auth.uid())
));

alter table public.equipment enable row level security;
drop policy if exists equipment_allow_all on public.equipment;
create policy equipment_org_isolation on public.equipment for all to authenticated
using (
  exists (select 1 from public.plants p where p.id = equipment.plant_id)
  or exists (
    select 1 from public.user_roles owner_role
    join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
    where owner_role.user_id = equipment.created_by
      and viewer_role.user_id = (select auth.uid())
  )
)
with check (
  exists (select 1 from public.plants p where p.id = equipment.plant_id)
  or exists (
    select 1 from public.user_roles owner_role
    join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
    where owner_role.user_id = equipment.created_by
      and viewer_role.user_id = (select auth.uid())
  )
);

alter table public.sensors enable row level security;
drop policy if exists sensors_allow_all on public.sensors;
create policy sensors_org_isolation on public.sensors for all to authenticated
using (exists (select 1 from public.equipment e where e.id = sensors.equipment_id))
with check (exists (select 1 from public.equipment e where e.id = sensors.equipment_id));

alter table public.incidents enable row level security;
drop policy if exists incidents_allow_all on public.incidents;
create policy incidents_org_isolation on public.incidents for all to authenticated
using (
  exists (select 1 from public.equipment e where e.id = incidents.equipment_id)
  or exists (
    select 1 from public.user_roles owner_role
    join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
    where owner_role.user_id = incidents.reported_by
      and viewer_role.user_id = (select auth.uid())
  )
)
with check (
  exists (select 1 from public.equipment e where e.id = incidents.equipment_id)
  or exists (
    select 1 from public.user_roles owner_role
    join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
    where owner_role.user_id = incidents.reported_by
      and viewer_role.user_id = (select auth.uid())
  )
);

alter table public.maintenance_orders enable row level security;
drop policy if exists allow_all_maintenance_orders on public.maintenance_orders;
create policy maintenance_orders_org_isolation on public.maintenance_orders for all to authenticated
using (exists (
  select 1 from public.user_roles record_role
  join public.user_roles viewer_role on viewer_role.organization_id = record_role.organization_id
  where record_role.user_id = coalesce(maintenance_orders.created_by, maintenance_orders.assigned_to)
    and viewer_role.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.user_roles record_role
  join public.user_roles viewer_role on viewer_role.organization_id = record_role.organization_id
  where record_role.user_id = coalesce(maintenance_orders.created_by, maintenance_orders.assigned_to)
    and viewer_role.user_id = (select auth.uid())
));

alter table public.mantenimiento_ordenes enable row level security;
create policy mantenimiento_ordenes_org_isolation on public.mantenimiento_ordenes for all to authenticated
using (exists (
  select 1 from public.user_roles assigned_role
  join public.user_roles viewer_role on viewer_role.organization_id = assigned_role.organization_id
  where assigned_role.user_id = mantenimiento_ordenes.assigned_to
    and viewer_role.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.user_roles assigned_role
  join public.user_roles viewer_role on viewer_role.organization_id = assigned_role.organization_id
  where assigned_role.user_id = mantenimiento_ordenes.assigned_to
    and viewer_role.user_id = (select auth.uid())
));

alter table public.mantenimiento_evidencia enable row level security;
create policy mantenimiento_evidencia_org_isolation on public.mantenimiento_evidencia for all to authenticated
using (exists (select 1 from public.mantenimiento_ordenes o where o.id = mantenimiento_evidencia.ot_id))
with check (exists (select 1 from public.mantenimiento_ordenes o where o.id = mantenimiento_evidencia.ot_id));

alter table public.mantenimiento_partes enable row level security;
create policy mantenimiento_partes_org_isolation on public.mantenimiento_partes for all to authenticated
using (exists (select 1 from public.mantenimiento_ordenes o where o.id = mantenimiento_partes.ot_id))
with check (exists (select 1 from public.mantenimiento_ordenes o where o.id = mantenimiento_partes.ot_id));

alter table public.mantenimiento_tiempo enable row level security;
create policy mantenimiento_tiempo_org_isolation on public.mantenimiento_tiempo for all to authenticated
using (exists (select 1 from public.mantenimiento_ordenes o where o.id = mantenimiento_tiempo.ot_id))
with check (exists (select 1 from public.mantenimiento_ordenes o where o.id = mantenimiento_tiempo.ot_id));

alter table public.warehouse_racks enable row level security;
create policy warehouse_racks_org_isolation on public.warehouse_racks for all to authenticated
using (exists (select 1 from public.warehouse_zones z where z.id = warehouse_racks.zone_id))
with check (exists (select 1 from public.warehouse_zones z where z.id = warehouse_racks.zone_id));

alter table public.warehouse_bins enable row level security;
create policy warehouse_bins_org_isolation on public.warehouse_bins for all to authenticated
using (exists (select 1 from public.warehouse_racks r where r.id = warehouse_bins.rack_id))
with check (exists (select 1 from public.warehouse_racks r where r.id = warehouse_bins.rack_id));

alter table public.procurement_documents enable row level security;
create policy procurement_documents_org_isolation on public.procurement_documents for all to authenticated
using (exists (
  select 1 from public.contracts c
  where c.id = procurement_documents.contract_id
    and c.organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid()))
))
with check (exists (
  select 1 from public.contracts c
  where c.id = procurement_documents.contract_id
    and c.organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid()))
));

alter table public.hse_master_documents enable row level security;
drop policy if exists "Allow all on hse_master_documents" on public.hse_master_documents;
create policy hse_master_documents_org_isolation on public.hse_master_documents for all to authenticated
using (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = hse_master_documents.created_by
    and viewer_role.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = hse_master_documents.created_by
    and viewer_role.user_id = (select auth.uid())
));

alter table public.flujo_aprobacion_documentos_sostenibilidad enable row level security;
drop policy if exists "Allow all on flujo_aprobacion_documentos_sostenibilidad" on public.flujo_aprobacion_documentos_sostenibilidad;
create policy flujo_documentos_org_isolation on public.flujo_aprobacion_documentos_sostenibilidad for all to authenticated
using (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = flujo_aprobacion_documentos_sostenibilidad.creador_id
    and viewer_role.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = flujo_aprobacion_documentos_sostenibilidad.creador_id
    and viewer_role.user_id = (select auth.uid())
));

alter table public.auditoria_documentos_sostenibilidad enable row level security;
drop policy if exists "Allow all on auditoria_documentos_sostenibilidad" on public.auditoria_documentos_sostenibilidad;
create policy auditoria_documentos_org_isolation on public.auditoria_documentos_sostenibilidad for select to authenticated
using (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = auditoria_documentos_sostenibilidad.usuario_id
    and viewer_role.user_id = (select auth.uid())
));

alter table public.risk_matrix enable row level security;
drop policy if exists risk_matrix_allow_all on public.risk_matrix;
create policy risk_matrix_org_isolation on public.risk_matrix for all to authenticated
using (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = risk_matrix.risk_owner
    and viewer_role.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = risk_matrix.risk_owner
    and viewer_role.user_id = (select auth.uid())
));

alter table public.bodega_movements enable row level security;
create policy bodega_movements_org_isolation on public.bodega_movements for all to authenticated
using (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = bodega_movements.performed_by
    and viewer_role.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = bodega_movements.performed_by
    and viewer_role.user_id = (select auth.uid())
));

alter table public.document_audit_log enable row level security;
create policy document_audit_log_org_isolation on public.document_audit_log for select to authenticated
using (exists (
  select 1 from public.user_roles owner_role
  join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
  where owner_role.user_id = document_audit_log.user_id
    and viewer_role.user_id = (select auth.uid())
));

alter table public.document_approvals enable row level security;
create policy document_approvals_org_isolation on public.document_approvals for all to authenticated
using (exists (
  select 1 from public.user_roles approver_role
  join public.user_roles viewer_role on viewer_role.organization_id = approver_role.organization_id
  where approver_role.user_id = document_approvals.approver_id
    and viewer_role.user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.user_roles approver_role
  join public.user_roles viewer_role on viewer_role.organization_id = approver_role.organization_id
  where approver_role.user_id = document_approvals.approver_id
    and viewer_role.user_id = (select auth.uid())
));

-- 8) Module documents and versions
-- Broad authenticated access is replaced by asset or uploader organization ownership.
drop policy if exists module_documents_allow_authenticated_delete on public.module_documents;
drop policy if exists module_documents_allow_authenticated_insert on public.module_documents;
drop policy if exists module_documents_allow_authenticated_select on public.module_documents;
drop policy if exists module_documents_allow_authenticated_update on public.module_documents;
create policy module_documents_org_isolation on public.module_documents for all to authenticated
using (
  exists (
    select 1 from public.maintenance_assets a
    where a.id = module_documents.asset_id
      and a.organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid()))
  )
  or exists (
    select 1 from public.user_roles owner_role
    join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
    where owner_role.user_id = module_documents.uploaded_by
      and viewer_role.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.maintenance_assets a
    where a.id = module_documents.asset_id
      and a.organization_id in (select ur.organization_id from public.user_roles ur where ur.user_id = (select auth.uid()))
  )
  or exists (
    select 1 from public.user_roles owner_role
    join public.user_roles viewer_role on viewer_role.organization_id = owner_role.organization_id
    where owner_role.user_id = module_documents.uploaded_by
      and viewer_role.user_id = (select auth.uid())
  )
);

alter table public.document_versions enable row level security;
create policy document_versions_org_isolation on public.document_versions for all to authenticated
using (exists (select 1 from public.module_documents d where d.id = document_versions.document_id))
with check (exists (select 1 from public.module_documents d where d.id = document_versions.document_id));

-- 9) Legacy aggregate tables without a trustworthy organization key
-- They remain readable by service-role backend code, but are not exposed directly through the Data API.
alter table public.hse_inspections enable row level security;
alter table public.produccion_kpi enable row level security;
alter table public.hse_metrics enable row level security;
alter table public.mantenimiento_kpi enable row level security;
alter table public.sostenibilidad_no_conformidades enable row level security;
alter table public.sostenibilidad_incidentes enable row level security;
alter table public.finanzas_presupuestos enable row level security;
alter table public.finanzas_requisiciones enable row level security;
alter table public.finanzas_ordenes_compra enable row level security;
alter table public.finanzas_ordenes_compra_lineas enable row level security;

revoke all privileges on table public.hse_inspections from anon, authenticated;
revoke all privileges on table public.produccion_kpi from anon, authenticated;
revoke all privileges on table public.hse_metrics from anon, authenticated;
revoke all privileges on table public.mantenimiento_kpi from anon, authenticated;
revoke all privileges on table public.sostenibilidad_no_conformidades from anon, authenticated;
revoke all privileges on table public.sostenibilidad_incidentes from anon, authenticated;
revoke all privileges on table public.finanzas_presupuestos from anon, authenticated;
revoke all privileges on table public.finanzas_requisiciones from anon, authenticated;
revoke all privileges on table public.finanzas_ordenes_compra from anon, authenticated;
revoke all privileges on table public.finanzas_ordenes_compra_lineas from anon, authenticated;

revoke select on public.maintenance_summary_view from anon, authenticated;
