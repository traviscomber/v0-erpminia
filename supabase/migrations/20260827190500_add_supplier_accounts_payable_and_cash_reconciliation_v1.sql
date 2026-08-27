create table if not exists public.procurement_accounts_payable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  invoice_id uuid not null unique references public.procurement_supplier_invoices(id) on delete restrict,
  supplier_id uuid not null,
  currency text not null,
  approved_amount numeric not null check (approved_amount >= 0),
  due_date date null,
  status text not null default 'awaiting_due_date' check (status in ('awaiting_due_date','open','partially_paid','paid','reconciled','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.procurement_supplier_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  payable_id uuid not null references public.procurement_accounts_payable(id) on delete restrict,
  amount numeric not null check (amount > 0),
  currency text not null,
  payment_date date not null,
  payment_reference text null,
  notes text null,
  recorded_by uuid null,
  recorded_at timestamptz not null default now(),
  reconciled_at timestamptz null,
  reconciled_by uuid null,
  reconciliation_reference text null,
  reconciliation_notes text null
);

create index if not exists procurement_accounts_payable_org_due_idx on public.procurement_accounts_payable(organization_id,due_date,status);
create index if not exists procurement_supplier_payments_payable_idx on public.procurement_supplier_payments(payable_id,payment_date);

create or replace function public.sync_supplier_invoice_to_payable_v1() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status='approved' and (old.status is distinct from new.status) then
    insert into public.procurement_accounts_payable(organization_id,invoice_id,supplier_id,currency,approved_amount,status)
    values(new.organization_id,new.id,new.supplier_id,new.currency,new.total_amount,'awaiting_due_date')
    on conflict (invoice_id) do update set approved_amount=excluded.approved_amount,currency=excluded.currency,supplier_id=excluded.supplier_id,updated_at=now();
  end if;
  return new;
end; $$;
revoke all on function public.sync_supplier_invoice_to_payable_v1() from public,anon,authenticated;
drop trigger if exists trg_sync_supplier_invoice_to_payable_v1 on public.procurement_supplier_invoices;
create trigger trg_sync_supplier_invoice_to_payable_v1 after update of status on public.procurement_supplier_invoices for each row execute function public.sync_supplier_invoice_to_payable_v1();

insert into public.procurement_accounts_payable(organization_id,invoice_id,supplier_id,currency,approved_amount,status)
select i.organization_id,i.id,i.supplier_id,i.currency,i.total_amount,'awaiting_due_date' from public.procurement_supplier_invoices i where i.status='approved' on conflict (invoice_id) do nothing;

create or replace view public.procurement_accounts_payable_v1 with (security_invoker=true) as
select ap.id,ap.organization_id,ap.invoice_id,i.invoice_number,i.invoice_date,ap.supplier_id,coalesce(s.name,'Proveedor') as supplier_name,
       ap.currency,ap.approved_amount,ap.due_date,ap.status,coalesce(sum(p.amount),0)::numeric as paid_amount,
       greatest(ap.approved_amount-coalesce(sum(p.amount),0),0)::numeric as outstanding_amount,
       case when ap.due_date is null then null else ap.due_date-current_date end as days_to_due,
       ap.created_at,ap.updated_at
from public.procurement_accounts_payable ap
join public.procurement_supplier_invoices i on i.id=ap.invoice_id and i.organization_id=ap.organization_id
left join public.suppliers s on s.id=ap.supplier_id and s.organization_id=ap.organization_id
left join public.procurement_supplier_payments p on p.payable_id=ap.id and p.organization_id=ap.organization_id
group by ap.id,i.invoice_number,i.invoice_date,s.name;

create or replace function public.set_supplier_payable_due_date_v1(p_payable_id uuid,p_due_date date) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from public.procurement_accounts_payable where id=p_payable_id) then raise exception 'Cuenta por pagar no encontrada'; end if;
  update public.procurement_accounts_payable set due_date=p_due_date,status=case when status='awaiting_due_date' then 'open' else status end,updated_at=now() where id=p_payable_id;
end; $$;

create or replace function public.record_supplier_payment_v1(p_payable_id uuid,p_amount numeric,p_payment_date date,p_reference text default null,p_notes text default null) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ap public.procurement_accounts_payable%rowtype; v_paid numeric; v_id uuid; v_actor uuid;
begin
  if p_amount is null or p_amount<=0 then raise exception 'Monto de pago inválido'; end if;
  select * into v_ap from public.procurement_accounts_payable where id=p_payable_id for update;
  if not found then raise exception 'Cuenta por pagar no encontrada'; end if;
  if v_ap.due_date is null then raise exception 'Defina vencimiento antes de registrar pago'; end if;
  if v_ap.status in ('cancelled','reconciled') then raise exception 'Cuenta por pagar no admite nuevos pagos'; end if;
  select coalesce(sum(amount),0) into v_paid from public.procurement_supplier_payments where payable_id=p_payable_id;
  if v_paid+p_amount>v_ap.approved_amount then raise exception 'El pago supera el saldo aprobado'; end if;
  begin v_actor:=auth.uid(); exception when others then v_actor:=null; end;
  insert into public.procurement_supplier_payments(organization_id,payable_id,amount,currency,payment_date,payment_reference,notes,recorded_by)
  values(v_ap.organization_id,v_ap.id,p_amount,v_ap.currency,p_payment_date,nullif(trim(p_reference),''),nullif(trim(p_notes),''),v_actor) returning id into v_id;
  update public.procurement_accounts_payable set status=case when v_paid+p_amount=v_ap.approved_amount then 'paid' else 'partially_paid' end,updated_at=now() where id=v_ap.id;
  return v_id;
end; $$;

create or replace function public.reconcile_supplier_payment_v1(p_payment_id uuid,p_reference text,p_notes text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_payment public.procurement_supplier_payments%rowtype; v_actor uuid; v_unreconciled bigint; v_ap uuid;
begin
  if nullif(trim(p_reference),'') is null then raise exception 'La conciliación requiere referencia'; end if;
  select * into v_payment from public.procurement_supplier_payments where id=p_payment_id for update;
  if not found then raise exception 'Pago no encontrado'; end if;
  if v_payment.reconciled_at is not null then raise exception 'Pago ya conciliado'; end if;
  begin v_actor:=auth.uid(); exception when others then v_actor:=null; end;
  update public.procurement_supplier_payments set reconciled_at=now(),reconciled_by=v_actor,reconciliation_reference=trim(p_reference),reconciliation_notes=nullif(trim(p_notes),'') where id=p_payment_id;
  v_ap:=v_payment.payable_id;
  select count(*) into v_unreconciled from public.procurement_supplier_payments where payable_id=v_ap and reconciled_at is null;
  if v_unreconciled=0 and exists(select 1 from public.procurement_accounts_payable where id=v_ap and status='paid') then update public.procurement_accounts_payable set status='reconciled',updated_at=now() where id=v_ap; end if;
end; $$;

revoke all on public.procurement_accounts_payable from public,anon,authenticated;
revoke all on public.procurement_supplier_payments from public,anon,authenticated;
revoke all on public.procurement_accounts_payable_v1 from public,anon,authenticated;
revoke all on function public.set_supplier_payable_due_date_v1(uuid,date) from public,anon,authenticated;
revoke all on function public.record_supplier_payment_v1(uuid,numeric,date,text,text) from public,anon,authenticated;
revoke all on function public.reconcile_supplier_payment_v1(uuid,text,text) from public,anon,authenticated;
grant select on public.procurement_accounts_payable_v1 to service_role;
grant select on public.procurement_accounts_payable,public.procurement_supplier_payments to service_role;
grant execute on function public.set_supplier_payable_due_date_v1(uuid,date) to service_role;
grant execute on function public.record_supplier_payment_v1(uuid,numeric,date,text,text) to service_role;
grant execute on function public.reconcile_supplier_payment_v1(uuid,text,text) to service_role;