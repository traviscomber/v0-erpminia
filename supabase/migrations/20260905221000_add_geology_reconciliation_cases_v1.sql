-- Explicit reconciliation queue for geology chronology conflicts.
-- Preserves source rows and exposes only deterministic chronology states.

create or replace view public.production_geology_reconciliation_cases_v1
with (security_invoker = true)
as
select
  c.organization_id,
  c.drill_hole_id,
  c.hole_code,
  c.source_report_id,
  c.operation_date,
  c.source_row,
  c.hole_code_raw,
  c.shift_code_raw,
  c.meter_initial,
  c.meter_final,
  c.drilled_meters,
  c.prev_drilling_meter_final,
  c.continuity_delta_m,
  c.chronology_state,
  c.meter_quality_status,
  c.drilling_observations,
  c.machine_observations,
  case
    when c.chronology_state = 'severe_backward_sequence' then 'blocked'
    when c.chronology_state = 'material_backward_sequence' then 'review_required'
    else 'context_only'
  end as reconciliation_state,
  case
    when c.chronology_state = 'severe_backward_sequence' then 'Confirmar codigo de sondaje y continuidad de metraje contra la fuente antes de interpretar geologia.'
    when c.chronology_state = 'material_backward_sequence' then 'Revisar solape o retroceso de metraje antes de consolidar continuidad geologica.'
    else 'Sin bloqueo de reconciliacion.'
  end as required_action,
  format('Reporte_Sondajes_I_A/BaseDatos row %s', c.source_row) as source_reference
from public.production_drilling_chronology_quality_v3 c
where c.chronology_state in ('severe_backward_sequence','material_backward_sequence');

revoke all on public.production_geology_reconciliation_cases_v1 from anon;
grant select on public.production_geology_reconciliation_cases_v1 to authenticated;
grant select on public.production_geology_reconciliation_cases_v1 to service_role;
