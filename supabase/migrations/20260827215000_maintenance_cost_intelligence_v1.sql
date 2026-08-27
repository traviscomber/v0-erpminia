create or replace view public.maintenance_cost_intelligence_base_v1
with (security_invoker=true)
as
with ranked_snapshots as (
  select s.*,
         row_number() over (
           partition by s.organization_id, s.work_order_id
           order by s.closure_sequence desc, s.closed_at desc, s.id desc
         ) as rn
  from public.work_order_closure_cost_snapshots s
)
select
  s.organization_id,
  s.work_order_id,
  wo.work_order_number,
  wo.work_type,
  nullif(trim(wo.root_cause), '') as root_cause,
  s.canonical_asset_id,
  a.asset_code,
  a.asset_name,
  a.asset_type,
  s.cost_center_id,
  cc.code as cost_center_code,
  cc.name as cost_center_name,
  s.closure_sequence,
  s.parts_cost,
  s.labor_cost,
  s.effective_external_cost as external_cost,
  s.total_cost,
  s.procurement_received_cost,
  s.procurement_currency,
  s.procurement_currency_count,
  s.closed_by,
  s.closed_at
from ranked_snapshots s
join public.maintenance_work_orders wo
  on wo.organization_id=s.organization_id and wo.id=s.work_order_id
left join public.maintenance_assets a
  on a.organization_id=s.organization_id and a.id=s.canonical_asset_id
left join public.cost_centers cc
  on cc.organization_id=s.organization_id and cc.id=s.cost_center_id
where s.rn=1;

create or replace view public.maintenance_cost_by_asset_v1
with (security_invoker=true)
as
select organization_id, canonical_asset_id, asset_code, asset_name, asset_type,
       count(*)::integer as audited_work_orders,
       sum(parts_cost)::numeric as parts_cost,
       sum(labor_cost)::numeric as labor_cost,
       sum(external_cost)::numeric as external_cost,
       sum(total_cost)::numeric as total_cost,
       avg(total_cost)::numeric as average_cost_per_work_order,
       max(closed_at) as last_closed_at
from public.maintenance_cost_intelligence_base_v1
where canonical_asset_id is not null
group by organization_id, canonical_asset_id, asset_code, asset_name, asset_type;

create or replace view public.maintenance_cost_by_cost_center_v1
with (security_invoker=true)
as
select organization_id, cost_center_id, cost_center_code, cost_center_name,
       count(*)::integer as audited_work_orders,
       sum(parts_cost)::numeric as parts_cost,
       sum(labor_cost)::numeric as labor_cost,
       sum(external_cost)::numeric as external_cost,
       sum(total_cost)::numeric as total_cost,
       avg(total_cost)::numeric as average_cost_per_work_order,
       max(closed_at) as last_closed_at
from public.maintenance_cost_intelligence_base_v1
where cost_center_id is not null
group by organization_id, cost_center_id, cost_center_code, cost_center_name;

create or replace view public.maintenance_cost_by_work_type_v1
with (security_invoker=true)
as
select organization_id, coalesce(nullif(trim(work_type), ''), 'Sin tipo') as work_type,
       count(*)::integer as audited_work_orders,
       sum(parts_cost)::numeric as parts_cost,
       sum(labor_cost)::numeric as labor_cost,
       sum(external_cost)::numeric as external_cost,
       sum(total_cost)::numeric as total_cost,
       avg(total_cost)::numeric as average_cost_per_work_order,
       max(closed_at) as last_closed_at
from public.maintenance_cost_intelligence_base_v1
group by organization_id, coalesce(nullif(trim(work_type), ''), 'Sin tipo');

create or replace view public.maintenance_cost_by_root_cause_v1
with (security_invoker=true)
as
select organization_id, root_cause,
       count(*)::integer as audited_work_orders,
       sum(parts_cost)::numeric as parts_cost,
       sum(labor_cost)::numeric as labor_cost,
       sum(external_cost)::numeric as external_cost,
       sum(total_cost)::numeric as total_cost,
       avg(total_cost)::numeric as average_cost_per_work_order,
       max(closed_at) as last_closed_at
from public.maintenance_cost_intelligence_base_v1
where root_cause is not null
group by organization_id, root_cause;

create or replace view public.maintenance_cost_intelligence_summary_v1
with (security_invoker=true)
as
with organizations as (
  select distinct organization_id from public.maintenance_work_orders
), completed as (
  select organization_id,
         count(*)::integer as completed_work_orders,
         count(*) filter (where canonical_asset_id is not null)::integer as completed_with_asset,
         count(*) filter (where cost_center_id is not null)::integer as completed_with_cost_center,
         count(*) filter (where nullif(trim(root_cause), '') is not null)::integer as completed_with_root_cause
  from public.maintenance_work_orders
  where status='completed'
  group by organization_id
), audited as (
  select organization_id,
         count(*)::integer as audited_work_orders,
         count(*) filter (where canonical_asset_id is not null)::integer as audited_with_asset,
         count(*) filter (where cost_center_id is not null)::integer as audited_with_cost_center,
         count(*) filter (where root_cause is not null)::integer as audited_with_root_cause,
         coalesce(sum(parts_cost),0)::numeric as parts_cost,
         coalesce(sum(labor_cost),0)::numeric as labor_cost,
         coalesce(sum(external_cost),0)::numeric as external_cost,
         coalesce(sum(total_cost),0)::numeric as audited_total_cost,
         max(closed_at) as last_audited_close_at
  from public.maintenance_cost_intelligence_base_v1
  group by organization_id
)
select o.organization_id,
       coalesce(c.completed_work_orders,0) as completed_work_orders,
       coalesce(a.audited_work_orders,0) as audited_work_orders,
       greatest(coalesce(c.completed_work_orders,0)-coalesce(a.audited_work_orders,0),0)::integer as completed_without_snapshot,
       case when coalesce(c.completed_work_orders,0)=0 then null
            else round((coalesce(a.audited_work_orders,0)::numeric / c.completed_work_orders::numeric) * 100, 1)
       end as audited_coverage_percent,
       coalesce(a.audited_with_asset,0) as audited_with_asset,
       coalesce(a.audited_with_cost_center,0) as audited_with_cost_center,
       coalesce(a.audited_with_root_cause,0) as audited_with_root_cause,
       coalesce(a.parts_cost,0)::numeric as parts_cost,
       coalesce(a.labor_cost,0)::numeric as labor_cost,
       coalesce(a.external_cost,0)::numeric as external_cost,
       coalesce(a.audited_total_cost,0)::numeric as audited_total_cost,
       a.last_audited_close_at
from organizations o
left join completed c using (organization_id)
left join audited a using (organization_id);

revoke all on public.maintenance_cost_intelligence_base_v1 from anon, authenticated;
revoke all on public.maintenance_cost_by_asset_v1 from anon, authenticated;
revoke all on public.maintenance_cost_by_cost_center_v1 from anon, authenticated;
revoke all on public.maintenance_cost_by_work_type_v1 from anon, authenticated;
revoke all on public.maintenance_cost_by_root_cause_v1 from anon, authenticated;
revoke all on public.maintenance_cost_intelligence_summary_v1 from anon, authenticated;
grant select on public.maintenance_cost_intelligence_base_v1 to service_role;
grant select on public.maintenance_cost_by_asset_v1 to service_role;
grant select on public.maintenance_cost_by_cost_center_v1 to service_role;
grant select on public.maintenance_cost_by_work_type_v1 to service_role;
grant select on public.maintenance_cost_by_root_cause_v1 to service_role;
grant select on public.maintenance_cost_intelligence_summary_v1 to service_role;
