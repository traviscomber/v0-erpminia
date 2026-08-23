create or replace view production_chemistry_lineage_v1 as
with base as (
  select cs.id sample_id, cs.organization_id, cs.sample_code, cs.sample_type, cs.sample_date,
         cs.mine_source_id, ms.name mine_name,
         cs.mine_sector_id, cs.drill_hole_id,
         cs.source_payload->>'sector_raw' sector_raw,
         regexp_replace(lower(coalesce(cs.source_payload->>'sector_raw','')),'[^a-z0-9]+',' ','g') sector_norm,
         cr.result_value cu_pct, cr.source_file, cr.source_sheet, cr.source_row,
         cr.validation_status
  from production_chemistry_samples cs
  join production_chemistry_results cr on cr.sample_id=cs.id and cr.analyte_code='CU'
  left join production_mine_sources ms on ms.id=cs.mine_source_id
), exact_sector as (
  select b.sample_id, min(s.id::text)::uuid exact_sector_id, count(*)::int exact_matches
  from base b
  join production_mine_sectors s on s.organization_id=b.organization_id and s.mine_source_id=b.mine_source_id
   and s.normalized_name=b.sector_norm
  group by b.sample_id
)
select b.*,
       es.exact_sector_id,
       coalesce(es.exact_matches,0) exact_sector_matches,
       case
         when b.drill_hole_id is not null then 'hole_linked'
         when b.mine_sector_id is not null then 'sector_linked'
         when coalesce(es.exact_matches,0)=1 then 'exact_sector_candidate'
         when b.mine_source_id is not null then 'mine_only'
         else 'source_only'
       end lineage_status
from base b
left join exact_sector es on es.sample_id=b.sample_id;

create or replace view production_chemistry_mine_intelligence_v1 as
select organization_id,
       coalesce(mine_name,'Sin mina') mine_name,
       count(*)::int results,
       count(distinct sector_raw)::int raw_locations,
       round(avg(cu_pct),3) avg_cu_pct,
       min(cu_pct) min_cu_pct,
       max(cu_pct) max_cu_pct,
       min(sample_date) first_sample_date,
       max(sample_date) last_sample_date,
       count(*) filter(where mine_sector_id is not null or exact_sector_matches=1)::int sector_linked_results,
       count(*) filter(where drill_hole_id is not null)::int hole_linked_results
from production_chemistry_lineage_v1
group by organization_id,coalesce(mine_name,'Sin mina');

create or replace view production_chemistry_lineage_quality_v1 as
with q as (
 select count(*)::int results,
        count(*) filter(where mine_source_id is not null)::int mine_linked,
        count(*) filter(where mine_sector_id is not null)::int sector_linked,
        count(*) filter(where exact_sector_matches=1)::int exact_sector_candidates,
        count(*) filter(where drill_hole_id is not null)::int hole_linked
 from production_chemistry_lineage_v1
)
select 'chemistry_results' check_key,20 expected_value,results actual_value,case when results=20 then 'PASS' else 'HOLD' end status from q
union all select 'chemistry_mine_links',19,mine_linked,case when mine_linked=19 then 'PASS' else 'HOLD' end from q
union all select 'chemistry_sector_links_without_evidence',0,sector_linked,case when sector_linked=0 then 'PASS' else 'HOLD' end from q
union all select 'chemistry_exact_sector_candidates',0,exact_sector_candidates,case when exact_sector_candidates=0 then 'PASS' else 'HOLD' end from q
union all select 'chemistry_hole_links_without_evidence',0,hole_linked,case when hole_linked=0 then 'PASS' else 'HOLD' end from q;
