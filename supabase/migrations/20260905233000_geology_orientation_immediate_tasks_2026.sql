-- 2026 geology orientation/topography evidence and immediate user tasks.
-- Source facts remain untouched. These views classify evidence, gaps and human actions only.

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
    txt ~ '(grado\s*\(?\s*[+-]?[0-9]+([\.,][0-9]+)?\s*\)?|[+-]?[0-9]+([\.,][0-9]+)?\s*grados?)' as has_numeric_angle,
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
      when failed_or_pending_measurement and measurement_signal then 'measurement_failed_or_pending'
      when measurement_signal and not failed_or_pending_measurement then 'measurement_completed_value_missing'
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
      when measurement_signal and not failed_or_pending_measurement then 'measured_but_numeric_value_missing'
      when setup_verified_raw then 'setup_verified_but_numeric_value_missing'
      when failed_or_pending_measurement then 'measurement_not_completed'
      else 'context_only'
    end as canonical_action
  from flags
)
select organization_id, source_report_id, drill_hole_id, hole_code, operation_date, source_file, source_sheet, source_row,
  hole_code_raw, inclination_raw, evidence_type, numeric_target_scope, canonical_action, drilling_observations, machine_observations,
  format('%s/%s row %s', source_file, source_sheet, source_row) as source_reference
from classified where has_orientation_signal;

create or replace view public.production_geology_orientation_status_2026_v1
with (security_invoker = true)
as
with active as (
  select distinct h.organization_id, h.id as drill_hole_id, h.hole_code, h.mine_source_id, h.mine_sector_id, h.azimuth_deg, h.dip_deg
  from public.production_drill_holes h
  join public.production_drilling_source_reports r on r.canonical_drill_hole_id = h.id
  where r.operation_date >= date '2026-01-01' and r.operation_date < date '2027-01-01'
), ev as (
  select organization_id, drill_hole_id, count(*) as evidence_rows,
    count(*) filter (where evidence_type='measurement_completed_value_missing') as completed_measurement_rows,
    count(*) filter (where evidence_type='measurement_failed_or_pending') as failed_or_pending_rows,
    count(*) filter (where evidence_type='setup_verified_value_missing') as setup_verified_rows,
    count(*) filter (where evidence_type='next_hole_setup_context') as excluded_next_hole_setup_rows,
    count(*) filter (where numeric_target_scope='current_hole_candidate') as current_hole_numeric_candidate_rows,
    count(*) filter (where numeric_target_scope='next_or_new_hole_context') as excluded_next_hole_numeric_rows,
    min(operation_date) as first_evidence_date, max(operation_date) as last_evidence_date,
    array_agg(distinct source_reference order by source_reference) as source_references
  from public.production_geology_orientation_evidence_2026_v1
  group by organization_id, drill_hole_id
)
select a.organization_id, a.drill_hole_id, a.hole_code, a.mine_source_id, a.mine_sector_id, a.azimuth_deg, a.dip_deg,
  coalesce(e.evidence_rows,0) as evidence_rows,
  coalesce(e.completed_measurement_rows,0) as completed_measurement_rows,
  coalesce(e.failed_or_pending_rows,0) as failed_or_pending_rows,
  coalesce(e.setup_verified_rows,0) as setup_verified_rows,
  coalesce(e.excluded_next_hole_setup_rows,0) as excluded_next_hole_setup_rows,
  coalesce(e.current_hole_numeric_candidate_rows,0) as current_hole_numeric_candidate_rows,
  coalesce(e.excluded_next_hole_numeric_rows,0) as excluded_next_hole_numeric_rows,
  e.first_evidence_date, e.last_evidence_date, e.source_references,
  case
    when a.azimuth_deg is not null and a.dip_deg is not null then 'canonical_complete'
    when a.azimuth_deg is not null or a.dip_deg is not null then 'canonical_partial'
    when coalesce(e.current_hole_numeric_candidate_rows,0)>0 then 'numeric_text_needs_convention'
    when coalesce(e.completed_measurement_rows,0)>0 then 'measured_value_missing'
    when coalesce(e.setup_verified_rows,0)>0 then 'setup_verified_value_missing'
    when coalesce(e.failed_or_pending_rows,0)>0 then 'measurement_pending_or_failed'
    else 'no_orientation_evidence'
  end as orientation_state,
  case
    when a.azimuth_deg is not null and a.dip_deg is not null then 'usable_numeric_orientation'
    when a.azimuth_deg is not null or a.dip_deg is not null then 'partial_numeric_orientation'
    when coalesce(e.current_hole_numeric_candidate_rows,0)>0 then 'human_review_angle_convention'
    when coalesce(e.completed_measurement_rows,0)>0 then 'recover_numeric_measurement_result'
    when coalesce(e.setup_verified_rows,0)>0 then 'recover_setup_values'
    when coalesce(e.failed_or_pending_rows,0)>0 then 'repeat_or_complete_measurement'
    else 'orientation_source_missing'
  end as required_action
from active a left join ev e on e.organization_id=a.organization_id and e.drill_hole_id=a.drill_hole_id;

create or replace view public.production_geology_orientation_recovery_queue_2026_v1
with (security_invoker = true)
as
with ev as (
  select organization_id, drill_hole_id, count(*) as evidence_rows,
    count(*) filter (where evidence_type='measurement_completed_value_missing') as completed_measurements,
    count(*) filter (where evidence_type='measurement_failed_or_pending') as failed_or_pending_measurements,
    count(*) filter (where evidence_type='setup_verified_value_missing') as verified_setups,
    count(*) filter (where numeric_target_scope='current_hole_candidate') as current_hole_numeric_candidates,
    count(*) filter (where numeric_target_scope='next_or_new_hole_context') as excluded_next_hole_numeric_mentions,
    min(operation_date) as first_evidence_date, max(operation_date) as last_evidence_date,
    array_agg(distinct source_row order by source_row) as source_rows,
    array_agg(distinct source_report_id) as source_report_ids
  from public.production_geology_orientation_evidence_2026_v1
  group by organization_id, drill_hole_id
)
select s.organization_id, s.drill_hole_id, s.hole_code, s.orientation_state, s.required_action,
  case when s.orientation_state='measurement_pending_or_failed' then 0
       when s.orientation_state='numeric_text_needs_convention' then 1
       when s.orientation_state='measured_value_missing' then 2
       when s.orientation_state='setup_verified_value_missing' then 3
       when s.orientation_state='canonical_partial' then 4 else 5 end as recovery_priority,
  coalesce(ev.evidence_rows,0) as evidence_rows,
  coalesce(ev.completed_measurements,0) as completed_measurements,
  coalesce(ev.failed_or_pending_measurements,0) as failed_or_pending_measurements,
  coalesce(ev.verified_setups,0) as verified_setups,
  coalesce(ev.current_hole_numeric_candidates,0) as current_hole_numeric_candidates,
  coalesce(ev.excluded_next_hole_numeric_mentions,0) as excluded_next_hole_numeric_mentions,
  ev.first_evidence_date, ev.last_evidence_date, ev.source_rows, ev.source_report_ids,
  case when s.orientation_state='measurement_pending_or_failed' then 'Repetir/completar medición y registrar resultado numérico con método/dispositivo.'
       when s.orientation_state='numeric_text_needs_convention' then 'Validar convención del ángulo antes de promoverlo a dip/azimut canónico.'
       when s.orientation_state='measured_value_missing' then 'Recuperar planilla/archivo de Topografía o resultado numérico de medición; no repetir si el resultado externo existe.'
       when s.orientation_state='setup_verified_value_missing' then 'Recuperar valores de setup aprobados por jefe de turno/topografía.'
       when s.orientation_state='canonical_partial' then 'Completar componente faltante de orientación canónica.'
       else 'Localizar fuente primaria de orientación antes de inferir valores.' end as recommended_action
from public.production_geology_orientation_status_2026_v1 s
left join ev on ev.organization_id=s.organization_id and ev.drill_hole_id=s.drill_hole_id;

create or replace view public.production_geology_topography_source_gap_2026_v1
with (security_invoker = true)
as
select organization_id, drill_hole_id, hole_code, orientation_state, recovery_priority, source_rows, source_report_ids,
  case when orientation_state='measured_value_missing' then 'external_topography_result_missing'
       when orientation_state='setup_verified_value_missing' then 'verified_setup_values_missing'
       when orientation_state='measurement_pending_or_failed' then 'measurement_not_completed'
       when orientation_state='numeric_text_needs_convention' then 'numeric_angle_convention_unresolved'
       when orientation_state='canonical_partial' then 'canonical_orientation_partial'
       else 'orientation_source_missing' end as source_gap_class,
  case when orientation_state='measured_value_missing' then 'Buscar planilla/exportación de Topografía, estación total o medición de desviación vinculada al pozo. El Reporte_Sondajes_I_A.xlsx no contiene el resultado numérico.'
       when orientation_state='setup_verified_value_missing' then 'Recuperar registro de setup aprobado por jefe de turno/topografía; no inferir valores desde texto.'
       when orientation_state='measurement_pending_or_failed' then 'Completar o repetir medición y registrar profundidad, azimut, inclinación, método y dispositivo.'
       when orientation_state='numeric_text_needs_convention' then 'Validar convención del ángulo textual antes de promoverlo a orientación canónica.'
       when orientation_state='canonical_partial' then 'Completar componente numérico faltante con evidencia fuente.'
       else 'No existe evidencia suficiente de orientación en las fuentes canónicas disponibles.' end as required_source_action,
  'Reporte_Sondajes_I_A.xlsx + production_source_documents audit 2026-09-05'::text as audit_scope
from public.production_geology_orientation_recovery_queue_2026_v1;

create or replace view public.production_geology_immediate_tasks_2026_v1
with (security_invoker = true)
as
select q.organization_id, q.drill_hole_id, q.hole_code, q.orientation_state, q.recovery_priority as task_priority,
  case when q.orientation_state='measurement_pending_or_failed' then 'measurement'
       when q.orientation_state='numeric_text_needs_convention' then 'orientation_review'
       when q.orientation_state='measured_value_missing' then 'topography_recovery'
       when q.orientation_state='setup_verified_value_missing' then 'setup_recovery'
       when q.orientation_state='canonical_partial' then 'orientation_completion'
       else 'source_recovery' end as task_category,
  case when q.orientation_state='measurement_pending_or_failed' then 'Completar medición de orientación'
       when q.orientation_state='numeric_text_needs_convention' then 'Validar ángulo observado'
       when q.orientation_state='measured_value_missing' then 'Recuperar resultado de Topografía'
       when q.orientation_state='setup_verified_value_missing' then 'Recuperar valores de setup'
       when q.orientation_state='canonical_partial' then 'Completar orientación canónica'
       else 'Localizar fuente de orientación' end as task_title,
  case when q.orientation_state='measurement_pending_or_failed' then format('¿Se puede completar la medición de %s y registrar azimut/inclinación numéricos?',q.hole_code)
       when q.orientation_state='numeric_text_needs_convention' then format('¿Qué convención usa el ángulo reportado para %s y puede promoverse a dip/azimut?',q.hole_code)
       when q.orientation_state='measured_value_missing' then format('¿Dónde está el resultado numérico de Topografía para %s?',q.hole_code)
       when q.orientation_state='setup_verified_value_missing' then format('¿Dónde quedaron registrados los valores de setup aprobados para %s?',q.hole_code)
       when q.orientation_state='canonical_partial' then format('¿Qué componente numérico falta para cerrar la orientación de %s?',q.hole_code)
       else format('¿Existe una fuente primaria de orientación para %s?',q.hole_code) end as clarifying_question,
  case when q.orientation_state='measurement_pending_or_failed' then 'La fuente registra un intento fallido o incompleto. Sin resultado numérico no debe usarse la trayectoria para interpretación espacial.'
       when q.orientation_state='numeric_text_needs_convention' then 'Existe un número en la fuente, pero su semántica/signo no está validada contra la convención canónica.'
       when q.orientation_state='measured_value_missing' then 'La fuente confirma que el pozo fue medido, pero el resultado no existe en las fuentes canónicas disponibles.'
       when q.orientation_state='setup_verified_value_missing' then 'La fuente confirma que el setup fue verificado, pero no conserva los valores numéricos aprobados.'
       when q.orientation_state='canonical_partial' then 'Existe sólo una parte de la orientación numérica; falta completar la geometría mínima.'
       else 'No existe evidencia suficiente para afirmar orientación. No se debe inferir desde prefijos, mina o textos genéricos.' end as why_it_matters,
  q.recommended_action, g.required_source_action, q.source_rows, q.source_report_ids, q.first_evidence_date, q.last_evidence_date,
  q.completed_measurements, q.failed_or_pending_measurements, q.verified_setups, q.current_hole_numeric_candidates,
  q.excluded_next_hole_numeric_mentions,
  case when q.recovery_priority<=4 then 'open' else 'backlog' end as task_state,
  q.recovery_priority<=4 as is_immediate,
  case when q.orientation_state='measurement_pending_or_failed' then 'Topografía / Geología debe completar la medición y registrar profundidad, azimut, inclinación, método y dispositivo.'
       when q.orientation_state='numeric_text_needs_convention' then 'Geología debe confirmar la convención del ángulo y si representa dip/inclinación del pozo actual.'
       when q.orientation_state='measured_value_missing' then 'Topografía / Geología debe ubicar el archivo o registro externo donde quedó el resultado de la medición.'
       when q.orientation_state='setup_verified_value_missing' then 'Jefe de turno / Geología debe recuperar el setup aprobado y documentar sus valores numéricos.'
       when q.orientation_state='canonical_partial' then 'Geología debe completar el componente faltante con evidencia primaria.'
       else 'Geología debe aportar una fuente primaria antes de intentar completar orientación.' end as human_checkpoint,
  format('Reporte_Sondajes_I_A.xlsx / filas %s',coalesce(array_to_string(q.source_rows,', '),'sin fila específica')) as evidence_summary,
  g.audit_scope
from public.production_geology_orientation_recovery_queue_2026_v1 q
join public.production_geology_topography_source_gap_2026_v1 g on g.organization_id=q.organization_id and g.drill_hole_id=q.drill_hole_id;

revoke all on public.production_geology_orientation_evidence_2026_v1 from anon;
revoke all on public.production_geology_orientation_status_2026_v1 from anon;
revoke all on public.production_geology_orientation_recovery_queue_2026_v1 from anon;
revoke all on public.production_geology_topography_source_gap_2026_v1 from anon;
revoke all on public.production_geology_immediate_tasks_2026_v1 from anon;

grant select on public.production_geology_orientation_evidence_2026_v1 to authenticated, service_role;
grant select on public.production_geology_orientation_status_2026_v1 to authenticated, service_role;
grant select on public.production_geology_orientation_recovery_queue_2026_v1 to authenticated, service_role;
grant select on public.production_geology_topography_source_gap_2026_v1 to authenticated, service_role;
grant select on public.production_geology_immediate_tasks_2026_v1 to authenticated, service_role;
