-- Extend the canonical package gate to cover all seven confirmed source documents.
create or replace view public.production_canonical_package_quality_v1
with (security_invoker=true) as
with constants as (
  select '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid organization_id
), checks as (
  select c.organization_id,'canonical_source_fingerprints'::text check_key,7::numeric expected_value,
         (select count(*)::numeric from public.production_source_documents d where d.organization_id=c.organization_id and (d.source_file,d.source_file_sha256) in (
           ('ESTADISTICAS DE PRODUCCION 31 DE JULIO 2026.xlsx','7f8fd25a3c17935ad8de62324e7b25df61f9b4067e8a6c843b074d260ce7b941'),
           ('Informe mensual Mina Don Jaime mes Julio 2026.xlsx','97b142e1fcc50b9eadf23d3ba26a4d2bbb8732050cef4551613a6fc4a37b6af0'),
           ('Informe mensual Mina Peumo mes Julio 2026.xlsx','17e69b147e89660210d27de1a977ea81bf0656d2239aef85e0dc0b43851e755d'),
           ('LEY (1).xlsx','befb1d0e09da8b79c50dc8ce6bda25735f2b7d5c4a67f343630dde3a25ebd40a'),
           ('Mantención Sondajes - copia.xlsx','6ecaa6cd63e8acc04d91a87e606681af8e6dfe02c2c14673d137fed4d87b6613'),
           ('PROGRAMA DE PRODUCCION AGOSTO 2026.pdf','4745e45f0840ec788f332ce7ac92ea3b060f563ed605a6601d7c857946676db7'),
           ('Reporte_Sondajes_I_A.xlsx','890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50')
         )) as actual_value,
         'files'::text unit,'Paquete canónico recibido'::text source_scope
  from constants c
  union all
  select c.organization_id,'july_peumo_tons',6027.12,
         (select coalesce(sum(m.normalized_metric_tons),0)::numeric from public.production_material_movements m left join public.production_mine_sources s on s.id=m.mine_source_id where m.organization_id=c.organization_id and m.movement_date between '2026-07-01' and '2026-07-31' and coalesce(s.name,m.mine_name_raw)='Mina Peumo'),
         't','Informe mensual Mina Peumo mes Julio 2026.xlsx' from constants c
  union all
  select c.organization_id,'july_don_jaime_tons',4531.66,
         (select coalesce(sum(m.normalized_metric_tons),0)::numeric from public.production_material_movements m left join public.production_mine_sources s on s.id=m.mine_source_id where m.organization_id=c.organization_id and m.movement_date between '2026-07-01' and '2026-07-31' and coalesce(s.name,m.mine_name_raw)='Mina Don Jaime'),
         't','Informe mensual Mina Don Jaime mes Julio 2026.xlsx' from constants c
  union all
  select c.organization_id,'july_total_tons',10558.78,
         (select coalesce(sum(m.normalized_metric_tons),0)::numeric from public.production_material_movements m where m.organization_id=c.organization_id and m.movement_date between '2026-07-01' and '2026-07-31' and m.mine_source_id in (select id from public.production_mine_sources where organization_id=c.organization_id and name in ('Mina Peumo','Mina Don Jaime'))),
         't','ESTADISTICAS + informes Peumo/Don Jaime' from constants c
  union all
  select c.organization_id,'sondajes_valid_ids',4693,
         (select count(distinct source_record_id)::numeric from public.production_drilling_source_reports r where r.organization_id=c.organization_id and nullif(btrim(source_record_id),'') is not null),
         'rows','Reporte_Sondajes_I_A.xlsx / BaseDatos' from constants c
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
