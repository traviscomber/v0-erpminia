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
), invoice_totals as (
  select il.organization_id,
         il.order_line_id,
         sum(il.quantity) as cumulative_invoiced_quantity
  from public.procurement_supplier_invoice_lines il
  join public.procurement_supplier_invoices ih
    on ih.id=il.invoice_id and ih.organization_id=il.organization_id
  where ih.status <> 'rejected'
  group by il.organization_id,il.order_line_id
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
       coalesce(it.cumulative_invoiced_quantity,il.quantity)-ol.quantity_ordered as quantity_vs_order_variance,
       coalesce(it.cumulative_invoiced_quantity,il.quantity)-coalesce(r.quantity_accepted,0::numeric) as quantity_vs_receipt_variance,
       r.last_received_at,
       case
         when il.canonical_product_id is distinct from ol.canonical_product_id then 'product_mismatch'::text
         when coalesce(it.cumulative_invoiced_quantity,il.quantity) > ol.quantity_ordered then 'quantity_over_order'::text
         when coalesce(r.quantity_accepted,0::numeric) <= 0::numeric then 'pending_receipt'::text
         when coalesce(it.cumulative_invoiced_quantity,il.quantity) > coalesce(r.quantity_accepted,0::numeric) then 'quantity_over_receipt'::text
         when abs(il.unit_cost-ol.unit_cost) > 0.01 then 'price_mismatch'::text
         else 'matched'::text
       end as line_match_status,
       greatest(coalesce(it.cumulative_invoiced_quantity,il.quantity)-il.quantity,0::numeric) as prior_invoiced_quantity,
       coalesce(it.cumulative_invoiced_quantity,il.quantity) as cumulative_invoiced_quantity
from public.procurement_supplier_invoice_lines il
join public.procurement_supplier_invoices i
  on i.id=il.invoice_id and i.organization_id=il.organization_id
join public.procurement_operational_order_lines ol
  on ol.id=il.order_line_id and ol.organization_id=il.organization_id
join public.procurement_operational_orders o
  on o.id=i.order_id and o.id=ol.order_id and o.organization_id=i.organization_id
left join receipts r
  on r.organization_id=il.organization_id and r.order_line_id=il.order_line_id
left join invoice_totals it
  on it.organization_id=il.organization_id and it.order_line_id=il.order_line_id;

create or replace view public.procurement_three_way_match_lines_v1
with (security_invoker=true)
as
select organization_id,invoice_id,invoice_number,invoice_date,invoice_status,order_id,order_number,supplier_id,cost_center_id,
       invoice_line_id,order_line_id,canonical_product_id,product_code,description,quantity_ordered,quantity_accepted,quantity_rejected,
       quantity_invoiced,ordered_unit_cost,invoiced_unit_cost,invoiced_line_amount,unit_cost_variance,quantity_vs_order_variance,
       quantity_vs_receipt_variance,last_received_at,line_match_status,prior_invoiced_quantity,cumulative_invoiced_quantity
from intelligence.procurement_three_way_match_lines_v1;

create or replace view public.procurement_invoiceable_order_lines_v1
with (security_invoker=true)
as
with receipts as (
  select rl.organization_id,rl.order_line_id,sum(rl.quantity_accepted) as quantity_accepted
  from public.procurement_operational_receipt_lines rl
  join public.procurement_operational_receipts r on r.id=rl.receipt_id and r.organization_id=rl.organization_id
  group by rl.organization_id,rl.order_line_id
), invoiced as (
  select il.organization_id,il.order_line_id,sum(il.quantity) as quantity_invoiced
  from public.procurement_supplier_invoice_lines il
  join public.procurement_supplier_invoices i on i.id=il.invoice_id and i.organization_id=il.organization_id
  where i.status <> 'rejected'
  group by il.organization_id,il.order_line_id
)
select ol.organization_id,
       ol.order_id,
       ol.id as order_line_id,
       ol.canonical_product_id,
       ol.product_code,
       ol.description,
       ol.unit,
       ol.unit_cost,
       ol.quantity_ordered,
       coalesce(r.quantity_accepted,0::numeric) as quantity_accepted,
       coalesce(iv.quantity_invoiced,0::numeric) as quantity_invoiced,
       greatest(least(ol.quantity_ordered,coalesce(r.quantity_accepted,0::numeric))-coalesce(iv.quantity_invoiced,0::numeric),0::numeric) as quantity_invoiceable
from public.procurement_operational_order_lines ol
left join receipts r on r.organization_id=ol.organization_id and r.order_line_id=ol.id
left join invoiced iv on iv.organization_id=ol.organization_id and iv.order_line_id=ol.id;

create or replace function public.refresh_supplier_invoice_match_v1(p_invoice_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public','intelligence','canonical','pg_temp'
as $$
declare
  v_org uuid;
  v_order_id uuid;
  v_match text;
  v_current_status text;
  v_new_status text;
begin
  select organization_id,order_id,status into v_org,v_order_id,v_current_status
  from public.procurement_supplier_invoices
  where id=p_invoice_id
  for update;
  if not found then raise exception 'Factura proveedor no encontrada'; end if;
  if v_org not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;

  perform 1 from public.procurement_operational_orders
  where id=v_order_id and organization_id=v_org
  for update;

  v_match := public.sync_supplier_invoice_match_exceptions_v1(p_invoice_id);
  v_new_status := case when v_match='matched' then 'matched' when v_match='pending_receipt' then 'pending_match' else 'exception' end;
  if v_current_status not in ('approved','rejected') then
    update public.procurement_supplier_invoices set status=v_new_status,updated_at=now() where id=p_invoice_id;
  end if;
  return v_match;
end;
$$;

create or replace function public.sync_supplier_invoice_match_exceptions_v1(p_invoice_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public','intelligence','canonical','pg_temp'
as $$
declare
  v_org uuid;
  v_match text;
begin
  select organization_id into v_org from public.procurement_supplier_invoices where id=p_invoice_id;
  if not found then raise exception 'Factura proveedor no encontrada'; end if;
  if v_org not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;

  select match_status into v_match from public.procurement_three_way_match_summary_v1 where invoice_id=p_invoice_id and organization_id=v_org;
  v_match := coalesce(v_match,'no_lines');

  delete from public.procurement_match_exceptions where invoice_id=p_invoice_id and organization_id=v_org and status='open';

  insert into public.procurement_match_exceptions(organization_id,invoice_id,order_line_id,exception_type,expected_value,actual_value,difference,status)
  select l.organization_id,l.invoice_id,l.order_line_id,
         case when l.line_match_status in ('quantity_over_order','quantity_over_receipt') then 'quantity'
              when l.line_match_status='price_mismatch' then 'unit_price'
              when l.line_match_status='pending_receipt' then 'missing_receipt'
              when l.line_match_status='product_mismatch' then 'unknown_product'
              else 'other' end,
         case when l.line_match_status='quantity_over_order' then l.quantity_ordered
              when l.line_match_status in ('quantity_over_receipt','pending_receipt') then l.quantity_accepted
              when l.line_match_status='price_mismatch' then l.ordered_unit_cost else null end,
         case when l.line_match_status in ('quantity_over_order','quantity_over_receipt','pending_receipt') then l.cumulative_invoiced_quantity
              when l.line_match_status='price_mismatch' then l.invoiced_unit_cost else null end,
         case when l.line_match_status='quantity_over_order' then l.cumulative_invoiced_quantity-l.quantity_ordered
              when l.line_match_status in ('quantity_over_receipt','pending_receipt') then l.cumulative_invoiced_quantity-l.quantity_accepted
              when l.line_match_status='price_mismatch' then l.invoiced_unit_cost-l.ordered_unit_cost else null end,
         'open'
  from public.procurement_three_way_match_lines_v1 l
  where l.invoice_id=p_invoice_id and l.organization_id=v_org and l.line_match_status<>'matched'
    and not exists (
      select 1 from public.procurement_match_exceptions e
      where e.invoice_id=l.invoice_id and e.organization_id=l.organization_id and e.order_line_id=l.order_line_id and e.status='accepted'
        and e.exception_type=case when l.line_match_status in ('quantity_over_order','quantity_over_receipt') then 'quantity'
                                  when l.line_match_status='price_mismatch' then 'unit_price'
                                  when l.line_match_status='pending_receipt' then 'missing_receipt'
                                  when l.line_match_status='product_mismatch' then 'unknown_product' else 'other' end
        and e.expected_value is not distinct from case when l.line_match_status='quantity_over_order' then l.quantity_ordered
                                                        when l.line_match_status in ('quantity_over_receipt','pending_receipt') then l.quantity_accepted
                                                        when l.line_match_status='price_mismatch' then l.ordered_unit_cost else null end
        and e.actual_value is not distinct from case when l.line_match_status in ('quantity_over_order','quantity_over_receipt','pending_receipt') then l.cumulative_invoiced_quantity
                                                     when l.line_match_status='price_mismatch' then l.invoiced_unit_cost else null end
    );

  if v_match in ('supplier_mismatch','currency_mismatch','no_lines','amount_mismatch') then
    insert into public.procurement_match_exceptions(organization_id,invoice_id,order_line_id,exception_type,expected_value,actual_value,difference,status)
    select s.organization_id,s.invoice_id,null,
           case when s.match_status='amount_mismatch' then 'total' else 'other' end,
           case when s.match_status='amount_mismatch' then s.lines_net_amount else null end,
           case when s.match_status='amount_mismatch' then s.net_amount else null end,
           case when s.match_status='amount_mismatch' then s.net_amount-s.lines_net_amount else null end,
           'open'
    from public.procurement_three_way_match_summary_v1 s
    where s.invoice_id=p_invoice_id and s.organization_id=v_org
      and not exists (
        select 1 from public.procurement_match_exceptions e
        where e.invoice_id=s.invoice_id and e.organization_id=s.organization_id and e.order_line_id is null and e.status='accepted'
          and e.exception_type=case when s.match_status='amount_mismatch' then 'total' else 'other' end
          and e.expected_value is not distinct from case when s.match_status='amount_mismatch' then s.lines_net_amount else null end
          and e.actual_value is not distinct from case when s.match_status='amount_mismatch' then s.net_amount else null end
      );
  end if;
  return v_match;
end;
$$;

revoke all on public.procurement_three_way_match_lines_v1 from public,anon,authenticated;
grant select on public.procurement_three_way_match_lines_v1 to service_role;
revoke all on public.procurement_invoiceable_order_lines_v1 from public,anon,authenticated;
grant select on public.procurement_invoiceable_order_lines_v1 to service_role;
revoke all on function public.refresh_supplier_invoice_match_v1(uuid) from public,anon,authenticated;
grant execute on function public.refresh_supplier_invoice_match_v1(uuid) to service_role;
revoke all on function public.sync_supplier_invoice_match_exceptions_v1(uuid) from public,anon,authenticated;
grant execute on function public.sync_supplier_invoice_match_exceptions_v1(uuid) to service_role;
