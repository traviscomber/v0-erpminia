-- Motil canonical Production import helpers
-- Client-owned operational data is never embedded in this repository.
-- These helpers accept only rows whose source filename + SHA already exist
-- in production_import_batches for the Motil production domain.

CREATE OR REPLACE FUNCTION public.import_motil_movement_arrays(p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  n integer;
  a integer;
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'rows must be array';
  END IF;

  n := jsonb_array_length(p_rows);

  SELECT count(*) INTO a
  FROM jsonb_array_elements(p_rows) e
  JOIN public.production_import_batches b
    ON b.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
   AND b.project_key = 'motil'
   AND b.domain_key = 'production'
   AND b.source_file = e->>15
   AND b.source_file_sha256 = e->>18;

  IF a <> n THEN
    RAISE EXCEPTION 'unauthorized movement source rows: % of % authorized', a, n;
  END IF;

  INSERT INTO public.production_material_movements(
    organization_id, import_batch_id, movement_number, movement_date,
    mine_name_raw, sector_name_raw, driver_name_raw, carrier_name_raw,
    vehicle_plate_raw, seal_number, raw_quantity, raw_unit,
    normalized_metric_tons, normalization_status, normalization_rule,
    source_file, source_sheet, source_row, source_hash, source_payload,
    validation_status, validation_notes, client_name_raw,
    movement_description_raw, interior_mine_raw, debt_status_raw,
    material_classification, source_schema_version, adapter_version
  )
  SELECT
    '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid,
    b.id,
    nullif(e->>0,''),
    (e->>1)::date,
    nullif(e->>8,''),
    nullif(e->>7,''),
    nullif(e->>4,''),
    nullif(e->>5,''),
    nullif(e->>6,''),
    nullif(e->>10,''),
    nullif(e->>11,'')::numeric,
    nullif(e->>13,''),
    nullif(e->>14,'')::numeric,
    'approved',
    'TM_SCALE_2019_2026_V1',
    e->>15,
    e->>16,
    (e->>17)::integer,
    encode(extensions.digest(concat_ws('|', e->>18, e->>16, e->>17, e->>0, e->>1, e->>11), 'sha256'), 'hex'),
    jsonb_build_object(
      'NUMERO',e->0,'FECHA',e->1,'CLIENTE',e->2,'DESCRIPCION',e->3,
      'CONDUCTOR',e->4,'EMPRESA TRANSPORTISTA',e->5,'PATENTE',e->6,
      'SECTOR',e->7,'MINA ORIGEN',e->8,'INTERIOR MINA',e->9,
      'NUMERO DE SELLO',e->10,'TONELAJE NETO',e->11,'DEUDA',e->12,
      'UNIDAD ORIGEN',e->13,'TONELADAS NORMALIZADAS',e->14,
      'ARCHIVO ORIGEN',e->15,'HOJA ORIGEN',e->16,'FILA ORIGEN',e->17,
      'SHA256 ARCHIVO',e->18,'SCHEMA ORIGEN',e->19,'ADAPTER VERSION',e->20
    ),
    'valid',
    null,
    nullif(e->>2,''),
    nullif(e->>3,''),
    nullif(e->>9,''),
    nullif(e->>12,''),
    CASE
      WHEN upper(coalesce(e->>3,'')) LIKE '%ESTERIL%' OR upper(coalesce(e->>3,'')) LIKE '%ESTÉRIL%' THEN 'sterile'
      WHEN upper(coalesce(e->>3,'')) LIKE '%CENIZA%' THEN 'ash'
      WHEN upper(coalesce(e->>3,'')) LIKE '%MINERAL%' THEN 'process_mineral'
      ELSE 'unclassified'
    END,
    nullif(e->>19,''),
    nullif(e->>20,'')
  FROM jsonb_array_elements(p_rows) e
  JOIN public.production_import_batches b
    ON b.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
   AND b.source_file = e->>15
   AND b.source_file_sha256 = e->>18
  ON CONFLICT (organization_id, source_hash) DO UPDATE SET
    movement_number = excluded.movement_number,
    movement_date = excluded.movement_date,
    mine_name_raw = excluded.mine_name_raw,
    sector_name_raw = excluded.sector_name_raw,
    driver_name_raw = excluded.driver_name_raw,
    carrier_name_raw = excluded.carrier_name_raw,
    vehicle_plate_raw = excluded.vehicle_plate_raw,
    seal_number = excluded.seal_number,
    raw_quantity = excluded.raw_quantity,
    raw_unit = excluded.raw_unit,
    normalized_metric_tons = excluded.normalized_metric_tons,
    source_payload = excluded.source_payload,
    validation_status = excluded.validation_status,
    client_name_raw = excluded.client_name_raw,
    movement_description_raw = excluded.movement_description_raw,
    interior_mine_raw = excluded.interior_mine_raw,
    debt_status_raw = excluded.debt_status_raw,
    material_classification = excluded.material_classification,
    source_schema_version = excluded.source_schema_version,
    adapter_version = excluded.adapter_version,
    updated_at = now();

  RETURN n;
END
$function$;

CREATE OR REPLACE FUNCTION public.import_motil_plant_arrays(p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  n integer;
  a integer;
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'rows must be array';
  END IF;

  n := jsonb_array_length(p_rows);

  SELECT count(*) INTO a
  FROM jsonb_array_elements(p_rows) e
  JOIN public.production_import_batches b
    ON b.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
   AND b.project_key = 'motil'
   AND b.domain_key = 'production'
   AND b.source_file = e->>26
   AND b.source_file_sha256 = e->>29;

  IF a <> n THEN
    RAISE EXCEPTION 'unauthorized plant source rows: % of % authorized', a, n;
  END IF;

  INSERT INTO public.production_plant_shifts(
    organization_id, import_batch_id, operation_date, shift_code,
    raw_treated_quantity, raw_treated_unit, treated_metric_tons,
    normalization_status, normalization_rule, source_file, source_sheet,
    source_row, source_hash, source_payload, validation_status,
    validation_notes, humidity_factor, lot_number_raw, blend_code_raw,
    source_schema_version, adapter_version, mineral_moisture_pct
  )
  SELECT
    '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid,
    b.id,
    (e->>0)::date,
    e->>1,
    nullif(e->>4,'')::numeric,
    't',
    nullif(e->>4,'')::numeric,
    'approved',
    'PLANT_TONNES_V1',
    e->>26,
    e->>27,
    (e->>28)::integer,
    encode(extensions.digest(concat_ws('|', e->>29, e->>27, e->>28, e->>0, e->>1), 'sha256'), 'hex'),
    jsonb_build_object(
      'FECHA',e->0,'TURNO',e->1,'DRY FACTOR REPORTADO',e->2,
      'HUMEDAD MINERAL %',e->3,'MINERAL HUMEDO t',e->4,'MINERAL SECO t',e->5,
      'LEY CABEZA %',e->6,'LEY GALIGHER %',e->7,'LEY CONCENTRADO %',e->8,
      'LEY RELAVE %',e->9,'RECUPERACION REPORTADA %',e->10,
      'RECUPERACION CALCULADA %',e->11,'FINO TRATADO REPORTADO t',e->12,
      'FINO ALIMENTACION CALCULADO t',e->13,'LOTE',e->14,
      'HUMEDAD CONCENTRADO %',e->15,'LEY DESPACHO %',e->16,
      'DESPACHO HUMEDO t',e->17,'DESPACHO SECO t',e->18,
      'FINO DESPACHADO REPORTADO t',e->19,'FINO DESPACHADO CALCULADO t',e->20,
      'FINO ALIMENTACION ACUM t',e->21,'FINO DESPACHADO ACUM t',e->22,
      'ESTADO CALCULO',e->23,'FUENTES DISPONIBLES',e->24,'ESTADO FUENTE',e->25,
      'ARCHIVO ORIGEN',e->26,'HOJA ORIGEN',e->27,'FILA ORIGEN',e->28,
      'SHA256 ARCHIVO',e->29,'SCHEMA ORIGEN',e->30
    ),
    CASE WHEN nullif(e->>4,'') IS NULL THEN 'review' ELSE 'valid' END,
    CASE WHEN nullif(e->>6,'') IS NULL OR nullif(e->>8,'') IS NULL OR nullif(e->>9,'') IS NULL
      THEN 'Partial source row: tonnage/shift retained; missing grade inputs are not interpreted as zero.' ELSE null END,
    nullif(e->>2,'')::numeric,
    nullif(e->>14,''),
    null,
    nullif(e->>30,''),
    'plant_master_adapter_v1',
    nullif(e->>3,'')::numeric
  FROM jsonb_array_elements(p_rows) e
  JOIN public.production_import_batches b
    ON b.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
   AND b.source_file = e->>26
   AND b.source_file_sha256 = e->>29
  ON CONFLICT (organization_id, source_hash) DO UPDATE SET
    operation_date = excluded.operation_date,
    shift_code = excluded.shift_code,
    raw_treated_quantity = excluded.raw_treated_quantity,
    treated_metric_tons = excluded.treated_metric_tons,
    source_payload = excluded.source_payload,
    validation_status = excluded.validation_status,
    validation_notes = excluded.validation_notes,
    humidity_factor = excluded.humidity_factor,
    lot_number_raw = excluded.lot_number_raw,
    source_schema_version = excluded.source_schema_version,
    mineral_moisture_pct = excluded.mineral_moisture_pct,
    updated_at = now();

  INSERT INTO public.production_metallurgy_results(
    organization_id, plant_shift_id, head_grade, concentrate_grade,
    tailings_grade, recovery_reported, recovery_calculated,
    fine_metal_reported, fine_metal_calculated, concentrate_quantity,
    concentrate_quantity_unit, analysis_status, calculation_rule_version,
    source_file, source_sheet, source_row, source_hash, source_payload,
    validation_status, validation_notes, dispatch_moisture, dispatch_grade,
    dispatched_quantity_raw, dispatched_quantity_unit, galigher_grade,
    dispatched_metric_tons, concentrate_wet_metric_tons,
    concentrate_moisture_pct
  )
  SELECT
    '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid,
    s.id,
    nullif(e->>6,'')::numeric,
    nullif(e->>8,'')::numeric,
    nullif(e->>9,'')::numeric,
    nullif(e->>10,'')::numeric,
    CASE
      WHEN nullif(e->>6,'') IS NOT NULL AND nullif(e->>8,'') IS NOT NULL AND nullif(e->>9,'') IS NOT NULL
       AND (e->>6)::numeric <> 0 AND (e->>8)::numeric <> (e->>9)::numeric
      THEN (((e->>6)::numeric-(e->>9)::numeric)*(e->>8)::numeric)
         / (((e->>8)::numeric-(e->>9)::numeric)*(e->>6)::numeric) * 100
      ELSE null
    END,
    nullif(e->>12,'')::numeric,
    CASE
      WHEN nullif(e->>4,'') IS NOT NULL AND nullif(e->>3,'') IS NOT NULL AND nullif(e->>6,'') IS NOT NULL
      THEN (e->>4)::numeric * (1-(e->>3)::numeric/100) * (e->>6)::numeric/100
      ELSE null
    END,
    null,
    null,
    CASE WHEN nullif(e->>6,'') IS NULL OR nullif(e->>8,'') IS NULL OR nullif(e->>9,'') IS NULL THEN 'partial' ELSE 'calculated' END,
    'v2',
    e->>26,
    e->>27,
    (e->>28)::integer,
    encode(extensions.digest('MET|' || encode(extensions.digest(concat_ws('|', e->>29, e->>27, e->>28, e->>0, e->>1), 'sha256'), 'hex'), 'sha256'), 'hex'),
    jsonb_build_object(
      'FECHA',e->0,'TURNO',e->1,'DRY FACTOR REPORTADO',e->2,
      'HUMEDAD MINERAL %',e->3,'MINERAL HUMEDO t',e->4,'MINERAL SECO t',e->5,
      'LEY CABEZA %',e->6,'LEY GALIGHER %',e->7,'LEY CONCENTRADO %',e->8,
      'LEY RELAVE %',e->9,'RECUPERACION REPORTADA %',e->10,
      'RECUPERACION_CALCULADA_XLS',e->11,'FINO TRATADO REPORTADO t',e->12,
      'FINO ALIMENTACION CALCULADO_XLS',e->13,'LOTE',e->14,
      'HUMEDAD CONCENTRADO %',e->15,'LEY DESPACHO %',e->16,
      'DESPACHO HUMEDO t',e->17,'DESPACHO SECO t',e->18,
      'FINO DESPACHADO REPORTADO t',e->19,'FINO DESPACHADO CALCULADO_XLS',e->20,
      'FINO ALIMENTACION ACUM t',e->21,'FINO DESPACHADO ACUM t',e->22,
      'ESTADO CALCULO',e->23,'FUENTES DISPONIBLES',e->24,'ESTADO FUENTE',e->25,
      'ARCHIVO ORIGEN',e->26,'HOJA ORIGEN',e->27,'FILA ORIGEN',e->28,
      'SHA256 ARCHIVO',e->29,'SCHEMA ORIGEN',e->30
    ),
    CASE WHEN nullif(e->>4,'') IS NULL THEN 'review' ELSE 'valid' END,
    CASE WHEN nullif(e->>6,'') IS NULL OR nullif(e->>8,'') IS NULL OR nullif(e->>9,'') IS NULL
      THEN 'Partial metallurgy: missing grades retained as NULL, never zero.' ELSE null END,
    nullif(e->>15,'')::numeric,
    nullif(e->>16,'')::numeric,
    nullif(e->>17,'')::numeric,
    't',
    nullif(e->>7,'')::numeric,
    nullif(e->>18,'')::numeric,
    null,
    nullif(e->>15,'')::numeric
  FROM jsonb_array_elements(p_rows) e
  JOIN public.production_plant_shifts s
    ON s.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
   AND s.source_hash = encode(extensions.digest(concat_ws('|', e->>29, e->>27, e->>28, e->>0, e->>1), 'sha256'), 'hex')
  ON CONFLICT (organization_id, source_hash) DO UPDATE SET
    plant_shift_id = excluded.plant_shift_id,
    head_grade = excluded.head_grade,
    concentrate_grade = excluded.concentrate_grade,
    tailings_grade = excluded.tailings_grade,
    recovery_reported = excluded.recovery_reported,
    recovery_calculated = excluded.recovery_calculated,
    fine_metal_reported = excluded.fine_metal_reported,
    fine_metal_calculated = excluded.fine_metal_calculated,
    analysis_status = excluded.analysis_status,
    source_payload = excluded.source_payload,
    validation_status = excluded.validation_status,
    validation_notes = excluded.validation_notes,
    dispatch_moisture = excluded.dispatch_moisture,
    dispatch_grade = excluded.dispatch_grade,
    dispatched_quantity_raw = excluded.dispatched_quantity_raw,
    galigher_grade = excluded.galigher_grade,
    dispatched_metric_tons = excluded.dispatched_metric_tons,
    concentrate_moisture_pct = excluded.concentrate_moisture_pct,
    updated_at = now();

  RETURN n;
END
$function$;

REVOKE ALL ON FUNCTION public.import_motil_movement_arrays(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_motil_movement_arrays(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_motil_movement_arrays(jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.import_motil_plant_arrays(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_motil_plant_arrays(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_motil_plant_arrays(jsonb) TO service_role;
