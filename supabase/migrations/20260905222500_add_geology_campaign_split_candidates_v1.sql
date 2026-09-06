-- Preserve RAW geology history while reconciling one deterministic code-copy error
-- and exposing campaign-reuse candidates for human review.

update public.production_drilling_source_reports r
set canonical_drill_hole_id = target.id,
    reconciliation_notes = concat_ws(
      ' | ',
      nullif(r.reconciliation_notes,''),
      'Canonical relink 2026-09-05: RAW ONP25-07 row 3309 continues ONP25-06 exactly 290.7->296.7->299.7; row states finalizacion y medicion. New ONP25-07 campaign had already started at 0->17.7. RAW code preserved.'
    )
from public.production_drill_holes target
where r.source_row=3309
  and r.hole_code_raw='ONP25-07'
  and target.hole_code='ONP25-06'
  and target.organization_id=r.organization_id
  and r.canonical_drill_hole_id is distinct from target.id;

create or replace view public.production_geology_campaign_split_candidates_v1
with (security_invoker = true)
as
with positive as (
  select
    r.id as source_report_id,
    r.organization_id,
    r.canonical_drill_hole_id as drill_hole_id,
    h.hole_code,
    r.operation_date,
    r.source_row,
    r.hole_code_raw,
    coalesce(r.meter_initial,0) as meter_initial,
    r.meter_final,
    r.drilled_meters,
    concat_ws(' ',r.drilling_observations,r.machine_observations) as evidence_text
  from public.production_drilling_source_reports r
  join public.production_drill_holes h on h.id=r.canonical_drill_hole_id
  where r.canonical_drill_hole_id is not null
    and r.operation_date is not null
    and coalesce(r.drilled_meters,0)>0
    and coalesce(r.meter_final,0)>0
), starts as (
  select
    p.*,
    prev.prior_max_m,
    prev.prior_last_date,
    (p.operation_date-prev.prior_last_date) as gap_days,
    setup.setup_source_row,
    setup.setup_evidence_text
  from positive p
  left join lateral (
    select max(q.meter_final) as prior_max_m,max(q.operation_date) as prior_last_date
    from positive q
    where q.drill_hole_id=p.drill_hole_id
      and (q.operation_date<p.operation_date or (q.operation_date=p.operation_date and q.source_row<p.source_row))
  ) prev on true
  left join lateral (
    select
      r2.source_row as setup_source_row,
      concat_ws(' ',r2.drilling_observations,r2.machine_observations) as setup_evidence_text
    from public.production_drilling_source_reports r2
    where r2.canonical_drill_hole_id=p.drill_hole_id
      and r2.operation_date between p.operation_date-interval '1 day' and p.operation_date
      and r2.source_row<=p.source_row
      and concat_ws(' ',r2.drilling_observations,r2.machine_observations) ~* '(nuevo pozo|nuevo sondaje|mueve sonda hasta azimut|se mueve sonda hasta azimut|azimut requerida|cambiando de grado y posición|cambiando de grado y posicion|se posiciona.*nuevo|se instala.*nuevo|perno de anclaje)'
    order by r2.operation_date desc,r2.source_row desc
    limit 1
  ) setup on true
  where p.meter_initial<=1 and p.meter_final>5
)
select
  organization_id,drill_hole_id,hole_code,source_report_id,operation_date,source_row,hole_code_raw,
  meter_initial,meter_final,drilled_meters,prior_max_m,prior_last_date,gap_days,
  setup_source_row,setup_evidence_text,evidence_text,
  case
    when setup_source_row is not null and gap_days>=1 then 'explicit_setup_after_prior_campaign'
    when setup_source_row is not null then 'explicit_setup_same_day_reuse_candidate'
    when gap_days>=7 then 'depth_reset_after_date_gap'
    else 'review_reset'
  end as split_evidence_class,
  'candidate_only'::text as review_state,
  'Confirmar si el codigo RAW fue reutilizado para una perforacion fisica distinta antes de separar campañas.'::text as required_action
from starts
where prior_max_m>=50
  and (setup_source_row is not null or gap_days>=7);

revoke all on public.production_geology_campaign_split_candidates_v1 from anon;
revoke all on public.production_geology_campaign_split_candidates_v1 from authenticated;
revoke all on public.production_geology_campaign_split_candidates_v1 from service_role;
grant select on public.production_geology_campaign_split_candidates_v1 to authenticated;
grant select on public.production_geology_campaign_split_candidates_v1 to service_role;
