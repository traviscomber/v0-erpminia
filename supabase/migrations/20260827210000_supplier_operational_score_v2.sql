create or replace view intelligence.supplier_operational_score_v2
with (security_invoker=true) as
with order_metrics as (
  select o.organization_id,
         o.supplier_id,
         count(*) as total_orders,
         count(*) filter (where o.status in ('received','closed')) as completed_orders,
         count(*) filter (where o.status in ('received','closed') and o.expected_delivery_date is not null and o.actual_delivery_date is not null) as delivery_scored_orders,
         count(*) filter (where o.status in ('received','closed') and o.expected_delivery_date is not null and o.actual_delivery_date is not null and o.actual_delivery_date <= o.expected_delivery_date) as on_time_orders,
         max(o.actual_delivery_date) as last_delivery_date
  from public.procurement_operational_orders o
  group by o.organization_id,o.supplier_id
), receipt_metrics as (
  select o.organization_id,
         o.supplier_id,
         count(distinct r.id) as receipt_count,
         coalesce(sum(rl.quantity_received),0)::numeric as quantity_received,
         coalesce(sum(rl.quantity_accepted),0)::numeric as quantity_accepted,
         coalesce(sum(rl.quantity_rejected),0)::numeric as quantity_rejected
  from public.procurement_operational_orders o
  join public.procurement_operational_receipts r on r.organization_id=o.organization_id and r.order_id=o.id
  join public.procurement_operational_receipt_lines rl on rl.organization_id=r.organization_id and rl.receipt_id=r.id
  group by o.organization_id,o.supplier_id
), invoice_metrics as (
  select i.organization_id,
         i.supplier_id,
         count(*) filter (where i.status in ('matched','approved','rejected')) as invoice_scored_count,
         count(*) filter (where i.status='matched' or (i.status='approved' and i.approval_basis='matched')) as invoice_clean_match_count,
         count(*) filter (where i.status='approved' and i.approval_basis='accepted_exception') as invoice_exception_accepted_count,
         count(*) filter (where i.status='rejected') as invoice_rejected_count
  from public.procurement_supplier_invoices i
  group by i.organization_id,i.supplier_id
), return_metrics as (
  select r.organization_id,
         r.supplier_id,
         count(*) filter (where r.status<>'cancelled') as returns_count,
         count(*) filter (where r.status='resolved') as resolved_returns_count,
         coalesce(sum(rl.quantity) filter (where r.status<>'cancelled'),0)::numeric as returned_quantity
  from public.procurement_supplier_returns r
  left join public.procurement_supplier_return_lines rl on rl.organization_id=r.organization_id and rl.return_id=r.id
  group by r.organization_id,r.supplier_id
), base as (
  select s.organization_id,
         s.id as supplier_id,
         s.tax_id as supplier_tax_id,
         coalesce(s.trade_name,s.legal_name) as supplier_name,
         s.legal_name as supplier_legal_name,
         coalesce(o.total_orders,0) as total_orders,
         coalesce(o.completed_orders,0) as completed_orders,
         coalesce(o.delivery_scored_orders,0) as delivery_scored_orders,
         coalesce(o.on_time_orders,0) as on_time_orders,
         o.last_delivery_date,
         coalesce(r.receipt_count,0) as receipt_count,
         coalesce(r.quantity_received,0) as quantity_received,
         coalesce(r.quantity_accepted,0) as quantity_accepted,
         coalesce(r.quantity_rejected,0) as quantity_rejected,
         coalesce(i.invoice_scored_count,0) as invoice_scored_count,
         coalesce(i.invoice_clean_match_count,0) as invoice_clean_match_count,
         coalesce(i.invoice_exception_accepted_count,0) as invoice_exception_accepted_count,
         coalesce(i.invoice_rejected_count,0) as invoice_rejected_count,
         coalesce(rt.returns_count,0) as returns_count,
         coalesce(rt.resolved_returns_count,0) as resolved_returns_count,
         coalesce(rt.returned_quantity,0) as returned_quantity,
         case when coalesce(o.delivery_scored_orders,0)>0 then round(100.0*o.on_time_orders/o.delivery_scored_orders,2) end as delivery_score,
         case when coalesce(r.quantity_received,0)>0 then round(100.0*r.quantity_accepted/r.quantity_received,2) end as quality_score,
         case when coalesce(i.invoice_scored_count,0)>0 then round(100.0*i.invoice_clean_match_count/i.invoice_scored_count,2) end as invoice_score
  from canonical.suppliers s
  left join order_metrics o on o.organization_id=s.organization_id and o.supplier_id=s.id
  left join receipt_metrics r on r.organization_id=s.organization_id and r.supplier_id=s.id
  left join invoice_metrics i on i.organization_id=s.organization_id and i.supplier_id=s.id
  left join return_metrics rt on rt.organization_id=s.organization_id and rt.supplier_id=s.id
  where s.is_active=true
)
select b.*,
       ((b.delivery_score is not null)::int + (b.quality_score is not null)::int + (b.invoice_score is not null)::int) as evidence_dimensions,
       case
         when ((b.delivery_score is not null)::int + (b.quality_score is not null)::int + (b.invoice_score is not null)::int)=0 then null
         else round((coalesce(b.delivery_score,0)+coalesce(b.quality_score,0)+coalesce(b.invoice_score,0)) /
                    ((b.delivery_score is not null)::int + (b.quality_score is not null)::int + (b.invoice_score is not null)::int),2)
       end as operational_score,
       'v2_equal_available_dimensions'::text as score_version
from base b;

create or replace view public.supplier_operational_score_v2
with (security_invoker=true) as
select * from intelligence.supplier_operational_score_v2;

revoke all on intelligence.supplier_operational_score_v2 from public,anon,authenticated;
revoke all on public.supplier_operational_score_v2 from public,anon,authenticated;
grant select on intelligence.supplier_operational_score_v2 to service_role;
grant select on public.supplier_operational_score_v2 to service_role;
