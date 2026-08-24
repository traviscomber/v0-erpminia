-- Keep every production quality gate inside the authenticated organization.
-- API routes use a service-role client, so the views must expose organization_id
-- and every route must filter it explicitly.

create or replace view public.production_transport_identity_quality_v1
with (security_invoker = true) as
with expected as (
  select organization_id, 'driver'::text entity_type,
         count(distinct regexp_replace(lower(trim(driver_name_raw)), '\s+', ' ', 'g'))::bigint expected_count
  from public.production_material_movements
  where nullif(trim(driver_name_raw), '') is not null
  group by organization_id
  union all
  select organization_id, 'carrier',
         count(distinct regexp_replace(lower(trim(carrier_name_raw)), '\s+', ' ', 'g'))::bigint
  from public.production_material_movements
  where nullif(trim(carrier_name_raw), '') is not null
  group by organization_id
  union all
  select organization_id, 'vehicle',
         count(distinct upper(regexp_replace(vehicle_plate_raw, '[^A-Za-z0-9]', '', 'g')))::bigint
  from public.production_material_movements
  where nullif(trim(vehicle_plate_raw), '') is not null
  group by organization_id
), actual as (
  select organization_id, entity_type, count(*)::bigint actual_count,
         count(*) filter (where canonical_target_count > 1)::bigint conflicts
  from public.production_transport_identity_resolution_v1
  group by organization_id, entity_type
)
select e.entity_type, e.expected_count, coalesce(a.actual_count, 0::bigint) actual_count,
       coalesce(a.conflicts, 0::bigint) conflicts,
       case
         when e.expected_count = coalesce(a.actual_count, 0::bigint)
          and coalesce(a.conflicts, 0::bigint) = 0 then 'PASS'::text
         else 'HOLD'::text
       end status,
       e.organization_id
from expected e
left join actual a using (organization_id, entity_type);

create or replace view public.production_source_sheet_coverage_quality_v1
with (security_invoker = true) as
with orgs as (
  select distinct organization_id from public.production_canonical_package_quality_v1
), checks as (
  select o.organization_id, 'canonical_source_files'::text check_key, 7::bigint expected_value,
         (select count(distinct r.source_file_sha256)::bigint
          from public.production_source_sheet_registry r
          where r.organization_id = o.organization_id) actual_value
  from orgs o
  union all
  select o.organization_id, 'source_sheet_registry', 172,
         (select count(*)::bigint from public.production_source_sheet_registry r where r.organization_id = o.organization_id)
  from orgs o
  union all
  select o.organization_id, 'unclassified_source_sheets', 0,
         (select count(*)::bigint from public.production_source_sheet_registry r
          where r.organization_id = o.organization_id and (r.handling is null or r.domain is null))
  from orgs o
  union all
  select o.organization_id, 'supplemental_normalized_records', 154,
         (select count(*)::bigint from public.production_source_normalized_records r where r.organization_id = o.organization_id)
  from orgs o
  union all
  select o.organization_id, 'supplemental_record_duplicate_keys', 0,
         (select count(*)::bigint from (
            select r.source_file_sha256, r.source_sheet, r.source_row, r.record_type
            from public.production_source_normalized_records r
            where r.organization_id = o.organization_id
            group by 1, 2, 3, 4 having count(*) > 1
          ) duplicates)
  from orgs o
  union all
  select o.organization_id, 'source_anomalies_classified', 57,
         (select count(*)::bigint from public.production_source_normalized_records r
          where r.organization_id = o.organization_id and r.semantic_status = 'source_anomaly')
  from orgs o
  union all
  select o.organization_id, 'reference_only_records_classified', 14,
         (select count(*)::bigint from public.production_source_normalized_records r
          where r.organization_id = o.organization_id and r.semantic_status = 'reference_only')
  from orgs o
)
select check_key, expected_value, actual_value,
       case when expected_value = actual_value then 'PASS'::text else 'HOLD'::text end status,
       organization_id
from checks;

create or replace view public.production_flow_fidelity_quality_v1
with (security_invoker = true) as
with q as (
  select organization_id,
         count(*)::bigint canonical_august_days,
         coalesce(sum(shift_rows), 0)::bigint canonical_august_shifts,
         coalesce(sum(deterministic_shift_rows), 0)::bigint canonical_august_deterministic_shifts,
         coalesce(sum(shipment_rows), 0)::bigint canonical_august_shipments,
         max(movement_source_cutoff) movement_source_cutoff,
         count(*) filter (
           where movement_source_state = 'outside_source_window' and transported_t is null
         )::bigint post_cutoff_days_marked_unavailable,
         coalesce(sum(review_shipment_rows), 0)::bigint review_shipments_preserved
  from public.production_flow_daily_fidelity_v1
  group by organization_id
), checks as (
  select organization_id, 'canonical_august_days'::text check_key, '18'::text expected_value,
         canonical_august_days::text actual_value from q
  union all select organization_id, 'canonical_august_shifts', '36', canonical_august_shifts::text from q
  union all select organization_id, 'canonical_august_deterministic_shifts', '36', canonical_august_deterministic_shifts::text from q
  union all select organization_id, 'canonical_august_shipments', '14', canonical_august_shipments::text from q
  union all select organization_id, 'movement_source_cutoff', '2026-08-06', movement_source_cutoff::text from q
  union all select organization_id, 'post_cutoff_days_marked_unavailable', '12', post_cutoff_days_marked_unavailable::text from q
  union all select organization_id, 'review_shipments_preserved', '1', review_shipments_preserved::text from q
)
select check_key, expected_value, actual_value,
       case when actual_value = expected_value then 'PASS'::text else 'HOLD'::text end status,
       organization_id
from checks;

create or replace view public.production_concentrate_fidelity_quality_v1
with (security_invoker = true) as
with orgs as (
  select distinct organization_id from public.production_canonical_package_quality_v1
), m as (
  select o.organization_id,
         count(d.plant_shift_id)::integer shifts,
         count(d.concentrate_wet_metric_tons)::integer shifts_with_produced_concentrate
  from orgs o
  left join public.production_metallurgy_deterministic_v2 d
    on d.organization_id = o.organization_id and d.source_file = 'LEY (1).xlsx'
  group by o.organization_id
), s as (
  select o.organization_id,
         count(x.id)::integer shipments,
         count(x.id) filter (where x.validation_status = 'valid')::integer valid_shipments,
         count(x.id) filter (where x.validation_status = 'review')::integer review_shipments,
         coalesce(sum(x.normalized_metric_tons), 0)::numeric shipped_wet_t
  from orgs o
  left join public.production_concentrate_shipments x
    on x.organization_id = o.organization_id and x.source_file = 'LEY (1).xlsx'
  group by o.organization_id
), checks as (
  select m.organization_id, 'canonical_august_shifts'::text check_key, '36'::text expected_value, m.shifts::text actual_value from m
  union all select m.organization_id, 'produced_concentrate_source_rows', '0', m.shifts_with_produced_concentrate::text from m
  union all select s.organization_id, 'canonical_august_shipments', '14', s.shipments::text from s
  union all select s.organization_id, 'valid_shipments', '13', s.valid_shipments::text from s
  union all select s.organization_id, 'review_shipments', '1', s.review_shipments::text from s
  union all select s.organization_id, 'shipped_wet_concentrate_t', '398.10', round(s.shipped_wet_t, 2)::text from s
)
select check_key, expected_value, actual_value,
       case when actual_value = expected_value then 'PASS'::text else 'HOLD'::text end status,
       organization_id
from checks;

create or replace view public.production_chemistry_lineage_quality_v1
with (security_invoker = true) as
with q as (
  select organization_id,
         count(*)::integer results,
         count(*) filter (where mine_source_id is not null)::integer mine_linked,
         count(*) filter (where mine_sector_id is not null)::integer sector_linked,
         count(*) filter (where exact_sector_matches = 1)::integer exact_sector_candidates,
         count(*) filter (where drill_hole_id is not null)::integer hole_linked
  from public.production_chemistry_lineage_v1
  group by organization_id
), checks as (
  select organization_id, 'chemistry_results'::text check_key, 20 expected_value, results actual_value from q
  union all select organization_id, 'chemistry_mine_links', 19, mine_linked from q
  union all select organization_id, 'chemistry_sector_links_without_evidence', 0, sector_linked from q
  union all select organization_id, 'chemistry_exact_sector_candidates', 0, exact_sector_candidates from q
  union all select organization_id, 'chemistry_hole_links_without_evidence', 0, hole_linked from q
)
select check_key, expected_value, actual_value,
       case when actual_value = expected_value then 'PASS'::text else 'HOLD'::text end status,
       organization_id
from checks;

create or replace view public.production_master_normalization_quality_v1
with (security_invoker = true) as
with orgs as (
  select distinct organization_id from public.production_canonical_package_quality_v1
), checks as (
  select o.organization_id, 'canonical_package'::text check_key, 0::bigint expected_value,
         (select count(*)::bigint from public.production_canonical_package_quality_v1 q
          where q.organization_id = o.organization_id and q.status <> 'PASS') actual_value
  from orgs o
  union all
  select o.organization_id, 'drilling_fidelity', 0,
         (select count(*)::bigint from public.production_drilling_source_fidelity_v1 q
          where q.organization_id = o.organization_id and q.status <> 'PASS')
  from orgs o
  union all
  select o.organization_id, 'flow_fidelity', 0,
         (select count(*)::bigint from public.production_flow_fidelity_quality_v1 q
          where q.organization_id = o.organization_id and q.status <> 'PASS')
  from orgs o
  union all
  select o.organization_id, 'concentrate_fidelity', 0,
         (select count(*)::bigint from public.production_concentrate_fidelity_quality_v1 q
          where q.organization_id = o.organization_id and q.status <> 'PASS')
  from orgs o
  union all
  select o.organization_id, 'transport_identity_fidelity', 0,
         (select count(*)::bigint from public.production_transport_identity_quality_v1 q
          where q.organization_id = o.organization_id and q.status <> 'PASS')
  from orgs o
  union all
  select o.organization_id, 'source_sheet_coverage', 0,
         (select count(*)::bigint from public.production_source_sheet_coverage_quality_v1 q
          where q.organization_id = o.organization_id and q.status <> 'PASS')
  from orgs o
  union all
  select o.organization_id, 'duplicate_source_keys', 0,
         (select count(*)::bigint from (
            select source_file, source_sheet, source_row
            from public.production_material_movements m
            where m.organization_id = o.organization_id
            group by 1, 2, 3 having count(*) > 1
          ) x)
         + (select count(*)::bigint from (
            select operation_date, shift_code
            from public.production_plant_shifts s
            where s.organization_id = o.organization_id
            group by 1, 2 having count(*) > 1
          ) x)
         + (select count(*)::bigint from (
            select plant_shift_id
            from public.production_metallurgy_results r
            where r.organization_id = o.organization_id
            group by 1 having count(*) > 1
          ) x)
         + (select count(*)::bigint from (
            select source_file, source_sheet, source_row
            from public.production_concentrate_shipments s
            where s.organization_id = o.organization_id
            group by 1, 2, 3 having count(*) > 1
          ) x)
         + (select count(*)::bigint from (
            select source_file_sha256, source_sheet, source_row
            from public.production_drilling_source_reports r
            where r.organization_id = o.organization_id
            group by 1, 2, 3 having count(*) > 1
          ) x)
  from orgs o
  union all
  select o.organization_id, 'approved_movements_without_tons', 0,
         (select count(*)::bigint from public.production_material_movements m
          where m.organization_id = o.organization_id
            and m.normalization_status = 'approved' and m.normalized_metric_tons is null)
  from orgs o
  union all
  select o.organization_id, 'pending_movements_not_review', 0,
         (select count(*)::bigint from public.production_material_movements m
          where m.organization_id = o.organization_id
            and m.normalization_status = 'pending' and m.validation_status <> 'review')
  from orgs o
  union all
  select o.organization_id, 'drilling_unaccounted_status', 0,
         (select count(*)::bigint from public.production_drilling_source_reports r
          where r.organization_id = o.organization_id
            and r.reconciliation_status <> all (array['promoted', 'staged']))
  from orgs o
  union all
  select o.organization_id, 'drilling_total_rows', 4693,
         (select count(*)::bigint from public.production_drilling_source_reports r where r.organization_id = o.organization_id)
  from orgs o
  union all
  select o.organization_id, 'operational_drill_holes', 400,
         (select count(*)::bigint from public.production_drill_holes h where h.organization_id = o.organization_id)
  from orgs o
  union all
  select o.organization_id, 'sector_resolution_coverage',
         (select count(*)::bigint from public.production_mine_sectors s where s.organization_id = o.organization_id),
         (select count(*)::bigint from public.production_mine_sector_resolution_v1 r where r.organization_id = o.organization_id)
  from orgs o
  union all
  select o.organization_id, 'sector_alias_conflicts', 0,
         (select count(*)::bigint from (
            select sector_id
            from public.production_mine_sector_aliases a
            where a.organization_id = o.organization_id and a.status = 'approved'
            group by sector_id having count(distinct canonical_sector_id) > 1
          ) x)
  from orgs o
  union all
  select o.organization_id, 'sector_alias_unapproved', 0,
         (select count(*)::bigint from public.production_mine_sector_aliases a
          where a.organization_id = o.organization_id and a.status <> 'approved')
  from orgs o
)
select check_key, expected_value, actual_value,
       case when expected_value = actual_value then 'PASS'::text else 'HOLD'::text end status,
       organization_id
from checks;

-- Every production view introduced by this release is backend-only. Keep the
-- view execution model aligned with the caller and remove Data API access.
alter view public.production_canonical_package_quality_v1 set (security_invoker = true);
alter view public.production_chemistry_fidelity_quality_v1 set (security_invoker = true);
alter view public.production_chemistry_lineage_quality_v1 set (security_invoker = true);
alter view public.production_chemistry_lineage_v1 set (security_invoker = true);
alter view public.production_chemistry_mine_intelligence_v1 set (security_invoker = true);
alter view public.production_chemistry_sector_source_summary_v1 set (security_invoker = true);
alter view public.production_chemistry_source_quality_v1 set (security_invoker = true);
alter view public.production_concentrate_fidelity_quality_v1 set (security_invoker = true);
alter view public.production_copper_plan_v1 set (security_invoker = true);
alter view public.production_drill_hole_location_resolution_v1 set (security_invoker = true);
alter view public.production_drill_hole_location_review_queue_v1 set (security_invoker = true);
alter view public.production_drilling_reconciliation_v1 set (security_invoker = true);
alter view public.production_drilling_source_fidelity_v1 set (security_invoker = true);
alter view public.production_fine_copper_daily_v1 set (security_invoker = true);
alter view public.production_fine_copper_v1 set (security_invoker = true);
alter view public.production_fine_flow_daily_v1 set (security_invoker = true);
alter view public.production_flow_daily_fidelity_v1 set (security_invoker = true);
alter view public.production_flow_fidelity_quality_v1 set (security_invoker = true);
alter view public.production_geology_context_quality_v1 set (security_invoker = true);
alter view public.production_master_normalization_quality_v1 set (security_invoker = true);
alter view public.production_mine_sector_resolution_v1 set (security_invoker = true);
alter view public.production_normalization_exceptions_v1 set (security_invoker = true);
alter view public.production_source_fidelity_exceptions_v1 set (security_invoker = true);
alter view public.production_source_sheet_coverage_quality_v1 set (security_invoker = true);
alter view public.production_transport_identity_quality_v1 set (security_invoker = true);
alter view public.production_transport_identity_resolution_v1 set (security_invoker = true);

revoke all on
  public.production_canonical_package_quality_v1,
  public.production_chemistry_fidelity_quality_v1,
  public.production_chemistry_lineage_quality_v1,
  public.production_chemistry_lineage_v1,
  public.production_chemistry_mine_intelligence_v1,
  public.production_chemistry_sector_source_summary_v1,
  public.production_chemistry_source_quality_v1,
  public.production_concentrate_fidelity_quality_v1,
  public.production_copper_plan_v1,
  public.production_drill_hole_location_resolution_v1,
  public.production_drill_hole_location_review_queue_v1,
  public.production_drilling_reconciliation_v1,
  public.production_drilling_source_fidelity_v1,
  public.production_fine_copper_daily_v1,
  public.production_fine_copper_v1,
  public.production_fine_flow_daily_v1,
  public.production_flow_daily_fidelity_v1,
  public.production_flow_fidelity_quality_v1,
  public.production_geology_context_quality_v1,
  public.production_master_normalization_quality_v1,
  public.production_mine_sector_resolution_v1,
  public.production_normalization_exceptions_v1,
  public.production_source_fidelity_exceptions_v1,
  public.production_source_sheet_coverage_quality_v1,
  public.production_transport_identity_quality_v1,
  public.production_transport_identity_resolution_v1
from public, anon, authenticated;

grant select on
  public.production_canonical_package_quality_v1,
  public.production_chemistry_fidelity_quality_v1,
  public.production_chemistry_lineage_quality_v1,
  public.production_chemistry_lineage_v1,
  public.production_chemistry_mine_intelligence_v1,
  public.production_chemistry_sector_source_summary_v1,
  public.production_chemistry_source_quality_v1,
  public.production_concentrate_fidelity_quality_v1,
  public.production_copper_plan_v1,
  public.production_drill_hole_location_resolution_v1,
  public.production_drill_hole_location_review_queue_v1,
  public.production_drilling_reconciliation_v1,
  public.production_drilling_source_fidelity_v1,
  public.production_fine_copper_daily_v1,
  public.production_fine_copper_v1,
  public.production_fine_flow_daily_v1,
  public.production_flow_daily_fidelity_v1,
  public.production_flow_fidelity_quality_v1,
  public.production_geology_context_quality_v1,
  public.production_master_normalization_quality_v1,
  public.production_mine_sector_resolution_v1,
  public.production_normalization_exceptions_v1,
  public.production_source_fidelity_exceptions_v1,
  public.production_source_sheet_coverage_quality_v1,
  public.production_transport_identity_quality_v1,
  public.production_transport_identity_resolution_v1
to service_role;

-- Source identity is tenant-owned. The same fingerprint and row coordinates
-- can legitimately exist in two organizations without colliding.
alter table public.production_source_sheet_registry
  drop constraint if exists production_source_sheet_regis_source_file_sha256_source_she_key;
alter table public.production_source_sheet_registry
  add constraint production_source_sheet_registry_org_source_key
  unique (organization_id, source_file_sha256, source_sheet);

alter table public.production_source_normalized_records
  drop constraint if exists production_source_normalized__source_file_sha256_source_she_key;
alter table public.production_source_normalized_records
  add constraint production_source_normalized_records_org_source_key
  unique (organization_id, source_file_sha256, source_sheet, source_row, record_type);
