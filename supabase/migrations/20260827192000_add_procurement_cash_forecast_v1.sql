create or replace view public.procurement_cash_forecast_v1
with (security_invoker=true)
as
select
  p.id as payable_id,
  p.organization_id,
  p.invoice_id,
  p.invoice_number,
  p.invoice_date,
  p.supplier_id,
  p.supplier_name,
  p.currency,
  p.approved_amount,
  p.paid_amount,
  p.outstanding_amount,
  p.due_date,
  p.days_to_due,
  case
    when p.outstanding_amount <= 0 then 'settled'
    when p.due_date is null then 'no_due_date'
    when p.due_date < current_date then 'overdue'
    when p.due_date <= current_date + 7 then 'next_7_days'
    when p.due_date <= current_date + 30 then 'days_8_30'
    when p.due_date <= current_date + 60 then 'days_31_60'
    when p.due_date <= current_date + 90 then 'days_61_90'
    else 'after_90_days'
  end as forecast_bucket
from public.procurement_accounts_payable_v1 p;

create or replace view public.procurement_cash_forecast_summary_v1
with (security_invoker=true)
as
select
  organization_id,
  currency,
  count(*) filter (where outstanding_amount > 0) as open_payables,
  coalesce(sum(outstanding_amount) filter (where outstanding_amount > 0),0)::numeric as total_outstanding_amount,
  coalesce(sum(outstanding_amount) filter (where outstanding_amount > 0 and due_date < current_date),0)::numeric as overdue_amount,
  coalesce(sum(outstanding_amount) filter (where outstanding_amount > 0 and due_date between current_date and current_date + 7),0)::numeric as due_next_7_amount,
  coalesce(sum(outstanding_amount) filter (where outstanding_amount > 0 and due_date between current_date and current_date + 30),0)::numeric as due_next_30_amount,
  coalesce(sum(outstanding_amount) filter (where outstanding_amount > 0 and due_date between current_date and current_date + 60),0)::numeric as due_next_60_amount,
  coalesce(sum(outstanding_amount) filter (where outstanding_amount > 0 and due_date between current_date and current_date + 90),0)::numeric as due_next_90_amount,
  coalesce(sum(outstanding_amount) filter (where outstanding_amount > 0 and due_date > current_date + 90),0)::numeric as due_after_90_amount,
  coalesce(sum(outstanding_amount) filter (where outstanding_amount > 0 and due_date is null),0)::numeric as no_due_date_amount,
  count(*) filter (where outstanding_amount > 0 and due_date is null) as no_due_date_count,
  min(due_date) filter (where outstanding_amount > 0 and due_date >= current_date) as next_due_date
from public.procurement_accounts_payable_v1
group by organization_id,currency;

revoke all on public.procurement_cash_forecast_v1 from public,anon,authenticated;
revoke all on public.procurement_cash_forecast_summary_v1 from public,anon,authenticated;
grant select on public.procurement_cash_forecast_v1 to service_role;
grant select on public.procurement_cash_forecast_summary_v1 to service_role;
