-- Production normalization closure: preserve source values, normalize only deterministic identities,
-- and classify every unresolved source anomaly instead of imputing values.

update production_drilling_source_reports
set reconciliation_status='promoted',
    reconciliation_notes=case
      when canonical_mine_source_id is not null and canonical_mine_sector_id is not null then 'Pozo, Mina y Sector promovidos desde evidencia explícita del workbook canónico; valores RAW preservados.'
      when canonical_mine_source_id is not null then 'Pozo y Mina promovidos desde evidencia explícita; Sector no acreditado por la fuente y permanece NULL.'
      else 'Pozo promovido por igualdad exacta de hole_code_raw; Mina/Sector no acreditados por la fuente y permanecen sin inferencia.'
    end
where canonical_drill_hole_id is not null;

create or replace view production_normalization_exceptions_v1 as
select organization_id, domain, exception_type, source_file, source_sheet, source_row, event_date, reference_code, description, source_payload
from production_source_fidelity_exceptions_v1
union all
select m.organization_id,'movements'::text,
       case when m.normalization_status='pending' then 'unit_or_scale_unresolved' else 'semantic_source_review' end,
       m.source_file,m.source_sheet,m.source_row,m.movement_date,m.movement_number,
       coalesce(m.validation_notes,'Movimiento marcado para revisión por anomalía de fuente.'),m.source_payload
from production_material_movements m where m.validation_status='review'
union all
select s.organization_id,'plant_shift'::text,'partial_source_row'::text,
       s.source_file,s.source_sheet,s.source_row,s.operation_date,concat_ws('/',s.operation_date::text,s.shift_code),
       coalesce(s.validation_notes,'Turno parcial preservado sin imputación.'),s.source_payload
from production_plant_shifts s where s.validation_status='review'
union all
select r.organization_id,'metallurgy'::text,'partial_metallurgy'::text,
       r.source_file,r.source_sheet,r.source_row,s.operation_date,concat_ws('/',s.operation_date::text,s.shift_code),
       coalesce(r.validation_notes,'Resultado metalúrgico parcial preservado sin imputación.'),r.source_payload
from production_metallurgy_results r join production_plant_shifts s on s.id=r.plant_shift_id
where r.validation_status='review';

create or replace view production_transport_identity_resolution_v1 as
with driver_rows as (
 select organization_id,driver_name_raw raw_value,regexp_replace(lower(trim(driver_name_raw)),'\s+',' ','g') normalized_key,driver_profile_id canonical_id
 from production_material_movements where nullif(trim(driver_name_raw),'') is not null
), carrier_rows as (
 select organization_id,carrier_name_raw raw_value,regexp_replace(lower(trim(carrier_name_raw)),'\s+',' ','g') normalized_key,carrier_supplier_id canonical_id
 from production_material_movements where nullif(trim(carrier_name_raw),'') is not null
), vehicle_rows as (
 select organization_id,vehicle_plate_raw raw_value,upper(regexp_replace(vehicle_plate_raw,'[^A-Za-z0-9]','','g')) normalized_key,vehicle_asset_id canonical_id
 from production_material_movements where nullif(trim(vehicle_plate_raw),'') is not null
), u as (
 select 'driver'::text entity_type,* from driver_rows
 union all select 'carrier',* from carrier_rows
 union all select 'vehicle',* from vehicle_rows
)
select organization_id,entity_type,normalized_key,min(raw_value) example_raw_value,count(*) movement_rows,
       count(distinct raw_value) raw_variants,count(distinct canonical_id) canonical_target_count,
       (array_agg(distinct canonical_id) filter(where canonical_id is not null))[1] canonical_id,
       case when count(distinct canonical_id)=1 then 'canonical_linked' else 'source_normalized' end resolution_state
from u group by organization_id,entity_type,normalized_key;

create or replace view production_transport_identity_quality_v1 as
with expected as (
 select 'driver'::text entity_type,count(distinct regexp_replace(lower(trim(driver_name_raw)),'\s+',' ','g'))::bigint expected_count from production_material_movements where nullif(trim(driver_name_raw),'') is not null
 union all select 'carrier',count(distinct regexp_replace(lower(trim(carrier_name_raw)),'\s+',' ','g')) from production_material_movements where nullif(trim(carrier_name_raw),'') is not null
 union all select 'vehicle',count(distinct upper(regexp_replace(vehicle_plate_raw,'[^A-Za-z0-9]','','g'))) from production_material_movements where nullif(trim(vehicle_plate_raw),'') is not null
), actual as (
 select entity_type,count(*)::bigint actual_count,count(*) filter(where canonical_target_count>1)::bigint conflicts from production_transport_identity_resolution_v1 group by entity_type
)
select e.entity_type,e.expected_count,a.actual_count,a.conflicts,case when e.expected_count=a.actual_count and a.conflicts=0 then 'PASS' else 'HOLD' end status
from expected e join actual a using(entity_type);

create or replace view production_master_normalization_quality_v1 as
with checks as (
 select 'canonical_package'::text check_key,0::bigint expected_value,count(*) filter(where status<>'PASS')::bigint actual_value from production_canonical_package_quality_v1
 union all select 'drilling_fidelity',0,count(*) filter(where status<>'PASS') from production_drilling_source_fidelity_v1
 union all select 'flow_fidelity',0,count(*) filter(where status<>'PASS') from production_flow_fidelity_quality_v1
 union all select 'concentrate_fidelity',0,count(*) filter(where status<>'PASS') from production_concentrate_fidelity_quality_v1
 union all select 'transport_identity_fidelity',0,count(*) filter(where status<>'PASS') from production_transport_identity_quality_v1
 union all select 'duplicate_source_keys',0,
   (select count(*) from (select source_file,source_sheet,source_row from production_material_movements group by 1,2,3 having count(*)>1) x)
 + (select count(*) from (select organization_id,operation_date,shift_code from production_plant_shifts group by 1,2,3 having count(*)>1) x)
 + (select count(*) from (select plant_shift_id from production_metallurgy_results group by 1 having count(*)>1) x)
 + (select count(*) from (select source_file,source_sheet,source_row from production_concentrate_shipments group by 1,2,3 having count(*)>1) x)
 + (select count(*) from (select source_file_sha256,source_sheet,source_row from production_drilling_source_reports group by 1,2,3 having count(*)>1) x)
 union all select 'approved_movements_without_tons',0,count(*) from production_material_movements where normalization_status='approved' and normalized_metric_tons is null
 union all select 'pending_movements_not_review',0,count(*) from production_material_movements where normalization_status='pending' and validation_status<>'review'
 union all select 'drilling_unaccounted_status',0,count(*) from production_drilling_source_reports where reconciliation_status not in ('promoted','staged')
 union all select 'drilling_total_rows',4693,count(*) from production_drilling_source_reports
 union all select 'operational_drill_holes',400,count(*) from production_drill_holes
 union all select 'sector_resolution_coverage',(select count(*) from production_mine_sectors),(select count(*) from production_mine_sector_resolution_v1)
 union all select 'sector_alias_conflicts',0,count(*) from (select sector_id from production_mine_sector_aliases where status='approved' group by sector_id having count(distinct canonical_sector_id)>1) x
 union all select 'sector_alias_unapproved',0,count(*) from production_mine_sector_aliases where status<>'approved'
)
select check_key,expected_value,actual_value,case when expected_value=actual_value then 'PASS' else 'HOLD' end status from checks;
