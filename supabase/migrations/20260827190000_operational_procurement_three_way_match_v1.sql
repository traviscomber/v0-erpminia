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
  group by rl.organization_id, rl.order_line_id
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
       il.quantity * il.unit_cost as invoiced_line_amount,
       (il.unit_cost - ol.unit_cost) as unit_cost_variance,
       (il.quantity - ol.quantity_ordered) as quantity_vs_order_variance,
       (il.quantity - coalesce(r.quantity_accepted,0::numeric)) as quantity_vs_receipt_variance,
       r.last_received_at,
       case
         when il.canonical_product_id is distinct from ol.canonical_product_id then 'product_mismatch'
         when il.quantity > ol.quantity_ordered then 'quantity_over_order'
         when coalesce(r.quantity_accepted,0::numeric) <= 0 then 'pending_receipt'
         when il.quantity > coalesce(r.quantity_accepted,0::numeric) then 'quantity_over_receipt'
         when abs(il.unit_cost - ol.unit_cost) > 0.01 then 'price_mismatch'
         else 'matched'
       end as line_match_status
from public.procurement_supplier_invoice_lines il
join public.procurement_supplier_invoices i
  on i.id=il.invoice_id and i.organization_id=il.organization_id
join public.procurement_operational_order_lines ol
  on ol.id=il.order_line_id and ol.organization_id=il.organization_id
join public.procurement_operational_orders o
  on o.id=i.order_id and o.id=ol.order_id and o.organization_id=i.organization_id
left join receipts r
  on r.organization_id=il.organization_id and r.order_line_id=il.order_line_id;

create or replace view intelligence.procurement_three_way_match_summary_v1
with (security_invoker=true)
as
with line_summary as (
  select organization_id,
         invoice_id,
         count(*) as line_count,
         count(*) filter (where line_match_status='matched') as matched_line_count,
         count(*) filter (where line_match_status='pending_receipt') as pending_receipt_line_count,
         count(*) filter (where line_match_status not in ('matched','pending_receipt')) as exception_line_count,
         coalesce(sum(invoiced_line_amount),0::numeric) as lines_net_amount,
         max(last_received_at) as last_received_at
  from intelligence.procurement_three_way_match_lines_v1
  group by organization_id, invoice_id
)
select i.organization_id,
       i.id as invoice_id,
       i.invoice_number,
       i.invoice_date,
       i.status as stored_status,
       i.order_id,
       o.order_number,
       i.supplier_id,
       o.cost_center_id,
       i.currency,
       i.net_amount,
       i.tax_amount,
       i.total_amount,
       coalesce(ls.lines_net_amount,0::numeric) as lines_net_amount,
       coalesce(ls.line_count,0) as line_count,
       coalesce(ls.matched_line_count,0) as matched_line_count,
       coalesce(ls.pending_receipt_line_count,0) as pending_receipt_line_count,
       coalesce(ls.exception_line_count,0) as exception_line_count,
       ls.last_received_at,
       case
         when i.supplier_id is distinct from o.supplier_id then 'supplier_mismatch'
         when i.currency is distinct from o.currency then 'currency_mismatch'
         when coalesce(ls.line_count,0)=0 then 'no_lines'
         when abs(i.net_amount - coalesce(ls.lines_net_amount,0::numeric)) > 0.01 then 'amount_mismatch'
         when coalesce(ls.exception_line_count,0) > 0 then 'exception'
         when coalesce(ls.pending_receipt_line_count,0) > 0 then 'pending_receipt'
         else 'matched'
       end as match_status
from public.procurement_supplier_invoices i
join public.procurement_operational_orders o
  on o.id=i.order_id and o.organization_id=i.organization_id
left join line_summary ls
  on ls.organization_id=i.organization_id and ls.invoice_id=i.id;

create or replace function public.refresh_supplier_invoice_match_v1(p_invoice_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public','intelligence','canonical','pg_temp'
as $function$
declare
  v_org uuid;
  v_match text;
  v_new_status text;
begin
  select organization_id into v_org
  from public.procurement_supplier_invoices
  where id=p_invoice_id
  for update;
  if not found then raise exception 'Factura proveedor no encontrada'; end if;
  if v_org not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then
    raise exception 'Sin permisos';
  end if;

  select match_status into v_match
  from intelligence.procurement_three_way_match_summary_v1
  where invoice_id=p_invoice_id and organization_id=v_org;

  if v_match is null then v_match := 'no_lines'; end if;
  v_new_status := case when v_match='matched' then 'matched' when v_match='pending_receipt' then 'pending_match' else 'exception' end;
  update public.procurement_supplier_invoices
  set status=v_new_status, updated_at=now()
  where id=p_invoice_id;
  return v_match;
end
$function$;

create or replace function public.create_supplier_invoice_v1(
  p_order_id uuid,
  p_invoice_number text,
  p_invoice_date date,
  p_net_amount numeric,
  p_tax_amount numeric,
  p_total_amount numeric,
  p_lines jsonb,
  p_document_url text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public','intelligence','canonical','pg_temp'
as $function$
declare
  v_order public.procurement_operational_orders%rowtype;
  v_invoice_id uuid;
  v_line jsonb;
  v_order_line public.procurement_operational_order_lines%rowtype;
  v_qty numeric;
  v_unit_cost numeric;
begin
  select * into v_order from public.procurement_operational_orders where id=p_order_id for update;
  if not found then raise exception 'OC operativa no encontrada'; end if;
  if v_order.organization_id not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;
  if p_invoice_number is null or btrim(p_invoice_number)='' then raise exception 'Número de factura requerido'; end if;
  if p_invoice_date is null then raise exception 'Fecha de factura requerida'; end if;
  if p_net_amount < 0 or p_tax_amount < 0 or p_total_amount < 0 then raise exception 'Montos de factura inválidos'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines)=0 then raise exception 'Factura sin líneas'; end if;

  insert into public.procurement_supplier_invoices(
    organization_id,invoice_number,supplier_id,order_id,invoice_date,currency,net_amount,tax_amount,total_amount,status,document_url,created_by
  ) values (
    v_order.organization_id,btrim(p_invoice_number),v_order.supplier_id,v_order.id,p_invoice_date,v_order.currency,p_net_amount,p_tax_amount,p_total_amount,'pending_match',p_document_url,public.current_application_user_id()
  ) returning id into v_invoice_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_order_line
    from public.procurement_operational_order_lines
    where id=(v_line->>'order_line_id')::uuid
      and order_id=v_order.id
      and organization_id=v_order.organization_id;
    if not found then raise exception 'Línea de OC inválida en factura'; end if;
    v_qty := (v_line->>'quantity')::numeric;
    v_unit_cost := (v_line->>'unit_cost')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad facturada inválida'; end if;
    if v_unit_cost is null or v_unit_cost < 0 then raise exception 'Costo unitario facturado inválido'; end if;
    insert into public.procurement_supplier_invoice_lines(
      organization_id,invoice_id,order_line_id,canonical_product_id,quantity,unit_cost
    ) values (
      v_order.organization_id,v_invoice_id,v_order_line.id,v_order_line.canonical_product_id,v_qty,v_unit_cost
    );
  end loop;

  perform public.refresh_supplier_invoice_match_v1(v_invoice_id);
  return v_invoice_id;
end
$function$;

revoke all on intelligence.procurement_three_way_match_lines_v1 from public, anon, authenticated;
revoke all on intelligence.procurement_three_way_match_summary_v1 from public, anon, authenticated;
grant select on intelligence.procurement_three_way_match_lines_v1 to service_role;
grant select on intelligence.procurement_three_way_match_summary_v1 to service_role;
revoke all on function public.refresh_supplier_invoice_match_v1(uuid) from public, anon, authenticated;
revoke all on function public.create_supplier_invoice_v1(uuid,text,date,numeric,numeric,numeric,jsonb,text) from public, anon, authenticated;
grant execute on function public.refresh_supplier_invoice_match_v1(uuid) to service_role;
grant execute on function public.create_supplier_invoice_v1(uuid,text,date,numeric,numeric,numeric,jsonb,text) to service_role;
