create or replace view public.production_drill_hole_location_review_queue_v5 as
select
  q.*,
  case
    when q.review_lane = 'conflicto_fuente' then 'critico'
    when q.last_report_date >= date '2026-08-01' then 'activo_agosto'
    when q.last_report_date >= date '2026-07-01' then 'reciente_julio'
    else 'historico'
  end as operational_bucket,
  case
    when q.review_lane = 'conflicto_fuente' then 100
    when q.last_report_date >= date '2026-08-01' and q.review_lane='mina_conocida_falta_sector' then 95
    when q.last_report_date >= date '2026-07-01' and q.review_lane='mina_conocida_falta_sector' then 85
    when q.review_lane='mina_conocida_falta_sector' then 70
    else q.review_priority
  end as operational_priority
from public.production_drill_hole_location_review_queue_v4 q;
