revoke all on
  public.alarms,
  public.bodega_inventory,
  public.calendario_eventos_sostenibilidad,
  public.capacitaciones_actuales,
  public.cargos,
  public.carpeta_documentos,
  public.carpetas_arranque,
  public.corrective_actions,
  public.detenciones,
  public.epp_asignacion_historico,
  public.epp_maestro,
  public.epp_resolucion_cambio,
  public.equipment_availability,
  public.equipment_hse_requirements,
  public.event_history,
  public.event_log,
  public.finanzas_movements,
  public.historico_capacitaciones,
  public.hse_alerts,
  public.incident_investigations,
  public.kpi_prevencion,
  public.normative_frameworks,
  public.normative_requirements,
  public.order_progress_tracking,
  public.order_wear_parts,
  public.role_matrix,
  public.sostenibilidad_ca_updates,
  public.sostenibilidad_corrective_actions,
  public.sostenibilidad_nc_details
from anon;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format(
      'revoke truncate, references, trigger on table public.%I from anon, authenticated',
      r.tablename
    );
  end loop;
end $$;

drop index if exists public.idx_bodega_sku;
drop index if exists public.idx_contracts_contract_number;
drop index if exists public.idx_ordenes_compra_numero;
drop index if exists public.idx_standard_job_plan_steps_plan;
drop index if exists public.idx_profiles_email;
drop index if exists public.idx_purchase_orders_org_po_number;
drop index if exists public.idx_suppliers_rut;
drop index if exists public.idx_tire_master_code;
drop index if exists public.idx_user_roles_user;
drop index if exists public.idx_user_roles_org;
