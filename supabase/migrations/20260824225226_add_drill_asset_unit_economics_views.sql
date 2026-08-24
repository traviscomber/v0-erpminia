create or replace view public.drill_asset_unit_economics_monthly_v1 as
with rigs as (
  select distinct organization_id, target_asset_id as canonical_asset_id,
         target_asset_code as asset_code, target_asset_name as asset_name
  from public.asset_identity_merge_plan_v1
), cost_monthly as (
  select l.organization_id, l.canonical_asset_id,
         date_trunc('month', l.event_at)::date as month_start,
         count(*) filter (where l.recognition_status='recognized') as recognized_cost_events,
         sum(l.amount) filter (where l.recognition_status='recognized' and l.currency='CLP') as recognized_cost_clp,
         max(l.event_at::date) filter (where l.recognition_status='recognized') as last_cost_date
  from public.canonical_clp_cost_ledger l
  join rigs r on r.organization_id=l.organization_id and r.canonical_asset_id=l.canonical_asset_id
  group by l.organization_id,l.canonical_asset_id,date_trunc('month',l.event_at)::date
), drill_monthly as (
  select d.organization_id,d.canonical_asset_id,
         date_trunc('month',d.operation_date)::date as month_start,
         count(*) as drilling_reports,
         sum(d.drilled_meters) as drilled_meters,
         max(d.operation_date) as last_drilling_date
  from public.production_drilling_source_reports d
  join rigs r on r.organization_id=d.organization_id and r.canonical_asset_id=d.canonical_asset_id
  where d.canonical_asset_id is not null
  group by d.organization_id,d.canonical_asset_id,date_trunc('month',d.operation_date)::date
), months as (
  select organization_id,canonical_asset_id,month_start from cost_monthly
  union
  select organization_id,canonical_asset_id,month_start from drill_monthly
)
select r.organization_id,r.canonical_asset_id,r.asset_code,r.asset_name,m.month_start,
       (m.month_start + interval '1 month - 1 day')::date as month_end,
       c.recognized_cost_events,c.recognized_cost_clp,c.last_cost_date,
       d.drilling_reports,d.drilled_meters,d.last_drilling_date,
       case when c.recognized_cost_clp is not null and d.drilled_meters is not null and d.drilled_meters>0
            then round(c.recognized_cost_clp/d.drilled_meters,2) else null end as cost_clp_per_meter,
       case when c.recognized_cost_clp is not null and d.drilled_meters is not null and d.drilled_meters>0
            then 'comparable' else 'incomplete_pair' end as evidence_status
from months m
join rigs r on r.organization_id=m.organization_id and r.canonical_asset_id=m.canonical_asset_id
left join cost_monthly c on c.organization_id=m.organization_id and c.canonical_asset_id=m.canonical_asset_id and c.month_start=m.month_start
left join drill_monthly d on d.organization_id=m.organization_id and d.canonical_asset_id=m.canonical_asset_id and d.month_start=m.month_start;

create or replace view public.drill_asset_unit_economics_90d_v1 as
with rigs as (
  select distinct organization_id,target_asset_id as canonical_asset_id,
         target_asset_code as asset_code,target_asset_name as asset_name
  from public.asset_identity_merge_plan_v1
), coverage as (
  select r.organization_id,r.canonical_asset_id,r.asset_code,r.asset_name,
         max(l.event_at::date) filter (where l.recognition_status='recognized') as last_cost_date,
         max(d.operation_date) as last_drilling_date
  from rigs r
  left join public.canonical_clp_cost_ledger l on l.organization_id=r.organization_id and l.canonical_asset_id=r.canonical_asset_id
  left join public.production_drilling_source_reports d on d.organization_id=r.organization_id and d.canonical_asset_id=r.canonical_asset_id
  group by r.organization_id,r.canonical_asset_id,r.asset_code,r.asset_name
), windows as (
  select *, least(last_cost_date,last_drilling_date) as window_end,
         (least(last_cost_date,last_drilling_date)-89) as window_start
  from coverage
  where last_cost_date is not null and last_drilling_date is not null
), cost_90 as (
  select w.organization_id,w.canonical_asset_id,
         count(*) filter (where l.recognition_status='recognized') as recognized_cost_events_90d,
         sum(l.amount) filter (where l.recognition_status='recognized' and l.currency='CLP') as recognized_cost_clp_90d
  from windows w
  left join public.canonical_clp_cost_ledger l
    on l.organization_id=w.organization_id and l.canonical_asset_id=w.canonical_asset_id
   and l.event_at::date between w.window_start and w.window_end
  group by w.organization_id,w.canonical_asset_id
), drill_90 as (
  select w.organization_id,w.canonical_asset_id,count(d.id) as drilling_reports_90d,
         sum(d.drilled_meters) as drilled_meters_90d
  from windows w
  left join public.production_drilling_source_reports d
    on d.organization_id=w.organization_id and d.canonical_asset_id=w.canonical_asset_id
   and d.operation_date between w.window_start and w.window_end
  group by w.organization_id,w.canonical_asset_id
)
select w.organization_id,w.canonical_asset_id,w.asset_code,w.asset_name,
       w.window_start,w.window_end,w.last_cost_date,w.last_drilling_date,
       c.recognized_cost_events_90d,c.recognized_cost_clp_90d,
       d.drilling_reports_90d,d.drilled_meters_90d,
       case when c.recognized_cost_clp_90d is not null and d.drilled_meters_90d is not null and d.drilled_meters_90d>0
            then round(c.recognized_cost_clp_90d/d.drilled_meters_90d,2) else null end as cost_clp_per_meter_90d,
       case when c.recognized_cost_clp_90d is not null and d.drilled_meters_90d is not null and d.drilled_meters_90d>0
            then 'comparable_at_common_cut' else 'insufficient_overlap' end as evidence_status
from windows w
left join cost_90 c on c.organization_id=w.organization_id and c.canonical_asset_id=w.canonical_asset_id
left join drill_90 d on d.organization_id=w.organization_id and d.canonical_asset_id=w.canonical_asset_id;