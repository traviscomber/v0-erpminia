create or replace function public.set_supplier_payable_due_date_v2(p_organization_id uuid,p_payable_id uuid,p_due_date date) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from public.procurement_accounts_payable where id=p_payable_id and organization_id=p_organization_id) then raise exception 'Cuenta por pagar no encontrada en la organización'; end if;
  update public.procurement_accounts_payable set due_date=p_due_date,status=case when status='awaiting_due_date' then 'open' else status end,updated_at=now() where id=p_payable_id and organization_id=p_organization_id;
end; $$;

create or replace function public.record_supplier_payment_v2(p_organization_id uuid,p_payable_id uuid,p_amount numeric,p_payment_date date,p_reference text default null,p_notes text default null) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_ap public.procurement_accounts_payable%rowtype; v_paid numeric; v_id uuid; v_actor uuid;
begin
  if p_amount is null or p_amount<=0 then raise exception 'Monto de pago inválido'; end if;
  select * into v_ap from public.procurement_accounts_payable where id=p_payable_id and organization_id=p_organization_id for update;
  if not found then raise exception 'Cuenta por pagar no encontrada en la organización'; end if;
  if v_ap.due_date is null then raise exception 'Defina vencimiento antes de registrar pago'; end if;
  if v_ap.status in ('cancelled','reconciled') then raise exception 'Cuenta por pagar no admite nuevos pagos'; end if;
  select coalesce(sum(amount),0) into v_paid from public.procurement_supplier_payments where payable_id=p_payable_id and organization_id=p_organization_id;
  if v_paid+p_amount>v_ap.approved_amount then raise exception 'El pago supera el saldo aprobado'; end if;
  begin v_actor:=auth.uid(); exception when others then v_actor:=null; end;
  insert into public.procurement_supplier_payments(organization_id,payable_id,amount,currency,payment_date,payment_reference,notes,recorded_by)
  values(p_organization_id,v_ap.id,p_amount,v_ap.currency,p_payment_date,nullif(trim(p_reference),''),nullif(trim(p_notes),''),v_actor) returning id into v_id;
  update public.procurement_accounts_payable set status=case when v_paid+p_amount=v_ap.approved_amount then 'paid' else 'partially_paid' end,updated_at=now() where id=v_ap.id and organization_id=p_organization_id;
  return v_id;
end; $$;

create or replace function public.reconcile_supplier_payment_v2(p_organization_id uuid,p_payment_id uuid,p_reference text,p_notes text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_payment public.procurement_supplier_payments%rowtype; v_actor uuid; v_unreconciled bigint; v_ap uuid;
begin
  if nullif(trim(p_reference),'') is null then raise exception 'La conciliación requiere referencia'; end if;
  select * into v_payment from public.procurement_supplier_payments where id=p_payment_id and organization_id=p_organization_id for update;
  if not found then raise exception 'Pago no encontrado en la organización'; end if;
  if v_payment.reconciled_at is not null then raise exception 'Pago ya conciliado'; end if;
  begin v_actor:=auth.uid(); exception when others then v_actor:=null; end;
  update public.procurement_supplier_payments set reconciled_at=now(),reconciled_by=v_actor,reconciliation_reference=trim(p_reference),reconciliation_notes=nullif(trim(p_notes),'') where id=p_payment_id and organization_id=p_organization_id;
  v_ap:=v_payment.payable_id;
  select count(*) into v_unreconciled from public.procurement_supplier_payments where payable_id=v_ap and organization_id=p_organization_id and reconciled_at is null;
  if v_unreconciled=0 and exists(select 1 from public.procurement_accounts_payable where id=v_ap and organization_id=p_organization_id and status='paid') then update public.procurement_accounts_payable set status='reconciled',updated_at=now() where id=v_ap and organization_id=p_organization_id; end if;
end; $$;

revoke execute on function public.set_supplier_payable_due_date_v1(uuid,date) from service_role;
revoke execute on function public.record_supplier_payment_v1(uuid,numeric,date,text,text) from service_role;
revoke execute on function public.reconcile_supplier_payment_v1(uuid,text,text) from service_role;
revoke all on function public.set_supplier_payable_due_date_v2(uuid,uuid,date) from public,anon,authenticated;
revoke all on function public.record_supplier_payment_v2(uuid,uuid,numeric,date,text,text) from public,anon,authenticated;
revoke all on function public.reconcile_supplier_payment_v2(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.set_supplier_payable_due_date_v2(uuid,uuid,date) to service_role;
grant execute on function public.record_supplier_payment_v2(uuid,uuid,numeric,date,text,text) to service_role;
grant execute on function public.reconcile_supplier_payment_v2(uuid,uuid,text,text) to service_role;

create or replace view public.procurement_accounts_payable_aging_v1 with (security_invoker=true) as
select ap.*,
       case
         when ap.outstanding_amount<=0 then 'settled'
         when ap.due_date is null then 'no_due_date'
         when ap.due_date>=current_date then 'current'
         when current_date-ap.due_date between 1 and 30 then 'overdue_1_30'
         when current_date-ap.due_date between 31 and 60 then 'overdue_31_60'
         when current_date-ap.due_date between 61 and 90 then 'overdue_61_90'
         else 'overdue_90_plus'
       end as aging_bucket
from public.procurement_accounts_payable_v1 ap;

create or replace view public.procurement_accounts_payable_aging_summary_v1 with (security_invoker=true) as
select organization_id,supplier_id,supplier_name,currency,aging_bucket,count(*)::bigint as payable_count,sum(outstanding_amount)::numeric as outstanding_amount
from public.procurement_accounts_payable_aging_v1
where outstanding_amount>0
group by organization_id,supplier_id,supplier_name,currency,aging_bucket;

create or replace view public.procurement_treasury_summary_v1 with (security_invoker=true) as
select a.organization_id,a.currency,
       count(*) filter(where a.outstanding_amount>0)::bigint as open_payables,
       coalesce(sum(a.outstanding_amount) filter(where a.outstanding_amount>0),0)::numeric as outstanding_amount,
       count(*) filter(where a.outstanding_amount>0 and a.due_date is null)::bigint as no_due_date_count,
       coalesce(sum(a.outstanding_amount) filter(where a.outstanding_amount>0 and a.due_date is null),0)::numeric as no_due_date_amount,
       count(*) filter(where a.outstanding_amount>0 and a.due_date between current_date and current_date+7)::bigint as due_soon_count,
       coalesce(sum(a.outstanding_amount) filter(where a.outstanding_amount>0 and a.due_date between current_date and current_date+7),0)::numeric as due_soon_amount,
       count(*) filter(where a.outstanding_amount>0 and a.due_date<current_date)::bigint as overdue_count,
       coalesce(sum(a.outstanding_amount) filter(where a.outstanding_amount>0 and a.due_date<current_date),0)::numeric as overdue_amount,
       coalesce(p.unreconciled_payment_count,0)::bigint as unreconciled_payment_count,
       coalesce(p.unreconciled_payment_amount,0)::numeric as unreconciled_payment_amount
from public.procurement_accounts_payable_v1 a
left join (
  select organization_id,currency,count(*) filter(where reconciled_at is null)::bigint as unreconciled_payment_count,
         coalesce(sum(amount) filter(where reconciled_at is null),0)::numeric as unreconciled_payment_amount
  from public.procurement_supplier_payments group by organization_id,currency
) p on p.organization_id=a.organization_id and p.currency=a.currency
group by a.organization_id,a.currency,p.unreconciled_payment_count,p.unreconciled_payment_amount;

create or replace view public.procurement_treasury_alerts_v1 with (security_invoker=true) as
select organization_id,'treasury_missing_due_date'::text as alert_code,'Cuentas por pagar sin vencimiento'::text as title,'warning'::text as severity,count(*)::bigint as exception_count,'Definir vencimiento antes de registrar pagos.'::text as description
from public.procurement_accounts_payable_v1 where outstanding_amount>0 and due_date is null group by organization_id
union all
select organization_id,'treasury_due_soon'::text,'Pagos con vencimiento próximo'::text,'warning'::text,count(*)::bigint,'Revisar cuentas por pagar que vencen dentro de los próximos 7 días.'::text
from public.procurement_accounts_payable_v1 where outstanding_amount>0 and due_date between current_date and current_date+7 group by organization_id
union all
select organization_id,'treasury_overdue'::text,'Cuentas por pagar vencidas'::text,'critical'::text,count(*)::bigint,'Resolver cuentas por pagar con saldo y vencimiento anterior a hoy.'::text
from public.procurement_accounts_payable_v1 where outstanding_amount>0 and due_date<current_date group by organization_id
union all
select organization_id,'treasury_unreconciled_payments'::text,'Pagos pendientes de conciliación'::text,'warning'::text,count(*)::bigint,'Conciliar pagos registrados contra evidencia bancaria.'::text
from public.procurement_supplier_payments where reconciled_at is null group by organization_id;

create or replace view public.canonical_finance_alerts with (security_invoker=true) as
select organization_id,alert_code,title,severity,exception_count,description from intelligence.canonical_finance_alerts
union all
select organization_id,alert_code,title,severity,exception_count,description from public.procurement_finance_alerts_v1
union all
select organization_id,alert_code,title,severity,exception_count,description from public.procurement_treasury_alerts_v1;

revoke all on public.procurement_accounts_payable_aging_v1 from public,anon,authenticated;
revoke all on public.procurement_accounts_payable_aging_summary_v1 from public,anon,authenticated;
revoke all on public.procurement_treasury_summary_v1 from public,anon,authenticated;
revoke all on public.procurement_treasury_alerts_v1 from public,anon,authenticated;
revoke all on public.canonical_finance_alerts from public,anon,authenticated;
grant select on public.procurement_accounts_payable_aging_v1,public.procurement_accounts_payable_aging_summary_v1,public.procurement_treasury_summary_v1,public.procurement_treasury_alerts_v1,public.canonical_finance_alerts to service_role;