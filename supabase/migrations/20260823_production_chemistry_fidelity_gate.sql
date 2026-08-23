create or replace view public.production_chemistry_fidelity_quality_v1 as
with s as (
  select count(*)::bigint samples,
         count(*) filter(where sample_type='special_punteo')::bigint special_punteo,
         count(*) filter(where sample_type='process_special')::bigint process_special,
         count(distinct source_hash)::bigint unique_sample_hashes,
         count(*) filter(where drill_hole_id is not null)::bigint linked_holes
  from public.production_chemistry_samples
), r as (
  select count(*)::bigint results,
         count(distinct source_hash)::bigint unique_result_hashes,
         count(*) filter(where analyte_code='CU' and result_value is not null)::bigint cu_results
  from public.production_chemistry_results
)
select 'chemistry_samples' check_key,20::bigint expected_value,s.samples actual_value,case when s.samples=20 then 'PASS' else 'HOLD' end status from s
union all select 'chemistry_results',20,r.results,case when r.results=20 then 'PASS' else 'HOLD' end from r
union all select 'chemistry_cu_results',20,r.cu_results,case when r.cu_results=20 then 'PASS' else 'HOLD' end from r
union all select 'chemistry_special_punteo',19,s.special_punteo,case when s.special_punteo=19 then 'PASS' else 'HOLD' end from s
union all select 'chemistry_process_special',1,s.process_special,case when s.process_special=1 then 'PASS' else 'HOLD' end from s
union all select 'chemistry_unique_sample_hashes',20,s.unique_sample_hashes,case when s.unique_sample_hashes=20 then 'PASS' else 'HOLD' end from s
union all select 'chemistry_unique_result_hashes',20,r.unique_result_hashes,case when r.unique_result_hashes=20 then 'PASS' else 'HOLD' end from r
union all select 'chemistry_hole_links_without_evidence',0,s.linked_holes,case when s.linked_holes=0 then 'PASS' else 'HOLD' end from s;
