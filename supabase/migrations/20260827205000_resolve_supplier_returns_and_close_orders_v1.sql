alter table public.procurement_supplier_returns add column if not exists replacement_receipt_id uuid references public.procurement_operational_receipts(id);
alter table public.procurement_supplier_returns add column if not exists resolved_by uuid;
alter table public.procurement_supplier_returns add column if not exists resolution_reference text;

create table if not exists public.procurement_supplier_credit_notes(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  return_id uuid not null unique references public.procurement_supplier_returns(id),
  invoice_id uuid not null references public.procurement_supplier_invoices(id),
  supplier_id uuid not null,
  credit_note_number text not null,
  credit_note_date date not null,
  currency text not null,
  amount numeric not null check(amount>0),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(organization_id,supplier_id,credit_note_number)
);
revoke all on public.procurement_supplier_credit_notes from public,anon,authenticated;
grant select,insert,update on public.procurement_supplier_credit_notes to service_role;

create or replace function public.resolve_supplier_return_replacement_v1(p_organization_id uuid,p_return_id uuid,p_replacement_receipt_id uuid,p_notes text default null) returns void
language plpgsql security definer set search_path='public','canonical','pg_temp' as $$
declare v_ret public.procurement_supplier_returns%rowtype; v_receipt public.procurement_operational_receipts%rowtype; v_order public.procurement_operational_orders%rowtype; v_bad bigint;
begin
  select * into v_ret from public.procurement_supplier_returns where id=p_return_id and organization_id=p_organization_id for update;
  if not found then raise exception 'Devolución no encontrada'; end if;
  if v_ret.status in ('resolved','cancelled') then raise exception 'Devolución ya cerrada'; end if;
  select * into v_receipt from public.procurement_operational_receipts where id=p_replacement_receipt_id and organization_id=p_organization_id and order_id=v_ret.order_id;
  if not found then raise exception 'Recepción de reposición inválida'; end if;
  select count(*) into v_bad from public.procurement_supplier_return_lines rl
  where rl.return_id=v_ret.id and not exists (
    select 1 from public.procurement_operational_receipt_lines x
    where x.receipt_id=v_receipt.id and x.organization_id=p_organization_id and x.order_line_id=rl.order_line_id
    group by x.order_line_id having sum(x.quantity_accepted)>=rl.quantity
  );
  if v_bad>0 then raise exception 'La recepción de reposición no cubre toda la devolución'; end if;
  update public.procurement_supplier_returns set resolution_type='replacement',status='resolved',replacement_receipt_id=v_receipt.id,resolved_by=public.current_application_user_id(),resolved_at=now(),resolution_reference=v_receipt.receipt_number,notes=coalesce(nullif(btrim(p_notes),''),notes),updated_at=now() where id=v_ret.id;
  select * into v_order from public.procurement_operational_orders where id=v_ret.order_id and organization_id=p_organization_id for update;
  if not exists(select 1 from public.procurement_operational_order_lines l where l.order_id=v_order.id and l.quantity_received<l.quantity_ordered)
     and not exists(select 1 from public.procurement_supplier_returns r where r.order_id=v_order.id and r.organization_id=p_organization_id and r.status not in ('resolved','cancelled')) then
    update public.procurement_operational_orders set status='closed',updated_at=now() where id=v_order.id;
    update public.procurement_intake_requests set status='received',updated_at=now() where id=v_order.intake_request_id and organization_id=p_organization_id;
  end if;
end $$;

create or replace function public.resolve_supplier_return_credit_note_v1(p_organization_id uuid,p_return_id uuid,p_invoice_id uuid,p_credit_note_number text,p_credit_note_date date,p_amount numeric,p_notes text default null) returns uuid
language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_ret public.procurement_supplier_returns%rowtype; v_inv public.procurement_supplier_invoices%rowtype; v_ap public.procurement_accounts_payable%rowtype; v_paid numeric; v_id uuid; v_order public.procurement_operational_orders%rowtype; v_uncovered bigint;
begin
  if p_credit_note_number is null or btrim(p_credit_note_number)='' or p_credit_note_date is null or p_amount is null or p_amount<=0 then raise exception 'Datos de nota de crédito inválidos'; end if;
  select * into v_ret from public.procurement_supplier_returns where id=p_return_id and organization_id=p_organization_id for update;
  if not found then raise exception 'Devolución no encontrada'; end if;
  if v_ret.status in ('resolved','cancelled') then raise exception 'Devolución ya cerrada'; end if;
  select * into v_inv from public.procurement_supplier_invoices where id=p_invoice_id and organization_id=p_organization_id and order_id=v_ret.order_id and supplier_id=v_ret.supplier_id for update;
  if not found then raise exception 'Factura asociada inválida'; end if;
  if v_inv.status<>'approved' then raise exception 'La factura debe estar aprobada antes de aplicar nota de crédito'; end if;
  select * into v_ap from public.procurement_accounts_payable where invoice_id=v_inv.id and organization_id=p_organization_id for update;
  if not found then raise exception 'Cuenta por pagar no encontrada'; end if;
  select coalesce(sum(amount),0) into v_paid from public.procurement_supplier_payments where payable_id=v_ap.id and organization_id=p_organization_id;
  if p_amount>v_ap.approved_amount-v_paid then raise exception 'La nota de crédito supera el saldo pendiente'; end if;
  insert into public.procurement_supplier_credit_notes(organization_id,return_id,invoice_id,supplier_id,credit_note_number,credit_note_date,currency,amount,notes,created_by)
  values(p_organization_id,v_ret.id,v_inv.id,v_ret.supplier_id,btrim(p_credit_note_number),p_credit_note_date,v_inv.currency,p_amount,nullif(btrim(coalesce(p_notes,'')),''),public.current_application_user_id()) returning id into v_id;
  update public.procurement_accounts_payable set approved_amount=approved_amount-p_amount,status=case when approved_amount-p_amount=v_paid then case when v_paid=0 then 'cancelled' else 'paid' end when v_paid>0 then 'partially_paid' else case when due_date is null then 'awaiting_due_date' else 'open' end end,updated_at=now() where id=v_ap.id;
  update public.procurement_supplier_returns set resolution_type='credit_note',status='resolved',credit_note_number=btrim(p_credit_note_number),resolved_by=public.current_application_user_id(),resolved_at=now(),resolution_reference=btrim(p_credit_note_number),notes=coalesce(nullif(btrim(p_notes),''),notes),updated_at=now() where id=v_ret.id;
  select * into v_order from public.procurement_operational_orders where id=v_ret.order_id and organization_id=p_organization_id for update;
  select count(*) into v_uncovered from public.procurement_operational_order_lines l where l.order_id=v_order.id and l.quantity_received + coalesce((select sum(rl.quantity) from public.procurement_supplier_return_lines rl join public.procurement_supplier_returns r on r.id=rl.return_id where r.order_id=v_order.id and r.organization_id=p_organization_id and r.status='resolved' and r.resolution_type in ('credit_note','refund') and rl.order_line_id=l.id),0) < l.quantity_ordered;
  if v_uncovered=0 and not exists(select 1 from public.procurement_supplier_returns r where r.order_id=v_order.id and r.organization_id=p_organization_id and r.status not in ('resolved','cancelled')) then
    update public.procurement_operational_orders set status='closed',updated_at=now() where id=v_order.id;
    update public.procurement_intake_requests set status='received',updated_at=now() where id=v_order.intake_request_id and organization_id=p_organization_id;
  end if;
  return v_id;
end $$;

revoke all on function public.resolve_supplier_return_replacement_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_supplier_return_replacement_v1(uuid,uuid,uuid,text) to service_role;
revoke all on function public.resolve_supplier_return_credit_note_v1(uuid,uuid,uuid,text,date,numeric,text) from public,anon,authenticated;
grant execute on function public.resolve_supplier_return_credit_note_v1(uuid,uuid,uuid,text,date,numeric,text) to service_role;

create or replace view public.procurement_supplier_return_resolution_v1 with (security_invoker=true) as
select r.*,o.order_number,i.id as approved_invoice_id,i.invoice_number,ap.id as payable_id,ap.currency as payable_currency,ap.approved_amount,
       coalesce((select sum(p.amount) from public.procurement_supplier_payments p where p.payable_id=ap.id and p.organization_id=ap.organization_id),0) as paid_amount,
       greatest(coalesce(ap.approved_amount,0)-coalesce((select sum(p.amount) from public.procurement_supplier_payments p where p.payable_id=ap.id and p.organization_id=ap.organization_id),0),0) as outstanding_amount
from public.procurement_supplier_returns r
join public.procurement_operational_orders o on o.id=r.order_id and o.organization_id=r.organization_id
left join lateral (select si.* from public.procurement_supplier_invoices si where si.order_id=r.order_id and si.organization_id=r.organization_id and si.supplier_id=r.supplier_id and si.status='approved' order by si.created_at desc limit 1) i on true
left join public.procurement_accounts_payable ap on ap.invoice_id=i.id and ap.organization_id=r.organization_id;
revoke all on public.procurement_supplier_return_resolution_v1 from public,anon,authenticated;
grant select on public.procurement_supplier_return_resolution_v1 to service_role;
