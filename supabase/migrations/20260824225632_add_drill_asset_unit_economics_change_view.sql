create or replace view public.drill_asset_unit_economics_change_v1 as
with ranked as (
  select m.*,
         row_number() over(partition by m.organization_id,m.canonical_asset_id order by m.month_start desc) as rn
  from public.drill_asset_unit_economics_monthly_v1 m
  where m.evidence_status='comparable'
), latest as (
  select * from ranked where rn=1
), previous as (
  select * from ranked where rn=2
)
select l.organization_id,l.canonical_asset_id,l.asset_code,l.asset_name,
       l.month_start as current_month,p.month_start as previous_month,
       l.cost_clp_per_meter as current_cost_clp_per_meter,
       p.cost_clp_per_meter as previous_cost_clp_per_meter,
       l.recognized_cost_clp as current_cost_clp,
       p.recognized_cost_clp as previous_cost_clp,
       l.drilled_meters as current_drilled_meters,
       p.drilled_meters as previous_drilled_meters,
       case when p.cost_clp_per_meter is not null and p.cost_clp_per_meter<>0 and l.cost_clp_per_meter is not null
            then round(100*(l.cost_clp_per_meter-p.cost_clp_per_meter)/abs(p.cost_clp_per_meter),2)
            else null end as cost_per_meter_change_pct,
       case when p.drilled_meters is not null and p.drilled_meters<>0 and l.drilled_meters is not null
            then round(100*(l.drilled_meters-p.drilled_meters)/abs(p.drilled_meters),2)
            else null end as drilled_meters_change_pct,
       case when p.recognized_cost_clp is not null and p.recognized_cost_clp<>0 and l.recognized_cost_clp is not null
            then round(100*(l.recognized_cost_clp-p.recognized_cost_clp)/abs(p.recognized_cost_clp),2)
            else null end as recognized_cost_change_pct,
       'observed_change_only'::text as interpretation_policy
from latest l
join previous p on p.organization_id=l.organization_id and p.canonical_asset_id=l.canonical_asset_id;