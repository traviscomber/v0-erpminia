create table if not exists public.production_source_sheet_registry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_file text not null,
  source_file_sha256 text not null,
  source_sheet text not null,
  sheet_index integer,
  handling text not null,
  domain text not null,
  row_level_materialized boolean not null default false,
  nonempty_rows integer,
  nonempty_cells integer,
  formula_cells integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_file_sha256, source_sheet)
);

create table if not exists public.production_source_normalized_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_file text not null,
  source_file_sha256 text not null,
  source_sheet text not null,
  source_row integer not null,
  domain text not null,
  record_type text not null,
  period_start date,
  mine_source_id uuid references public.production_mine_sources(id) on delete set null,
  entity_label text,
  semantic_status text not null,
  source_values jsonb not null default '{}'::jsonb,
  normalized_values jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_file_sha256, source_sheet, source_row, record_type)
);

alter table public.production_source_sheet_registry enable row level security;
alter table public.production_source_normalized_records enable row level security;
revoke all on public.production_source_sheet_registry from anon, authenticated;
revoke all on public.production_source_normalized_records from anon, authenticated;
grant all on public.production_source_sheet_registry to service_role;
grant all on public.production_source_normalized_records to service_role;

create or replace view public.production_source_sheet_coverage_quality_v1
with (security_invoker = true) as
with checks as (
  select 'canonical_source_files'::text check_key, 7::bigint expected_value,
         count(distinct source_file_sha256)::bigint actual_value
  from public.production_source_sheet_registry
  union all
  select 'source_sheet_registry',172,count(*) from public.production_source_sheet_registry
  union all
  select 'unclassified_source_sheets',0,count(*) from public.production_source_sheet_registry where handling is null or domain is null
  union all
  select 'supplemental_normalized_records',154,count(*) from public.production_source_normalized_records
  union all
  select 'supplemental_record_duplicate_keys',0,count(*) from (
    select source_file_sha256,source_sheet,source_row,record_type
    from public.production_source_normalized_records
    group by 1,2,3,4 having count(*)>1
  ) x
  union all
  select 'source_anomalies_classified',57,count(*) from public.production_source_normalized_records where semantic_status='source_anomaly'
  union all
  select 'reference_only_records_classified',14,count(*) from public.production_source_normalized_records where semantic_status='reference_only'
)
select check_key,expected_value,actual_value,
       case when expected_value=actual_value then 'PASS'::text else 'HOLD'::text end status
from checks;

create or replace view public.production_normalization_exceptions_v1
with (security_invoker = true) as
select organization_id,domain,exception_type,source_file,source_sheet,source_row,event_date,reference_code,description,source_payload
from public.production_source_fidelity_exceptions_v1
union all
select m.organization_id,'movements',case when m.normalization_status='pending' then 'unit_or_scale_unresolved' else 'semantic_source_review' end,
       m.source_file,m.source_sheet,m.source_row,m.movement_date,m.movement_number,
       coalesce(m.validation_notes,'Movimiento marcado para revisión por anomalía de fuente.'),m.source_payload
from public.production_material_movements m where m.validation_status='review'
union all
select s.organization_id,'plant_shift','partial_source_row',s.source_file,s.source_sheet,s.source_row,s.operation_date,
       concat_ws('/',s.operation_date::text,s.shift_code),coalesce(s.validation_notes,'Turno parcial preservado sin imputación.'),s.source_payload
from public.production_plant_shifts s where s.validation_status='review'
union all
select r.organization_id,'metallurgy','partial_metallurgy',r.source_file,r.source_sheet,r.source_row,s.operation_date,
       concat_ws('/',s.operation_date::text,s.shift_code),coalesce(r.validation_notes,'Resultado metalúrgico parcial preservado sin imputación.'),r.source_payload
from public.production_metallurgy_results r join public.production_plant_shifts s on s.id=r.plant_shift_id
where r.validation_status='review'
union all
select n.organization_id,n.domain,'supplemental_source_anomaly',n.source_file,n.source_sheet,n.source_row,n.period_start,n.entity_label,
       coalesce(n.notes,'Anomalía preservada desde hoja complementaria; no se promueve a hecho canónico.'),
       jsonb_build_object('source_values',n.source_values,'normalized_values',n.normalized_values,'record_type',n.record_type)
from public.production_source_normalized_records n where n.semantic_status='source_anomaly';

create or replace view public.production_master_normalization_quality_v1
with (security_invoker = true) as
with checks as (
  select 'canonical_package'::text check_key,0::bigint expected_value,count(*) filter(where status<>'PASS')::bigint actual_value from public.production_canonical_package_quality_v1
  union all select 'drilling_fidelity',0,count(*) filter(where status<>'PASS') from public.production_drilling_source_fidelity_v1
  union all select 'flow_fidelity',0,count(*) filter(where status<>'PASS') from public.production_flow_fidelity_quality_v1
  union all select 'concentrate_fidelity',0,count(*) filter(where status<>'PASS') from public.production_concentrate_fidelity_quality_v1
  union all select 'transport_identity_fidelity',0,count(*) filter(where status<>'PASS') from public.production_transport_identity_quality_v1
  union all select 'source_sheet_coverage',0,count(*) filter(where status<>'PASS') from public.production_source_sheet_coverage_quality_v1
  union all select 'duplicate_source_keys',0,
    (select count(*) from (select source_file,source_sheet,source_row from public.production_material_movements group by 1,2,3 having count(*)>1)x)
    +(select count(*) from (select organization_id,operation_date,shift_code from public.production_plant_shifts group by 1,2,3 having count(*)>1)x)
    +(select count(*) from (select plant_shift_id from public.production_metallurgy_results group by 1 having count(*)>1)x)
    +(select count(*) from (select source_file,source_sheet,source_row from public.production_concentrate_shipments group by 1,2,3 having count(*)>1)x)
    +(select count(*) from (select source_file_sha256,source_sheet,source_row from public.production_drilling_source_reports group by 1,2,3 having count(*)>1)x)
  union all select 'approved_movements_without_tons',0,count(*) from public.production_material_movements where normalization_status='approved' and normalized_metric_tons is null
  union all select 'pending_movements_not_review',0,count(*) from public.production_material_movements where normalization_status='pending' and validation_status<>'review'
  union all select 'drilling_unaccounted_status',0,count(*) from public.production_drilling_source_reports where reconciliation_status<>all(array['promoted','staged'])
  union all select 'drilling_total_rows',4693,count(*) from public.production_drilling_source_reports
  union all select 'operational_drill_holes',400,count(*) from public.production_drill_holes
  union all select 'sector_resolution_coverage',(select count(*) from public.production_mine_sectors),(select count(*) from public.production_mine_sector_resolution_v1)
  union all select 'sector_alias_conflicts',0,count(*) from (
    select sector_id from public.production_mine_sector_aliases where status='approved' group by sector_id having count(distinct canonical_sector_id)>1
  ) x
  union all select 'sector_alias_unapproved',0,count(*) from public.production_mine_sector_aliases where status<>'approved'
)
select check_key,expected_value,actual_value,case when expected_value=actual_value then 'PASS'::text else 'HOLD'::text end status
from checks;
