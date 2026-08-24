-- Canonical deterministic fine-copper projection.
-- Recovered fine Cu is calculated only when dry tons, head grade and recovery are evidenced.

create or replace view public.production_fine_copper_v1
with (security_invoker = true) as
select
  m.organization_id,
  m.plant_shift_id,
  m.metallurgy_result_id,
  m.operation_date,
  m.shift_code,
  m.source_file,
  m.source_sheet,
  m.source_row,
  m.treated_metric_tons as treated_wet_metric_tons,
  m.mineral_dry_metric_tons,
  m.mineral_moisture_pct,
  m.head_grade as head_grade_pct,
  m.feed_fine_metric_tons as contained_feed_cu_metric_tons,
  coalesce(m.recovery_reported, m.recovery_by_grades_pct) as recovery_pct,
  case
    when m.metallurgy_state = 'assayed'
     and m.mineral_dry_metric_tons is not null
     and m.head_grade is not null
     and coalesce(m.recovery_reported, m.recovery_by_grades_pct) is not null
    then m.mineral_dry_metric_tons
         * (m.head_grade / 100.0)
         * (coalesce(m.recovery_reported, m.recovery_by_grades_pct) / 100.0)
    else null
  end as recovered_fine_cu_metric_tons,
  case
    when m.metallurgy_state <> 'assayed' then 'no_assay'
    when m.mineral_dry_metric_tons is null then 'missing_dry_tons'
    when m.head_grade is null then 'missing_head_grade'
    when coalesce(m.recovery_reported, m.recovery_by_grades_pct) is null then 'missing_recovery'
    else 'deterministic'
  end as fine_state,
  case
    when m.recovery_reported is not null then 'reported_recovery'
    when m.recovery_by_grades_pct is not null then 'recovery_by_grades'
    else null
  end as recovery_source,
  'dry_tons_x_head_grade_x_recovery_v1'::text as fine_rule_version,
  m.deterministic_hash
from public.production_metallurgy_deterministic_v2 m;

revoke all on public.production_fine_copper_v1 from anon, authenticated;
grant select on public.production_fine_copper_v1 to service_role;

create or replace view public.production_fine_copper_daily_v1
with (security_invoker = true) as
select
  organization_id,
  operation_date,
  count(*) as shifts,
  count(*) filter (where fine_state = 'deterministic') as deterministic_shifts,
  sum(treated_wet_metric_tons) as treated_wet_metric_tons,
  sum(mineral_dry_metric_tons) as mineral_dry_metric_tons,
  sum(contained_feed_cu_metric_tons) as contained_feed_cu_metric_tons,
  sum(recovered_fine_cu_metric_tons) as recovered_fine_cu_metric_tons,
  case
    when sum(mineral_dry_metric_tons) filter (where fine_state = 'deterministic') > 0
    then sum((mineral_dry_metric_tons * head_grade_pct)) filter (where fine_state = 'deterministic')
         / sum(mineral_dry_metric_tons) filter (where fine_state = 'deterministic')
    else null
  end as avg_head_grade_pct,
  case
    when sum(contained_feed_cu_metric_tons) filter (where fine_state = 'deterministic') > 0
    then sum(recovered_fine_cu_metric_tons) filter (where fine_state = 'deterministic')
         / sum(contained_feed_cu_metric_tons) filter (where fine_state = 'deterministic') * 100.0
    else null
  end as effective_recovery_pct,
  sum(treated_wet_metric_tons) filter (where fine_state <> 'deterministic') as treated_wet_tons_without_fine,
  case
    when count(*) filter (where fine_state = 'deterministic') = count(*) then 'complete'
    when count(*) filter (where fine_state = 'deterministic') = 0 then 'no_assay'
    else 'partial'
  end as fine_coverage_state
from public.production_fine_copper_v1
group by organization_id, operation_date;

revoke all on public.production_fine_copper_daily_v1 from anon, authenticated;
grant select on public.production_fine_copper_daily_v1 to service_role;
