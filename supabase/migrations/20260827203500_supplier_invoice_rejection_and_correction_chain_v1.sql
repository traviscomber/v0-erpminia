alter table public.procurement_supplier_invoices
  add column if not exists replaces_invoice_id uuid null,
  add column if not exists rejected_for_correction_by uuid null,
  add column if not exists rejected_for_correction_at timestamptz null,
  add column if not exists rejection_reason text null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.procurement_supplier_invoices'::regclass
      and conname='procurement_supplier_invoices_replaces_invoice_id_fkey'
  ) then
    alter table public.procurement_supplier_invoices
      add constraint procurement_supplier_invoices_replaces_invoice_id_fkey
      foreign key (replaces_invoice_id)
      references public.procurement_supplier_invoices(id)
      on delete restrict;
  end if;
end $$;

create unique index if not exists procurement_supplier_invoice_single_replacement_idx
  on public.procurement_supplier_invoices(replaces_invoice_id)
  where replaces_invoice_id is not null;

create index if not exists procurement_supplier_invoice_rejected_correction_idx
  on public.procurement_supplier_invoices(organization_id, order_id, status, rejected_for_correction_at desc)
  where status='rejected';

create or replace function public.reject_supplier_invoice_for_correction_v1(
  p_invoice_id uuid,
  p_notes text
) returns void
language plpgsql
security definer
set search_path to 'public','intelligence','canonical','pg_temp'
as $$
declare
  v_invoice public.procurement_supplier_invoices%rowtype;
  v_actor uuid := public.current_application_user_id();
begin
  if p_notes is null or btrim(p_notes)='' then raise exception 'Motivo de rechazo requerido'; end if;

  select * into v_invoice
  from public.procurement_supplier_invoices
  where id=p_invoice_id
  for update;
  if not found then raise exception 'Factura proveedor no encontrada'; end if;

  if v_invoice.organization_id not in (
    select organization_id from public.user_roles where user_id=v_actor
  ) then raise exception 'Sin permisos'; end if;

  if v_invoice.status='approved' or v_invoice.approved_for_payment_at is not null then
    raise exception 'Una factura aprobada para pago no puede rechazarse como corrección';
  end if;
  if v_invoice.status='rejected' then raise exception 'Factura ya rechazada'; end if;
  if exists (
    select 1 from public.procurement_accounts_payable ap
    where ap.invoice_id=v_invoice.id and ap.organization_id=v_invoice.organization_id
  ) then raise exception 'La factura ya generó una cuenta por pagar'; end if;

  update public.procurement_supplier_invoices
  set status='rejected',
      rejected_for_correction_by=v_actor,
      rejected_for_correction_at=now(),
      rejection_reason=btrim(p_notes),
      updated_at=now(),
      approved_for_payment_by=null,
      approved_for_payment_at=null,
      approval_basis=null,
      approval_notes=null
  where id=v_invoice.id;

  update public.procurement_match_exceptions
  set status='rejected',
      resolution_notes=btrim(p_notes),
      resolved_by=v_actor,
      resolved_at=now()
  where organization_id=v_invoice.organization_id
    and invoice_id=v_invoice.id
    and status='open';
end
$$;

revoke all on function public.reject_supplier_invoice_for_correction_v1(uuid,text) from public, anon, authenticated;
grant execute on function public.reject_supplier_invoice_for_correction_v1(uuid,text) to service_role;

create or replace function public.create_supplier_invoice_correction_v1(
  p_replaces_invoice_id uuid,
  p_invoice_number text,
  p_invoice_date date,
  p_net_amount numeric,
  p_tax_amount numeric,
  p_total_amount numeric,
  p_lines jsonb,
  p_document_url text default null
) returns uuid
language plpgsql
security definer
set search_path to 'public','intelligence','canonical','pg_temp'
as $$
declare
  v_old public.procurement_supplier_invoices%rowtype;
  v_new_id uuid;
begin
  select * into v_old
  from public.procurement_supplier_invoices
  where id=p_replaces_invoice_id
  for update;
  if not found then raise exception 'Factura rechazada no encontrada'; end if;

  if v_old.organization_id not in (
    select organization_id from public.user_roles where user_id=public.current_application_user_id()
  ) then raise exception 'Sin permisos'; end if;
  if v_old.status <> 'rejected' then raise exception 'La factura a corregir debe estar rechazada'; end if;
  if exists (select 1 from public.procurement_supplier_invoices i where i.replaces_invoice_id=v_old.id) then
    raise exception 'La factura rechazada ya tiene un documento de corrección';
  end if;

  v_new_id := public.create_supplier_invoice_v1(
    v_old.order_id,
    p_invoice_number,
    p_invoice_date,
    p_net_amount,
    p_tax_amount,
    p_total_amount,
    p_lines,
    p_document_url
  );

  update public.procurement_supplier_invoices
  set replaces_invoice_id=v_old.id,
      updated_at=now()
  where id=v_new_id
    and organization_id=v_old.organization_id;

  return v_new_id;
end
$$;

revoke all on function public.create_supplier_invoice_correction_v1(uuid,text,date,numeric,numeric,numeric,jsonb,text) from public, anon, authenticated;
grant execute on function public.create_supplier_invoice_correction_v1(uuid,text,date,numeric,numeric,numeric,jsonb,text) to service_role;

create or replace function public.resolve_procurement_match_exception_v1(
  p_exception_id uuid,
  p_decision text,
  p_notes text
) returns void
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_org uuid;
  v_invoice_id uuid;
begin
  if p_decision not in ('accepted','corrected','rejected') then raise exception 'Decisión de excepción inválida'; end if;
  if p_notes is null or btrim(p_notes)='' then raise exception 'Notas de resolución requeridas'; end if;

  select organization_id,invoice_id into v_org,v_invoice_id
  from public.procurement_match_exceptions
  where id=p_exception_id
  for update;
  if not found then raise exception 'Excepción no encontrada'; end if;
  if v_org not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;

  if p_decision='rejected' then
    perform public.reject_supplier_invoice_for_correction_v1(v_invoice_id,p_notes);
    return;
  end if;

  update public.procurement_match_exceptions
  set status=p_decision,
      resolution_notes=btrim(p_notes),
      resolved_by=public.current_application_user_id(),
      resolved_at=now()
  where id=p_exception_id;
end
$$;

revoke all on function public.resolve_procurement_match_exception_v1(uuid,text,text) from public, anon, authenticated;
grant execute on function public.resolve_procurement_match_exception_v1(uuid,text,text) to service_role;

create or replace view intelligence.procurement_three_way_match_summary_v1
with (security_invoker=true) as
with line_summary as (
  select organization_id, invoice_id,
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
  coalesce(ls.line_count,0::bigint) as line_count,
  coalesce(ls.matched_line_count,0::bigint) as matched_line_count,
  coalesce(ls.pending_receipt_line_count,0::bigint) as pending_receipt_line_count,
  coalesce(ls.exception_line_count,0::bigint) as exception_line_count,
  ls.last_received_at,
  case
    when i.status='rejected' then 'rejected'
    when i.supplier_id is distinct from o.supplier_id then 'supplier_mismatch'
    when i.currency is distinct from o.currency then 'currency_mismatch'
    when coalesce(ls.line_count,0::bigint)=0 then 'no_lines'
    when abs(i.net_amount-coalesce(ls.lines_net_amount,0::numeric))>0.01 then 'amount_mismatch'
    when coalesce(ls.exception_line_count,0::bigint)>0 then 'exception'
    when coalesce(ls.pending_receipt_line_count,0::bigint)>0 then 'pending_receipt'
    else 'matched'
  end as match_status
from public.procurement_supplier_invoices i
join public.procurement_operational_orders o
  on o.id=i.order_id and o.organization_id=i.organization_id
left join line_summary ls
  on ls.organization_id=i.organization_id and ls.invoice_id=i.id;

create or replace view public.procurement_three_way_match_summary_v1
with (security_invoker=true) as
select * from intelligence.procurement_three_way_match_summary_v1;

revoke all on intelligence.procurement_three_way_match_summary_v1 from public, anon, authenticated;
revoke all on public.procurement_three_way_match_summary_v1 from public, anon, authenticated;
grant select on intelligence.procurement_three_way_match_summary_v1 to service_role;
grant select on public.procurement_three_way_match_summary_v1 to service_role;