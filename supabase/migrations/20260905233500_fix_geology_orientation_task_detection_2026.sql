-- Harden 2026 orientation task detection.
-- 1) numeric inclination_raw must reach convention review even without repeated free text;
-- 2) explicit waits/failures for Topography are pending evidence, while a later completed measurement still wins at hole status level.

create or replace view public.production_geology_orientation_evidence_2026_v1
with (security_invoker = true)
as
with base as (
  select r.organization_id, r.id as source_report_id, r.canonical_drill_hole_id as drill_hole_id, h.hole_code,
    r.operation_date, r.source_file, r.source_sheet, r.source_row, r.hole_code_raw, r.inclination_raw,
    coalesce(r.drilling_observations,'') as drilling_observations,
    coalesce(r.machine_observations,'') as machine_observations,
    lower(coalesce(r.drilling_observations,'') || ' ' || coalesce(r.machine_observations,'')) as txt
  from public.production_drilling_source_reports r
  join public.production_drill_holes h on h.id = r.canonical_drill_hole_id
  where r.operation_date >= date '2026-01-01' and r.operation_date < date '2027-01-01'
    and r.canonical_drill_hole_id is not null
), flags as (
  select base.*,
    (txt ~ '(grado\s*\(?\s*[+-]?[0-9]+([\.,][0-9]+)?\s*\)?|[+-]?[0-9]+([\.,][0-9]+)?\s*grados?)'
      or coalesce(trim(inclination_raw),'') ~ '^[+-]?[0-9]+([\.,][0-9]+)?$') as has_numeric_angle,
    txt ~ '(topograf|tipograf|se mide pozo|se mide el pozo|se comienza a medir pozo|medición de desviación|medicion de desviacion|mide azimut|medir pozo|levante de pozo|chequea.*azimut|azimut.*inclinaci|grado.*azimut|azimut.*grado)' as has_orientation_signal_text,
    txt ~ '(no se logra medir|no se pudo medir|no se logra.*medir|a la espera de topograf|espera a topograf)' as failed_or_pending_measurement,
    txt ~ '(se mide pozo|se mide el pozo|se comienza a medir pozo|medición de desviación|medicion de desviacion|mide azimut|levante de pozo|topografía realiza levante|topografia realiza levante)' as measurement_signal,
    txt ~ '(chequea.*azimut.*inclinaci|azimut.*inclinaci.*visto bueno|se instala.*azimut.*inclinaci|se posiciona.*azimut.*inclinaci|se corre grado y azimut|da grado.*azimut|grado y azimut|azimut y grado)' as setup_verified_raw,
    txt ~ '(nuevo pozo|siguiente pozo|pozo siguiente|nueva postura|para el siguiente pozo|para nuevo pozo|se posiciona en nuevo pozo)' as next_or_new_hole_context
  from base
), classified as (
  select flags.*,
    has_orientation_signal_text or has_numeric_angle as has_orientation_signal,
    case
      when failed_or_pending_measurement then 'measurement_failed_or_pending'
      when measurement_signal then 'measurement_completed_value_missing'
      when setup_verified_raw and next_or_new_hole_context then 'next_hole_setup_context'
      when setup_verified_raw then 'setup_verified_value_missing'
      when has_numeric_angle then 'numeric_angle_text'
      else 'orientation_operational_evidence'
    end as evidence_type,
    case
      when has_numeric_angle and next_or_new_hole_context then 'next_or_new_hole_context'
      when has_numeric_angle then 'current_hole_candidate'
      else null
    end as numeric_target_scope,
    case
      when setup_verified_raw and next_or_new_hole_context then 'do_not_promote_setup_to_current_hole'
      when has_numeric_angle and next_or_new_hole_context then 'do_not_promote_to_current_hole'
      when has_numeric_angle then 'numeric_angle_needs_convention_review'
      when failed_or_pending_measurement then 'measurement_not_completed'
      when measurement_signal then 'measured_but_numeric_value_missing'
      when setup_verified_raw then 'setup_verified_but_numeric_value_missing'
      else 'context_only'
    end as canonical_action
  from flags
)
select organization_id, source_report_id, drill_hole_id, hole_code, operation_date, source_file, source_sheet, source_row,
  hole_code_raw, inclination_raw, evidence_type, numeric_target_scope, canonical_action, drilling_observations, machine_observations,
  format('%s/%s row %s', source_file, source_sheet, source_row) as source_reference
from classified where has_orientation_signal;

revoke all on public.production_geology_orientation_evidence_2026_v1 from anon;
grant select on public.production_geology_orientation_evidence_2026_v1 to authenticated, service_role;
