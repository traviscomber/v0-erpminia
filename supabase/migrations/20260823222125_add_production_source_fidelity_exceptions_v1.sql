create or replace view public.production_source_fidelity_exceptions_v1
with (security_invoker=true)
as
select r.organization_id,'drilling'::text domain,'missing_hole_code'::text exception_type,
       r.source_file,r.source_sheet,r.source_row,r.operation_date event_date,null::text reference_code,
       'Fila fuente sin código Pozo; se preserva sin vínculo operacional.'::text description,r.source_values source_payload
from public.production_drilling_source_reports r
where nullif(trim(r.hole_code_raw),'') is null
union all
select h.organization_id,'drilling','hole_without_valid_mine',h.source_reference,'BaseDatos',null::integer,h.start_at::date,h.hole_code,
       'Pozo materializado, pero la fuente no aporta una única Mina válida; no se infiere ubicación.',
       jsonb_build_object('hole_code',h.hole_code,'start_at',h.start_at,'completed_at',h.completed_at)
from public.production_drill_holes h
where h.source_type='source_report' and h.mine_source_id is null
union all
select f.organization_id,'fine_copper','no_assay',f.source_file,f.source_sheet,f.source_row,f.operation_date,
       concat_ws('/',f.operation_date::text,f.shift_code),
       'La fuente no permite calcular fino recuperado determinístico; no se rellena ni estima.',
       jsonb_build_object('shift',f.shift_code,'treated_wet_metric_tons',f.treated_wet_metric_tons,'mineral_dry_metric_tons',f.mineral_dry_metric_tons,'head_grade_pct',f.head_grade_pct,'recovery_pct',f.recovery_pct)
from public.production_fine_copper_v1 f
where f.fine_state='no_assay'
union all
select s.organization_id,'concentrate_dispatch','shipment_review',s.source_file,s.source_sheet,s.source_row,s.shipment_date,s.shipment_number,
       coalesce(s.validation_notes,'Despacho marcado para revisión por información fuente incompleta.'),s.source_payload
from public.production_concentrate_shipments s
where s.validation_status='review'
union all
select e.organization_id,'maintenance',e.exception_type,e.source_filename,e.source_sheet,e.source_row,null::date,
       coalesce(e.asset_label,e.title),coalesce(e.reason,'Excepción preservada desde la fuente.'),e.source_payload
from public.maintenance_source_exceptions e
where e.source_filename='Mantención Sondajes - copia.xlsx';

revoke all on public.production_source_fidelity_exceptions_v1 from public,anon,authenticated;
grant select on public.production_source_fidelity_exceptions_v1 to service_role;
