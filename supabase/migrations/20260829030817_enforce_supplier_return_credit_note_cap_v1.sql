create or replace function public.resolve_supplier_return_credit_note_v1(
  p_organization_id uuid,
  p_return_id uuid,
  p_invoice_id uuid,
  p_credit_note_number text,
  p_credit_note_date date,
  p_amount numeric,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_ret public.procurement_supplier_returns%rowtype;
  v_inv public.procurement_supplier_invoices%rowtype;
  v_ap public.procurement_accounts_payable%rowtype;
  v_paid numeric;
  v_id uuid;
  v_order public.procurement_operational_orders%rowtype;
  v_uncovered bigint;
  v_return_eligible_net numeric := 0;
  v_invoice_excess_net numeric := 0;
  v_prior_credit numeric := 0;
  v_tax_factor numeric := 1;
  v_return_credit_cap numeric := 0;
  v_invoice_credit_remaining numeric := 0;
  v_credit_cap numeric := 0;
begin
  if p_credit_note_number is null or btrim(p_credit_note_number)='' or p_credit_note_date is null or p_amount is null or p_amount<=0 then
    raise exception 'Datos de nota de crédito inválidos';
  end if;

  select * into v_ret
  from public.procurement_supplier_returns
  where id=p_return_id and organization_id=p_organization_id
  for update;
  if not found then raise exception 'Devolución no encontrada'; end if;
  if v_ret.status in ('resolved','cancelled') then raise exception 'Devolución ya cerrada'; end if;
  if v_ret.status <> 'received_by_supplier' then
    raise exception 'La devolución debe estar recibida por el proveedor antes de aplicar la nota de crédito';
  end if;

  select * into v_inv
  from public.procurement_supplier_invoices
  where id=p_invoice_id
    and organization_id=p_organization_id
    and order_id=v_ret.order_id
    and supplier_id=v_ret.supplier_id
  for update;
  if not found then raise exception 'Factura asociada inválida'; end if;
  if v_inv.status<>'approved' then raise exception 'La factura debe estar aprobada antes de aplicar nota de crédito'; end if;

  select * into v_ap
  from public.procurement_accounts_payable
  where invoice_id=v_inv.id and organization_id=p_organization_id
  for update;
  if not found then raise exception 'Cuenta por pagar no encontrada'; end if;

  select coalesce(sum(amount),0) into v_paid
  from public.procurement_supplier_payments
  where payable_id=v_ap.id and organization_id=p_organization_id;

  with return_qty as (
    select rl.order_line_id, sum(rl.quantity) as return_quantity
    from public.procurement_supplier_return_lines rl
    where rl.return_id=v_ret.id and rl.organization_id=p_organization_id
    group by rl.order_line_id
  ), invoice_current as (
    select il.order_line_id,
           sum(il.quantity) as invoice_quantity,
           sum(il.quantity * il.unit_cost) as invoice_net_amount
    from public.procurement_supplier_invoice_lines il
    where il.invoice_id=v_inv.id and il.organization_id=p_organization_id
    group by il.order_line_id
  ), accepted as (
    select rl.order_line_id, coalesce(sum(rl.quantity_accepted),0) as accepted_quantity
    from public.procurement_operational_receipt_lines rl
    join public.procurement_operational_receipts r
      on r.id=rl.receipt_id and r.organization_id=rl.organization_id
    where r.order_id=v_inv.order_id and rl.organization_id=p_organization_id
    group by rl.order_line_id
  ), prior as (
    select il.order_line_id, coalesce(sum(il.quantity),0) as prior_invoice_quantity
    from public.procurement_supplier_invoice_lines il
    join public.procurement_supplier_invoices i
      on i.id=il.invoice_id and i.organization_id=il.organization_id
    where i.order_id=v_inv.order_id
      and i.organization_id=p_organization_id
      and i.status<>'rejected'
      and (i.created_at < v_inv.created_at or (i.created_at=v_inv.created_at and i.id < v_inv.id))
    group by il.order_line_id
  ), eligible as (
    select ic.order_line_id,
           coalesce(rq.return_quantity,0) as return_quantity,
           ic.invoice_quantity,
           ic.invoice_net_amount,
           coalesce(a.accepted_quantity,0) as accepted_quantity,
           coalesce(p.prior_invoice_quantity,0) as prior_invoice_quantity,
           greatest(
             greatest(coalesce(p.prior_invoice_quantity,0) + ic.invoice_quantity - coalesce(a.accepted_quantity,0),0)
             - greatest(coalesce(p.prior_invoice_quantity,0) - coalesce(a.accepted_quantity,0),0),
             0
           ) as excess_quantity_for_invoice
    from invoice_current ic
    left join return_qty rq on rq.order_line_id=ic.order_line_id
    left join accepted a on a.order_line_id=ic.order_line_id
    left join prior p on p.order_line_id=ic.order_line_id
  )
  select
    coalesce(sum(
      least(return_quantity, excess_quantity_for_invoice)
      * case when invoice_quantity>0 then invoice_net_amount/invoice_quantity else 0 end
    ),0),
    coalesce(sum(
      excess_quantity_for_invoice
      * case when invoice_quantity>0 then invoice_net_amount/invoice_quantity else 0 end
    ),0)
  into v_return_eligible_net, v_invoice_excess_net
  from eligible;

  if v_return_eligible_net <= 0 then
    raise exception 'La devolución no corresponde a cantidad facturada en exceso sobre lo aceptado';
  end if;

  if v_inv.net_amount > 0 then
    v_tax_factor := v_inv.total_amount / v_inv.net_amount;
  end if;

  select coalesce(sum(amount),0) into v_prior_credit
  from public.procurement_supplier_credit_notes
  where invoice_id=v_inv.id and organization_id=p_organization_id;

  v_return_credit_cap := v_return_eligible_net * v_tax_factor;
  v_invoice_credit_remaining := greatest((v_invoice_excess_net * v_tax_factor) - v_prior_credit,0);
  v_credit_cap := least(v_return_credit_cap, v_invoice_credit_remaining, v_ap.approved_amount-v_paid);

  if p_amount > v_credit_cap + 0.01 then
    raise exception 'La nota de crédito supera el monto facturado devuelto pendiente: máximo %', v_credit_cap;
  end if;

  insert into public.procurement_supplier_credit_notes(
    organization_id,return_id,invoice_id,supplier_id,credit_note_number,credit_note_date,currency,amount,notes,created_by
  ) values(
    p_organization_id,v_ret.id,v_inv.id,v_ret.supplier_id,btrim(p_credit_note_number),p_credit_note_date,v_inv.currency,p_amount,
    nullif(btrim(coalesce(p_notes,'')),''),public.current_application_user_id()
  ) returning id into v_id;

  update public.procurement_accounts_payable
  set approved_amount=approved_amount-p_amount,
      status=case
        when approved_amount-p_amount=v_paid then case when v_paid=0 then 'cancelled' else 'paid' end
        when v_paid>0 then 'partially_paid'
        else case when due_date is null then 'awaiting_due_date' else 'open' end
      end,
      updated_at=now()
  where id=v_ap.id;

  update public.procurement_supplier_returns
  set resolution_type='credit_note',status='resolved',credit_note_number=btrim(p_credit_note_number),
      resolved_by=public.current_application_user_id(),resolved_at=now(),resolution_reference=btrim(p_credit_note_number),
      notes=coalesce(nullif(btrim(p_notes),''),notes),updated_at=now()
  where id=v_ret.id;

  select * into v_order
  from public.procurement_operational_orders
  where id=v_ret.order_id and organization_id=p_organization_id
  for update;

  select count(*) into v_uncovered
  from public.procurement_operational_order_lines l
  where l.order_id=v_order.id
    and l.quantity_received + coalesce((
      select sum(rl.quantity)
      from public.procurement_supplier_return_lines rl
      join public.procurement_supplier_returns r on r.id=rl.return_id
      where r.order_id=v_order.id
        and r.organization_id=p_organization_id
        and r.status='resolved'
        and r.resolution_type in ('credit_note','refund')
        and rl.order_line_id=l.id
    ),0) < l.quantity_ordered;

  if v_uncovered=0 and not exists(
    select 1 from public.procurement_supplier_returns r
    where r.order_id=v_order.id
      and r.organization_id=p_organization_id
      and r.status not in ('resolved','cancelled')
  ) then
    update public.procurement_operational_orders set status='closed',updated_at=now() where id=v_order.id;
    update public.procurement_intake_requests set status='received',updated_at=now()
    where id=v_order.intake_request_id and organization_id=p_organization_id;
  end if;

  return v_id;
end
$function$;
