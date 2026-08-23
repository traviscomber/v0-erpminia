create or replace function public.import_motil_drilling_compact_v1(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public','extensions','pg_temp'
as $function$
declare
  n integer;
  b_id uuid;
  org_id constant uuid := '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid;
  src_file constant text := 'Reporte_Sondajes_I_A.xlsx';
  src_sha constant text := '890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50';
begin
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be array'; end if;

  select id into b_id
  from public.production_import_batches
  where organization_id=org_id
    and source_file=src_file
    and source_file_sha256=src_sha
  order by created_at desc
  limit 1;

  if b_id is null then raise exception 'canonical drilling batch not authorized'; end if;
  n := jsonb_array_length(p_rows);

  insert into public.production_drilling_source_reports(
    organization_id,import_batch_id,source_file,source_file_sha256,source_sheet,source_row,source_record_id,operation_date,
    hole_code_raw,rig_name_raw,site_raw,shift_code_raw,operator_name_raw,assistant_1_raw,assistant_2_raw,diameter_raw,location_raw,inclination_raw,
    meter_initial,meter_final,drilled_meters,box_count,install_disassembly_raw,equipment_without_crew_raw,power_outage_raw,scaling_raw,water_shortage_raw,
    machine_observations,drilling_observations,equipment_status_raw,mine_raw,sector_raw,final_trays,row_hash,source_values,source_schema_version
  )
  select
    org_id,b_id,src_file,src_sha,'BaseDatos',(e->>0)::integer,btrim(e->>1),(e->>2)::timestamp::date,
    nullif(e->>4,''),nullif(e->>5,''),nullif(e->>6,''),nullif(e->>7,''),nullif(e->>8,''),nullif(e->>9,''),nullif(e->>10,''),nullif(e->>11,''),nullif(e->>12,''),nullif(e->>13,''),
    nullif(e->>14,'')::numeric,nullif(e->>15,'')::numeric,nullif(e->>16,'')::numeric,nullif(e->>17,'')::numeric,
    nullif(e->>26,''),nullif(e->>27,''),nullif(e->>28,''),nullif(e->>29,''),nullif(e->>30,''),nullif(e->>31,''),nullif(e->>32,''),nullif(e->>33,''),nullif(e->>35,''),nullif(e->>36,''),nullif(e->>37,'')::numeric,
    encode(extensions.digest(jsonb_build_array(src_sha,e)::text,'sha256'),'hex'),
    jsonb_build_object(
      'ID',e->1,'Fecha Inicio',e->2,'Información',e->3,'Pozo',e->4,'Equipo',e->5,'Faena',e->6,'Turno',e->7,'Operador',e->8,
      'Ayudante',e->9,'Ayudante2',e->10,'Diametro',e->11,'Ubicación',e->12,'Inclinación',e->13,'Metro Inicial',e->14,'Metro Final',e->15,
      'Metros Perforados',e->16,'Cantidad Cajas',e->17,'Checklist',e->18,'Revise el estado de:',e->19,'1. Marque si presenta falla',e->20,
      '2. Marque si presenta falla',e->21,'3. Marque si presenta falla',e->22,'4. Marque si presenta falla',e->23,'Observaciones',e->24,'Operación',e->25,
      'Instalación/Desarme',e->26,'Equipo sin operador/Ayudante',e->27,'Falta Electricidad',e->28,'Acuñadura',e->29,'Falta de Agua',e->30,
      'Observaciones Máquina',e->31,'Observaciones Perforación',e->32,'Estado Equipo',e->33,'Firma Operador',e->34,'Mina',e->35,'Sector',e->36,
      'Total Bandejas Postura Final Turno',e->37,'_source_row',e->0,'_source_file',src_file,'_source_sha256',src_sha
    ),
    'reporte_sondajes_base_datos_v1'
  from jsonb_array_elements(p_rows) e
  where nullif(btrim(e->>1),'') is not null
  on conflict(organization_id,source_file_sha256,source_record_id) do update set
    import_batch_id=excluded.import_batch_id,
    source_file=excluded.source_file,
    source_sheet=excluded.source_sheet,
    source_row=excluded.source_row,
    operation_date=excluded.operation_date,
    hole_code_raw=excluded.hole_code_raw,
    rig_name_raw=excluded.rig_name_raw,
    site_raw=excluded.site_raw,
    shift_code_raw=excluded.shift_code_raw,
    operator_name_raw=excluded.operator_name_raw,
    assistant_1_raw=excluded.assistant_1_raw,
    assistant_2_raw=excluded.assistant_2_raw,
    diameter_raw=excluded.diameter_raw,
    location_raw=excluded.location_raw,
    inclination_raw=excluded.inclination_raw,
    meter_initial=excluded.meter_initial,
    meter_final=excluded.meter_final,
    drilled_meters=excluded.drilled_meters,
    box_count=excluded.box_count,
    install_disassembly_raw=excluded.install_disassembly_raw,
    equipment_without_crew_raw=excluded.equipment_without_crew_raw,
    power_outage_raw=excluded.power_outage_raw,
    scaling_raw=excluded.scaling_raw,
    water_shortage_raw=excluded.water_shortage_raw,
    machine_observations=excluded.machine_observations,
    drilling_observations=excluded.drilling_observations,
    equipment_status_raw=excluded.equipment_status_raw,
    mine_raw=excluded.mine_raw,
    sector_raw=excluded.sector_raw,
    final_trays=excluded.final_trays,
    row_hash=excluded.row_hash,
    source_values=excluded.source_values,
    source_schema_version=excluded.source_schema_version;

  return n;
end
$function$;

revoke all on function public.import_motil_drilling_compact_v1(jsonb) from public, anon, authenticated;
