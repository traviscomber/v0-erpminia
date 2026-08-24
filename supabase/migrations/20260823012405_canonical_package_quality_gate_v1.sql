-- Canonical package quality gate for the client-confirmed production source package.
-- Every metric is deterministic and remains HOLD until source->DB reconciliation is exact.

update public.production_source_documents
set notes = case source_file
  when 'Reporte_Sondajes_I_A.xlsx' then 'BaseDatos es fuente canónica granular de sondajes. Universo auditado: 4.693 IDs únicos válidos + 1 fila real sin ID (fila 2655, excepción explícita); 205 filas finales vacías excluidas. Dashboards y fórmulas del workbook son derivados. Confirmed by client as canonical production package 2026-08-22.'
  when 'Mantención Sondajes - copia.xlsx' then 'Fuente canónica de mantenimiento de sondas. Contiene 28 pautas preventivas y 64 intervenciones históricas; 59 intervenciones tienen fecha válida y 5 conservan fecha corrupta como excepción explícita. Confirmed by client as canonical production package 2026-08-22.'
  when 'LEY (1).xlsx' then 'Fuente canónica vigente para metalurgia y despachos de concentrado del período recibido. Agosto 01-18: 36 turnos con ensayo y 14 despachos materializados; valores fuente y excepciones se preservan sin estimación silenciosa. Confirmed by client as canonical production package 2026-08-22.'
  else notes
end
where organization_id='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
  and source_file in ('Reporte_Sondajes_I_A.xlsx','Mantención Sondajes - copia.xlsx','LEY (1).xlsx');

insert into public.maintenance_source_exceptions (
  organization_id,source_filename,source_sheet,source_row,asset_label,title,raw_date,
  exception_type,reason,source_payload,review_status
)
select
  '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid,
  'Reporte_Sondajes_I_A.xlsx','BaseDatos',2655,'DIAMEC 232-2008',
  'Sondaje DP25-18 sin ID fuente','2025-07-01','incomplete_source',
  'Fila no vacía con ID fuente compuesto sólo por espacio. Se preserva como excepción y no se genera ID artificial.',
  jsonb_build_object(
    'ID',' ','Fecha Inicio','2025-07-01T00:00:00','Pozo','DP25-18','Equipo','DIAMEC 232-2008',
    'Turno','Turno A','Operador','MAURICIO CEPEDA','Ayudante','RAFAEL VILCHES','Diametro','TT 46',
    'Ubicación','Interior Mina','Metro Inicial',71.6,'Metro Final',97.5,'Metros Perforados',25.9,
    'Observaciones','Queda resta de 1.10 mts','Instalación/Desarme','No','Equipo sin operador/Ayudante','No',
    'Falta Electricidad','No','Acuñadura','No','Falta de Agua','No','Observaciones Máquina','Operativa',
    'Observaciones Perforación','Roca bloqueadora y con mineralización','Estado Equipo','OPERATIVO',
    'Mina','PEUMO','Sector','597 SUR','_source_row',2655,'_source_file','Reporte_Sondajes_I_A.xlsx',
    '_source_sha256','890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50'
  ),
  'pending'
where not exists (
  select 1 from public.maintenance_source_exceptions
  where organization_id='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
    and source_filename='Reporte_Sondajes_I_A.xlsx'
    and source_sheet='BaseDatos'
    and source_row=2655
);

create or replace view public.production_canonical_package_quality_v1
with (security_invoker=true) as
with constants as (
  select '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid organization_id
), checks as (
  select c.organization_id,'sondajes_valid_ids'::text check_key,4693::numeric expected_value,
         (select count(distinct source_record_id)::numeric from public.production_drilling_source_reports r where r.organization_id=c.organization_id and nullif(btrim(source_record_id),'') is not null) actual_value,
         'rows'::text unit,'Reporte_Sondajes_I_A.xlsx / BaseDatos'::text source_scope
  from constants c
  union all
  select c.organization_id,'sondajes_missing_id_exception',1,
         (select count(*)::numeric from public.maintenance_source_exceptions e where e.organization_id=c.organization_id and e.source_filename='Reporte_Sondajes_I_A.xlsx' and e.source_row=2655 and e.exception_type='incomplete_source'),
         'rows','Reporte_Sondajes_I_A.xlsx / BaseDatos' from constants c
  union all
  select c.organization_id,'maintenance_preventive_schedules',28,
         (select count(*)::numeric from public.maintenance_drilling_source_schedules s where s.organization_id=c.organization_id),
         'rows','Mantención Sondajes - copia.xlsx' from constants c
  union all
  select c.organization_id,'maintenance_history_accounted',64,
         ((select count(*)::numeric from public.maintenance_expedient_records r where r.organization_id=c.organization_id and r.source_filename='Mantención Sondajes - copia.xlsx') +
          (select count(*)::numeric from public.maintenance_source_exceptions e where e.organization_id=c.organization_id and e.source_filename='Mantención Sondajes - copia.xlsx')),
         'rows','Mantención Sondajes - copia.xlsx' from constants c
  union all
  select c.organization_id,'metallurgy_aug_01_18_shifts',36,
         (select count(*)::numeric from public.production_plant_shifts s where s.organization_id=c.organization_id and s.operation_date between '2026-08-01' and '2026-08-18'),
         'rows','LEY (1).xlsx' from constants c
  union all
  select c.organization_id,'metallurgy_aug_01_18_assays',36,
         (select count(*)::numeric from public.production_metallurgy_results r join public.production_plant_shifts s on s.id=r.plant_shift_id where r.organization_id=c.organization_id and s.operation_date between '2026-08-01' and '2026-08-18' and r.head_grade is not null),
         'rows','LEY (1).xlsx' from constants c
  union all
  select c.organization_id,'concentrate_aug_01_18_shipments',14,
         (select count(*)::numeric from public.production_concentrate_shipments s where s.organization_id=c.organization_id and s.shipment_date between '2026-08-01' and '2026-08-18'),
         'rows','LEY (1).xlsx' from constants c
  union all
  select c.organization_id,'august_plan_total_tons',13000,
         (select coalesce(max(p.total_mineral_to_plant_tons),0)::numeric from public.production_monthly_plans p where p.organization_id=c.organization_id and p.period_start='2026-08-01'),
         't','PROGRAMA DE PRODUCCION AGOSTO 2026.pdf' from constants c
  union all
  select c.organization_id,'august_plan_cu_content',182.10,
         (select coalesce(sum(l.planned_fine_cu),0)::numeric from public.production_monthly_plan_lines l join public.production_monthly_plans p on p.id=l.plan_id where l.organization_id=c.organization_id and p.period_start='2026-08-01' and l.line_type in ('chamber','preparation')),
         't Cu','PROGRAMA DE PRODUCCION AGOSTO 2026.pdf' from constants c
  union all
  select c.organization_id,'august_plan_radial_drilling',2396,
         (select coalesce(sum(l.planned_drilling_m),0)::numeric from public.production_monthly_plan_lines l join public.production_monthly_plans p on p.id=l.plan_id where l.organization_id=c.organization_id and p.period_start='2026-08-01' and l.line_type='radial_drilling'),
         'm','PROGRAMA DE PRODUCCION AGOSTO 2026.pdf' from constants c
)
select organization_id,check_key,expected_value,actual_value,unit,source_scope,
       case when actual_value=expected_value then 'PASS' else 'HOLD' end status,
       actual_value-expected_value delta
from checks;

revoke all on public.production_canonical_package_quality_v1 from anon,authenticated;
grant select on public.production_canonical_package_quality_v1 to service_role;
