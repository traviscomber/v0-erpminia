-- Finance executive views are server-only surfaces.
-- The public facades are security-invoker and intentionally closed to client roles,
-- so service_role must also be able to traverse the private intelligence views.

alter view public.operational_procurement_finance_ledger_v1 set (security_invoker = true);
alter view public.operational_procurement_finance_summary_v1 set (security_invoker = true);
alter view intelligence.operational_procurement_finance_ledger_v1 set (security_invoker = true);
alter view intelligence.operational_procurement_finance_summary_v1 set (security_invoker = true);

revoke all privileges on table public.operational_procurement_finance_ledger_v1 from anon, authenticated;
revoke all privileges on table public.operational_procurement_finance_summary_v1 from anon, authenticated;
revoke all privileges on table intelligence.operational_procurement_finance_ledger_v1 from anon, authenticated;
revoke all privileges on table intelligence.operational_procurement_finance_summary_v1 from anon, authenticated;

grant select on table public.operational_procurement_finance_ledger_v1 to service_role;
grant select on table public.operational_procurement_finance_summary_v1 to service_role;
grant select on table intelligence.operational_procurement_finance_ledger_v1 to service_role;
grant select on table intelligence.operational_procurement_finance_summary_v1 to service_role;

do $verification$
begin
  if has_table_privilege('anon', 'public.operational_procurement_finance_summary_v1', 'select')
     or has_table_privilege('authenticated', 'public.operational_procurement_finance_summary_v1', 'select')
     or has_table_privilege('anon', 'public.operational_procurement_finance_ledger_v1', 'select')
     or has_table_privilege('authenticated', 'public.operational_procurement_finance_ledger_v1', 'select')
     or not has_table_privilege('service_role', 'public.operational_procurement_finance_summary_v1', 'select')
     or not has_table_privilege('service_role', 'public.operational_procurement_finance_ledger_v1', 'select')
     or not has_table_privilege('service_role', 'intelligence.operational_procurement_finance_summary_v1', 'select')
     or not has_table_privilege('service_role', 'intelligence.operational_procurement_finance_ledger_v1', 'select') then
    raise exception 'finance executive server-only view access verification failed';
  end if;
end
$verification$;
