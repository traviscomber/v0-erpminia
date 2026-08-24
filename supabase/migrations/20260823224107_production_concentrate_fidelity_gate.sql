create or replace view production_concentrate_fidelity_quality_v1 as
with m as (
 select count(*)::int shifts,
        count(concentrate_wet_metric_tons)::int shifts_with_produced_concentrate
 from production_metallurgy_deterministic_v2 where source_file='LEY (1).xlsx'
), s as (
 select count(*)::int shipments,
        count(*) filter(where validation_status='valid')::int valid_shipments,
        count(*) filter(where validation_status='review')::int review_shipments,
        coalesce(sum(normalized_metric_tons),0)::numeric shipped_wet_t
 from production_concentrate_shipments where source_file='LEY (1).xlsx'
)
select 'canonical_august_shifts' check_key,'36' expected_value,m.shifts::text actual_value,case when m.shifts=36 then 'PASS' else 'HOLD' end status from m
union all select 'produced_concentrate_source_rows','0',m.shifts_with_produced_concentrate::text,case when m.shifts_with_produced_concentrate=0 then 'PASS' else 'HOLD' end from m
union all select 'canonical_august_shipments','14',s.shipments::text,case when s.shipments=14 then 'PASS' else 'HOLD' end from s
union all select 'valid_shipments','13',s.valid_shipments::text,case when s.valid_shipments=13 then 'PASS' else 'HOLD' end from s
union all select 'review_shipments','1',s.review_shipments::text,case when s.review_shipments=1 then 'PASS' else 'HOLD' end from s
union all select 'shipped_wet_concentrate_t','398.10',round(s.shipped_wet_t,2)::text,case when round(s.shipped_wet_t,2)=398.10 then 'PASS' else 'HOLD' end from s;
