-- Consolidate the exact counts consumed by the Production overview into one
-- service-role-only database call. All filters preserve the existing API
-- semantics; this function does not infer or mutate canonical evidence.

create index if not exists production_movements_pending_normalization_org_idx
  on public.production_material_movements (organization_id)
  where normalization_status = 'pending';

create index if not exists production_movements_review_org_idx
  on public.production_material_movements (organization_id)
  where validation_status = 'review';

create index if not exists production_plant_shifts_review_org_idx
  on public.production_plant_shifts (organization_id)
  where validation_status = 'review';

create index if not exists production_metallurgy_review_org_idx
  on public.production_metallurgy_results (organization_id)
  where validation_status = 'review';

create or replace function public.production_data_coverage_summary_v1(
  p_organization_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'material_movements', (
      select count(*)::bigint
      from public.production_material_movements
      where organization_id = p_organization_id
    ),
    'plant_shifts', (
      select count(*)::bigint
      from public.production_plant_shifts
      where organization_id = p_organization_id
    ),
    'metallurgy_results', (
      select count(*)::bigint
      from public.production_metallurgy_deterministic_v2
      where organization_id = p_organization_id
    ),
    'concentrate_shipments', (
      select count(*)::bigint
      from public.production_concentrate_shipments
      where organization_id = p_organization_id
    ),
    'pending_imports', (
      select count(*)::bigint
      from public.production_import_exceptions
      where organization_id = p_organization_id
        and review_status = 'pending'
    ),
    'pending_movement_normalization', (
      select count(*)::bigint
      from public.production_material_movements
      where organization_id = p_organization_id
        and normalization_status = 'pending'
    ),
    'movement_review', (
      select count(*)::bigint
      from public.production_material_movements
      where organization_id = p_organization_id
        and validation_status = 'review'
    ),
    'entity_review', (
      select count(*)::bigint
      from public.production_entity_reconciliation
      where organization_id = p_organization_id
        and status = 'needs_review'
    ),
    'plant_review', (
      select count(*)::bigint
      from public.production_plant_shifts
      where organization_id = p_organization_id
        and validation_status = 'review'
    ),
    'metallurgy_review', (
      select count(*)::bigint
      from public.production_metallurgy_results
      where organization_id = p_organization_id
        and validation_status = 'review'
    ),
    'drill_location_review', (
      select count(*)::bigint
      from public.production_drill_hole_location_review_queue_v1
      where organization_id = p_organization_id
        and resolution_state = 'needs_evidence'
    ),
    'drill_intervals', (
      select count(*)::bigint
      from public.production_drill_intervals
      where organization_id = p_organization_id
    ),
    'chemistry_results', (
      select count(*)::bigint
      from public.production_chemistry_results
      where organization_id = p_organization_id
    ),
    'geology_external_records', (
      select count(*)::bigint
      from public.production_geology_external_context
      where organization_id = p_organization_id
    ),
    'geology_review_records', (
      select count(*)::bigint
      from public.production_geology_external_context
      where organization_id = p_organization_id
        and validation_status = 'review'
    )
  );
$function$;

revoke execute on function public.production_data_coverage_summary_v1(uuid) from public;
revoke execute on function public.production_data_coverage_summary_v1(uuid) from anon, authenticated;
grant execute on function public.production_data_coverage_summary_v1(uuid) to service_role;
