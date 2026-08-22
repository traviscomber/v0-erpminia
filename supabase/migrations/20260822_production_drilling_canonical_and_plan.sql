-- Canonical drilling, drill-maintenance lineage and monthly mine planning.

create table if not exists public.production_drilling_source_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  import_batch_id uuid references public.production_import_batches(id) on delete set null,
  source_file text not null,
  source_file_sha256 text not null,
  source_sheet text not null default 'BaseDatos',
  source_row integer not null,
  source_record_id text not null,
  operation_date date not null,
  hole_code_raw text, rig_name_raw text, site_raw text, shift_code_raw text,
  operator_name_raw text, assistant_1_raw text, assistant_2_raw text,
  diameter_raw text, location_raw text, inclination_raw text,
  meter_initial numeric, meter_final numeric, drilled_meters numeric, box_count numeric,
  install_disassembly_raw text, equipment_without_crew_raw text, power_outage_raw text,
  scaling_raw text, water_shortage_raw text, machine_observations text, drilling_observations text,
  equipment_status_raw text, mine_raw text, sector_raw text, final_trays numeric,
  row_hash text not null,
  source_values jsonb,
  source_schema_version text default 'reporte_sondajes_base_datos_v1',
  reconciliation_status text not null default 'staged' check (reconciliation_status in ('staged','matched','review','rejected','promoted')),
  canonical_asset_id uuid references public.maintenance_assets(id) on delete set null,
  canonical_mine_source_id uuid references public.production_mine_sources(id) on delete set null,
  canonical_mine_sector_id uuid references public.production_mine_sectors(id) on delete set null,
  canonical_drill_hole_id uuid references public.production_drill_holes(id) on delete set null,
  reconciliation_notes text,
  created_at timestamptz not null default now(),
  unique(organization_id, source_file_sha256, source_record_id)
);
create index if not exists production_drilling_source_reports_date_idx on public.production_drilling_source_reports(organization_id,operation_date);
create index if not exists production_drilling_source_reports_hole_idx on public.production_drilling_source_reports(organization_id,hole_code_raw);
create index if not exists production_drilling_source_reports_rig_idx on public.production_drilling_source_reports(organization_id,rig_name_raw);

create table if not exists public.maintenance_drilling_source_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_file text not null, source_file_sha256 text not null, source_sheet text not null, source_row integer not null,
  asset_name_raw text not null, task_name_raw text not null, frequency_hours numeric,
  last_change_meter numeric, current_meter numeric, next_due_meter numeric, remaining_meter numeric,
  row_hash text not null,
  reconciliation_status text not null default 'staged' check (reconciliation_status in ('staged','matched','review','rejected','promoted')),
  canonical_asset_id uuid references public.maintenance_assets(id) on delete set null,
  canonical_schedule_id uuid references public.preventive_maintenance_schedules(id) on delete set null,
  reconciliation_notes text, created_at timestamptz not null default now(),
  unique(organization_id, source_file_sha256, source_sheet, source_row)
);

alter table public.preventive_maintenance_schedules add column if not exists last_executed_meter numeric;
alter table public.preventive_maintenance_schedules add column if not exists next_due_meter numeric;
alter table public.preventive_maintenance_schedules add column if not exists current_meter_snapshot numeric;
alter table public.preventive_maintenance_schedules add column if not exists meter_unit text;
alter table public.preventive_maintenance_schedules add column if not exists source_reference text;
alter table public.preventive_maintenance_schedules add column if not exists source_hash text;

create table if not exists public.production_source_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_file text not null, source_file_sha256 text not null,
  source_kind text not null check (source_kind in ('actual','plan','maintenance','drilling','metallurgy','mine_report','reference')),
  period_start date, period_end date,
  canonical_role text not null check (canonical_role in ('canonical','supporting','plan_only','reference_only','review')),
  row_count integer, formula_count integer, notes text, created_at timestamptz not null default now(),
  unique(organization_id,source_file_sha256)
);

create table if not exists public.production_monthly_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_code text not null, period_start date not null, period_end date not null,
  status text not null default 'approved' check (status in ('draft','approved','active','closed','cancelled')),
  source_document_id uuid references public.production_source_documents(id) on delete set null,
  prepared_by text, geology_by text, approved_by text, transport_days integer,
  total_mineral_to_plant_tons numeric, total_waste_tons numeric, total_movement_tons numeric,
  target_cu_grade_pct numeric, planned_advance_m numeric, planned_drilling_m numeric,
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,plan_code)
);

create table if not exists public.production_monthly_plan_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.production_monthly_plans(id) on delete cascade,
  line_type text not null check (line_type in ('mine_total','preparation','chamber','development','transport','radial_drilling','service')),
  mine_source_id uuid references public.production_mine_sources(id) on delete set null,
  mine_name_raw text, sector_raw text, level_raw text, section_raw text,
  planned_tons numeric, planned_grade_pct numeric, planned_fine_cu numeric,
  planned_advance_m numeric, planned_drilling_m numeric, planned_shots numeric, planned_trips_per_day numeric,
  participation_pct numeric, priority integer, source_page integer, source_reference text,
  created_at timestamptz not null default now()
);
create index if not exists production_monthly_plan_lines_plan_idx on public.production_monthly_plan_lines(plan_id,line_type);

create table if not exists public.production_drilling_monthly_metrics (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  month date not null, rig_name_raw text not null, mine_name_raw text not null, shift_code_raw text not null,
  report_count integer not null, drilled_meters numeric not null default 0, meter_rows integer not null default 0,
  out_of_service_reports integer not null default 0, no_crew_reports integer not null default 0,
  power_outage_reports integer not null default 0, water_shortage_reports integer not null default 0,
  install_disassembly_reports integer not null default 0, operator_count integer not null default 0, hole_count integer not null default 0,
  source_file text not null, source_file_sha256 text not null, created_at timestamptz not null default now(),
  unique(organization_id,month,rig_name_raw,mine_name_raw,shift_code_raw,source_file_sha256)
);

create table if not exists public.production_drilling_hole_summary (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  hole_code text not null, first_report_date date, last_report_date date, rig_name_raw text, mine_name_raw text, sector_name_raw text,
  diameter_raw text, inclination_raw text, report_count integer not null default 0, drilled_meters_reported numeric not null default 0,
  max_meter_final numeric, out_of_service_reports integer not null default 0, source_file text not null, source_file_sha256 text not null,
  created_at timestamptz not null default now(), unique(organization_id,hole_code,source_file_sha256)
);

create table if not exists public.production_drilling_operator_monthly (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  month date not null, operator_name_raw text not null, report_count integer not null default 0, drilled_meters numeric not null default 0,
  meter_rows integer not null default 0, rig_count integer not null default 0, hole_count integer not null default 0,
  out_of_service_reports integer not null default 0, source_file text not null, source_file_sha256 text not null,
  created_at timestamptz not null default now(), unique(organization_id,month,operator_name_raw,source_file_sha256)
);

create table if not exists public.production_drilling_dataset_summary (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  source_file text not null, source_file_sha256 text not null, period_start date not null, period_end date not null,
  report_rows integer not null, holes integer not null, rigs integer not null, operators integer not null,
  drilled_meters numeric not null, meter_rows integer not null, out_of_service_reports integer not null,
  no_crew_reports integer not null, power_outage_reports integer not null, water_shortage_reports integer not null,
  source_row_count integer not null, canonicalization_note text, created_at timestamptz not null default now(),
  unique(organization_id,source_file_sha256)
);

create or replace view public.production_drilling_operational_summary_v1 with (security_invoker=true) as
select organization_id, report_rows::numeric report_rows, holes::numeric holes, rigs::numeric rigs, operators::numeric operators,
       drilled_meters::numeric drilled_meters, out_of_service_reports::numeric out_of_service_reports,
       no_crew_reports::numeric no_crew_reports, power_outage_reports::numeric power_outage_reports,
       water_shortage_reports::numeric water_shortage_reports, period_start min_date, period_end max_date,
       case when report_rows=0 then null else meter_rows*100.0/report_rows end meter_capture_pct
from public.production_drilling_dataset_summary;

insert into public.role_operational_kpi_definitions(cargo_id,kpi_key,label,unit,source_domain,source_object,aggregation_method,direction)
select c.id,v.kpi_key,v.label,v.unit,'drilling','production_drilling_operational_summary_v1',v.method,v.direction
from public.cargos c join (values
 ('drilled_meters','Metros perforados','m','sum','higher_is_better'),
 ('drilling_holes','Sondajes con actividad','pozos','count','informational'),
 ('rigs_reporting','Sondas con reportes','equipos','count','informational'),
 ('meter_capture_pct','Cobertura de metros perforados','%','ratio','higher_is_better'),
 ('out_of_service_reports','Reportes fuera de servicio','reportes','count','lower_is_better')
) v(kpi_key,label,unit,method,direction) on true
where c.name in ('JEFE SONDAJE','JEFE GEOLOGÍA EXPLO.')
on conflict(cargo_id,kpi_key) do nothing;

insert into public.role_matrix(cargo_id,module_key,access_level)
select id,'core_desempeno','LEC' from public.cargos where name in ('JEFE SONDAJE','JEFE GEOLOGÍA EXPLO.')
on conflict(cargo_id,module_key) do update set access_level=excluded.access_level;

create or replace view public.drilling_role_kpi_snapshot_v1 with (security_invoker=true) as
with s as (select * from public.production_drilling_operational_summary_v1)
select s.organization_id,c.id cargo_id,c.name cargo_name,k.kpi_key,k.label,k.unit,
case k.kpi_key when 'drilled_meters' then s.drilled_meters when 'drilling_holes' then s.holes when 'rigs_reporting' then s.rigs when 'meter_capture_pct' then s.meter_capture_pct when 'out_of_service_reports' then s.out_of_service_reports end::numeric measured_value,
k.target_value,k.direction,case when k.target_value is null then 'baseline' else 'target_defined' end evaluation_state,now() measured_at,
jsonb_build_object('report_rows',s.report_rows,'operators',s.operators,'period_start',s.min_date,'period_end',s.max_date,'source_note','Fuente canónica operacional: Reporte_Sondajes_I_A.xlsx / BaseDatos.') evidence
from s cross join public.cargos c join public.role_operational_kpi_definitions k on k.cargo_id=c.id and k.enabled and k.source_domain='drilling';

revoke all on public.production_drilling_source_reports, public.maintenance_drilling_source_schedules, public.production_source_documents,
  public.production_monthly_plans, public.production_monthly_plan_lines, public.production_drilling_monthly_metrics,
  public.production_drilling_hole_summary, public.production_drilling_operator_monthly, public.production_drilling_dataset_summary from anon,authenticated;
revoke all on public.production_drilling_operational_summary_v1, public.drilling_role_kpi_snapshot_v1 from anon,authenticated;
grant select,insert,update on public.production_drilling_source_reports, public.maintenance_drilling_source_schedules, public.production_source_documents,
  public.production_monthly_plans, public.production_monthly_plan_lines, public.production_drilling_monthly_metrics,
  public.production_drilling_hole_summary, public.production_drilling_operator_monthly, public.production_drilling_dataset_summary to service_role;
grant select on public.production_drilling_operational_summary_v1, public.drilling_role_kpi_snapshot_v1 to service_role;
