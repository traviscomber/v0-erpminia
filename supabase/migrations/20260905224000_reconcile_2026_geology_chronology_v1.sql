-- Reconcile 2026 chronology only in the derived geology layer.
-- RAW production_drilling_source_reports rows remain unchanged.

create or replace view public.production_geology_reconciliation_cases_v1
with (security_invoker = true)
as
with normalized as (
  select
    r.id as source_report_id,
    r.organization_id,
    r.canonical_drill_hole_id as drill_hole_id,
    h.hole_code,
    r.operation_date,
    r.source_row,
    r.hole_code_raw,
    r.shift_code_raw,
    case
      when r.source_row = 3301 then 73.5::numeric
      when r.source_row = 1513 then 206.85::numeric
      when r.source_row = 2618 then 282::numeric
      when r.meter_initial is not null and r.meter_final is not null and r.drilled_meters is not null
       and abs(abs(r.meter_final-r.meter_initial)-abs(r.drilled_meters)*100) <= 0.01 then r.meter_initial/100.0
      else r.meter_initial
    end as meter_initial,
    case
      when r.source_row = 1513 then 218.5::numeric
      when r.source_row = 2618 then 285::numeric
      when r.meter_initial is not null and r.meter_final is not null and r.drilled_meters is not null
       and abs(abs(r.meter_final-r.meter_initial)-abs(r.drilled_meters)*100) <= 0.01 then r.meter_final/100.0
      else r.meter_final
    end as meter_final,
    case
      when r.source_row in (3793,3868,3975) then 0::numeric
      when r.source_row = 3301 then 7::numeric
      else r.drilled_meters
    end as drilled_meters,
    case
      when r.source_row = 3793 then 'non_drilling_capture_conflict_excluded'
      when r.source_row = 3868 then 'duplicate_report_excluded'
      when r.source_row = 3975 then 'superseded_duplicate_report_excluded'
      when r.source_row in (1513,2618,3301) then 'sequence_reconciled_typo'
      when r.source_row in (3993,4347) then 'sequence_reordered_source_date'
      when r.meter_initial is not null and r.meter_final is not null and r.drilled_meters is not null
       and abs(abs(r.meter_final-r.meter_initial)-abs(r.drilled_meters)*100) <= 0.01 then 'scaled_x100_normalized'
      when r.drilled_meters < 0 then 'negative_source_meters'
      else 'source_consistent'
    end as meter_quality_status,
    r.drilling_observations,
    r.machine_observations,
    case
      when r.source_row = 88 then r.operation_date + interval '3 days'
      when r.source_row = 3993 then timestamp '2026-04-06 00:00:00'
      when r.source_row = 4347 then timestamp '2026-06-08 00:00:00'
      else r.operation_date::timestamp
    end as chronology_order_at
  from public.production_drilling_source_reports r
  join public.production_drill_holes h on h.id = r.canonical_drill_hole_id
  where r.canonical_drill_hole_id is not null
), ordered as (
  select n.*,
    lag(n.meter_final) over(
      partition by n.drill_hole_id
      order by n.chronology_order_at,coalesce(n.meter_initial,-1),coalesce(n.meter_final,-1),n.source_row
    ) as prev_drilling_meter_final
  from normalized n
  where coalesce(n.drilled_meters,0) > 0 and coalesce(n.meter_final,0) > 0
), classified as (
  select o.*,
    case when o.prev_drilling_meter_final is null or o.meter_initial is null then null::numeric
         else round(o.meter_initial-o.prev_drilling_meter_final,3) end as continuity_delta_m,
    case
      when o.prev_drilling_meter_final is null or o.meter_initial is null then 'insufficient_sequence_context'
      when o.meter_initial >= o.prev_drilling_meter_final-0.01 then 'sequence_ok'
      when o.meter_initial >= o.prev_drilling_meter_final-5 then 'minor_overlap_or_rounding'
      when o.meter_initial >= o.prev_drilling_meter_final-50 then 'material_backward_sequence'
      else 'severe_backward_sequence'
    end as chronology_state
  from ordered o
)
select
  organization_id,drill_hole_id,hole_code,source_report_id,operation_date,source_row,hole_code_raw,shift_code_raw,
  meter_initial,meter_final,drilled_meters,prev_drilling_meter_final,continuity_delta_m,chronology_state,meter_quality_status,
  drilling_observations,machine_observations,
  case when chronology_state='severe_backward_sequence' then 'blocked' else 'review_required' end as reconciliation_state,
  case when chronology_state='severe_backward_sequence'
    then 'Confirmar codigo de sondaje y continuidad de metraje contra la fuente antes de interpretar geologia.'
    else 'Revisar solape o retroceso de metraje antes de consolidar continuidad geologica.' end as required_action,
  format('Reporte_Sondajes_I_A/BaseDatos row %s',source_row) as source_reference
from classified
where chronology_state in ('severe_backward_sequence','material_backward_sequence');

revoke all on public.production_geology_reconciliation_cases_v1 from anon;
revoke all on public.production_geology_reconciliation_cases_v1 from authenticated;
revoke all on public.production_geology_reconciliation_cases_v1 from service_role;
grant select on public.production_geology_reconciliation_cases_v1 to authenticated;
grant select on public.production_geology_reconciliation_cases_v1 to service_role;
