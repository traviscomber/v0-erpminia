create or replace view public.production_chemistry_sector_source_summary_v1 as
select
  s.organization_id,
  coalesce(ms.name, 'Sin mina') as mine_name,
  nullif(s.source_payload->>'sector_raw','') as sector_raw,
  count(distinct s.id)::int as sample_count,
  count(r.id)::int as result_count,
  min(s.sample_date) as first_sample_date,
  max(s.sample_date) as last_sample_date,
  round(avg(r.result_value) filter (where r.analyte_code='CU'), 4) as avg_cu_pct,
  min(r.result_value) filter (where r.analyte_code='CU') as min_cu_pct,
  max(r.result_value) filter (where r.analyte_code='CU') as max_cu_pct,
  count(distinct s.drill_hole_id)::int as linked_holes,
  count(distinct s.mine_sector_id)::int as linked_canonical_sectors,
  case
    when count(distinct s.drill_hole_id) > 0 then 'hole_linked'
    when count(distinct s.mine_sector_id) > 0 then 'sector_linked'
    else 'source_location_only'
  end as resolution_state
from public.production_chemistry_samples s
left join public.production_chemistry_results r on r.sample_id=s.id
left join public.production_mine_sources ms on ms.id=s.mine_source_id
where s.validation_status='valid'
group by s.organization_id, coalesce(ms.name, 'Sin mina'), nullif(s.source_payload->>'sector_raw','');
