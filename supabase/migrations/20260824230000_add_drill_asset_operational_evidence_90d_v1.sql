create or replace view public.drill_asset_operational_evidence_90d_v1 as
with windows as (
  select organization_id, canonical_asset_id, asset_code, asset_name, window_start, window_end
  from public.drill_asset_unit_economics_90d_v1
), drilling as (
  select w.organization_id,w.canonical_asset_id,
    count(r.id) as drilling_reports,
    count(*) filter (where upper(trim(coalesce(r.equipment_status_raw,'')))='FUERA DE SERVICIO') as out_of_service_reports,
    count(*) filter (where upper(trim(coalesce(r.equipment_status_raw,'')))='OPERATIVO CON OBSERVACIONES') as operational_with_observations_reports,
    count(*) filter (where upper(trim(coalesce(r.equipment_status_raw,'')))='OPERATIVO') as operational_reports,
    count(*) filter (where nullif(trim(coalesce(r.equipment_status_raw,'')),'') is not null and upper(trim(r.equipment_status_raw)) not in ('FUERA DE SERVICIO','OPERATIVO CON OBSERVACIONES','OPERATIVO')) as invalid_status_reports,
    count(*) filter (where nullif(trim(coalesce(r.equipment_without_crew_raw,'')),'') is not null and lower(trim(r.equipment_without_crew_raw)) not in ('0','no','n/a','na','-')) as equipment_without_crew_reports,
    count(*) filter (where nullif(trim(coalesce(r.power_outage_raw,'')),'') is not null and lower(trim(r.power_outage_raw)) not in ('0','no','n/a','na','-')) as power_outage_reports,
    count(*) filter (where nullif(trim(coalesce(r.water_shortage_raw,'')),'') is not null and lower(trim(r.water_shortage_raw)) not in ('0','no','n/a','na','-')) as water_shortage_reports,
    count(*) filter (where nullif(trim(coalesce(r.install_disassembly_raw,'')),'') is not null and lower(trim(r.install_disassembly_raw)) not in ('0','no','n/a','na','-')) as install_disassembly_reports,
    count(*) filter (where nullif(trim(coalesce(r.scaling_raw,'')),'') is not null and lower(trim(r.scaling_raw)) not in ('0','no','n/a','na','-')) as scaling_reports
  from windows w
  left join public.production_drilling_source_reports r
    on r.organization_id=w.organization_id
   and r.canonical_asset_id=w.canonical_asset_id
   and r.operation_date between w.window_start and w.window_end
  group by w.organization_id,w.canonical_asset_id
), maintenance as (
  select w.organization_id,w.canonical_asset_id,
    count(wo.id) as work_order_count,
    count(wo.id) filter (where lower(coalesce(wo.status,'')) not in ('completed','closed','cerrada','completada')) as open_work_order_count,
    sum(wo.down_time_hours) as recorded_downtime_hours,
    sum(wo.external_cost) as external_cost_clp
  from windows w
  left join public.maintenance_work_orders wo
    on wo.organization_id=w.organization_id
   and wo.canonical_asset_id=w.canonical_asset_id
   and wo.created_at::date between w.window_start and w.window_end
  group by w.organization_id,w.canonical_asset_id
), parts as (
  select w.organization_id,w.canonical_asset_id,
    count(p.id) as part_line_count,
    sum(p.quantity_installed) as quantity_installed,
    sum(coalesce(p.quantity_installed,0)*coalesce(p.unit_cost,0)) as installed_parts_cost_clp
  from windows w
  left join public.work_order_parts p
    on p.organization_id=w.organization_id
   and p.canonical_asset_id=w.canonical_asset_id
   and coalesce(p.installed_at,p.created_at)::date between w.window_start and w.window_end
  group by w.organization_id,w.canonical_asset_id
), availability as (
  select w.organization_id,w.canonical_asset_id,
    count(a.operating_date) as availability_days,
    sum(a.scheduled_minutes) as scheduled_minutes,
    sum(a.planned_downtime_minutes+a.unplanned_downtime_minutes) as availability_downtime_minutes
  from windows w
  left join canonical.asset_availability_daily a
    on a.organization_id=w.organization_id
   and a.canonical_asset_id=w.canonical_asset_id
   and a.operating_date between w.window_start and w.window_end
  group by w.organization_id,w.canonical_asset_id
)
select w.organization_id,w.canonical_asset_id,w.asset_code,w.asset_name,w.window_start,w.window_end,
  d.drilling_reports,d.out_of_service_reports,d.operational_with_observations_reports,d.operational_reports,d.invalid_status_reports,
  d.equipment_without_crew_reports,d.power_outage_reports,d.water_shortage_reports,d.install_disassembly_reports,d.scaling_reports,
  m.work_order_count,m.open_work_order_count,m.recorded_downtime_hours,m.external_cost_clp,
  p.part_line_count,p.quantity_installed,p.installed_parts_cost_clp,
  a.availability_days,a.scheduled_minutes,a.availability_downtime_minutes,
  case
    when coalesce(m.work_order_count,0)>0 or coalesce(p.part_line_count,0)>0 or coalesce(a.availability_days,0)>0 then 'maintenance_evidence_present'
    when coalesce(d.drilling_reports,0)>0 then 'source_operational_evidence_only'
    else 'insufficient_evidence'
  end as evidence_status
from windows w
left join drilling d using (organization_id,canonical_asset_id)
left join maintenance m using (organization_id,canonical_asset_id)
left join parts p using (organization_id,canonical_asset_id)
left join availability a using (organization_id,canonical_asset_id);