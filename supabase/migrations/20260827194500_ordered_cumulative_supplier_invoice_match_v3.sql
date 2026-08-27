create or replace view intelligence.procurement_three_way_match_lines_v1
with (security_invoker=true)
as
with receipts as (
  select rl.organization_id,
         rl.order_line_id,
         sum(rl.quantity_accepted) as quantity_accepted,
         sum(rl.quantity_rejected) as quantity_rejected,
         max(r.received_at) as last_received_at
  from public.procurement_operational_receipt_lines rl
  join public.procurement_operational_receipts r
    on r.id=rl.receipt_id and r.organization_id=rl.organization_id
  group by rl.organization_id,rl.order_line_id
), invoice_per_order_line as (
  select il.organization_id,
         il.invoice_id,
         il.order_line_id,
         i.created_at as invoice_created_at,
         sum(il.quantity) as invoice_quantity
  from public.procurement_supplier_invoice_lines il
  join public.procurement_supplier_invoices i
    on i.id=il.invoice_id and i.organization_id=il.organization_id
  where i.status <> 'rejected'
  group by il.organization_id,il.invoice_id,il.order_line_id,i.created_at
), cumulative as (
  select organization_id,
         invoice_id,
         order_line_id,
         invoice_quantity,
         coalesce(sum(invoice_quantity) over (
           partition by organization_id,order_line_id
           order by invoice_created_at,invoice_id
           rows between unbounded preceding and 1 preceding
         ),0::numeric) as prior_invoiced_quantity,
         sum(invoice_quantity) over (
           partition by organization_id,order_line_id
           order by invoice_created_at,invoice_id
           rows between unbounded preceding and current row
         ) as cumulative_invoiced_quantity
  from invoice_per_order_line
)
select i.organization_id,
       i.id as invoice_id,
       i.invoice_number,
       i.invoice_date,
       i.status as invoice_status,
       i.order_id,
       o.order_number,
       o.supplier_id,
       o.cost_center_id,
       il.id as invoice_line_id,
       il.order_line_id,
       ol.canonical_product_id,
       ol.product_code,
       ol.description,
       ol.quantity_ordered,
       coalesce(r.quantity_accepted,0::numeric) as quantity_accepted,
       coalesce(r.quantity_rejected,0::numeric) as quantity_rejected,
       il.quantity as quantity_invoiced,
       ol.unit_cost as ordered_unit_cost,
       il.unit_cost as invoiced_unit_cost,
       il.quantity*il.unit_cost as invoiced_line_amount,
       il.unit_cost-ol.unit_cost as unit_cost_variance,
       coalesce(c.cumulative_invoiced_quantity,il.quantity)-ol.quantity_ordered as quantity_vs_order_variance,
       coalesce(c.cumulative_invoiced_quantity,il.quantity)-coalesce(r.quantity_accepted,0::numeric) as quantity_vs_receipt_variance,
       r.last_received_at,
       case
         when il.canonical_product_id is distinct from ol.canonical_product_id then 'product_mismatch'::text
         when coalesce(c.cumulative_invoiced_quantity,il.quantity) > ol.quantity_ordered then 'quantity_over_order'::text
         when coalesce(r.quantity_accepted,0::numeric) <= 0::numeric then 'pending_receipt'::text
         when coalesce(c.cumulative_invoiced_quantity,il.quantity) > coalesce(r.quantity_accepted,0::numeric) then 'quantity_over_receipt'::text
         when abs(il.unit_cost-ol.unit_cost) > 0.01 then 'price_mismatch'::text
         else 'matched'::text
       end as line_match_status,
       coalesce(c.prior_invoiced_quantity,0::numeric) as prior_invoiced_quantity,
       coalesce(c.cumulative_invoiced_quantity,il.quantity) as cumulative_invoiced_quantity
from public.procurement_supplier_invoice_lines il
join public.procurement_supplier_invoices i
  on i.id=il.invoice_id and i.organization_id=il.organization_id
join public.procurement_operational_order_lines ol
  on ol.id=il.order_line_id and ol.organization_id=il.organization_id
join public.procurement_operational_orders o
  on o.id=i.order_id and o.id=ol.order_id and o.organization_id=i.organization_id
left join receipts r
  on r.organization_id=il.organization_id and r.order_line_id=il.order_line_id
left join cumulative c
  on c.organization_id=il.organization_id and c.invoice_id=il.invoice_id and c.order_line_id=il.order_line_id;
