-- Close the verified public-view RLS bypass without changing canonical data.
-- These views are consumed only by authenticated server routes using service_role.

do $migration$
declare
  secured_views constant text[] := array[
    'canonical_clp_cost_ledger',
    'canonical_finance_alerts',
    'canonical_finance_assets',
    'canonical_finance_cost_centers',
    'canonical_finance_overview',
    'canonical_finance_products',
    'canonical_finance_source_audit',
    'canonical_finance_suppliers',
    'canonical_goods_receipts_v1',
    'canonical_inventory_current',
    'canonical_procurement_events_v1',
    'canonical_procurement_request_lines_v1',
    'canonical_procurement_requests_v1',
    'canonical_products_v1',
    'canonical_purchase_order_lines_v1',
    'canonical_purchase_orders_current',
    'canonical_purchase_orders_v1',
    'canonical_supplier_quotation_lines_v1',
    'canonical_supplier_quotations_v1',
    'canonical_suppliers_v1',
    'document_approvals_v1',
    'finance_overview',
    'inventory_intelligence_overview_v1',
    'inventory_intelligence_position_v1',
    'latest_canonical_financial_validation',
    'maintenance_canonical_assets_v1',
    'maintenance_operational_work_order_flow_v1',
    'maintenance_work_order_flow_v1',
    'operational_pipeline_guidance_v2',
    'operational_procurement_pipeline',
    'procurement_intake_flow',
    'procurement_overview',
    'product_procurement_status',
    'production_metallurgy_automatic_v1',
    'purchase_order_quality',
    'supplier_performance',
    'supplier_performance_v1',
    'supplier_reconciliation_v1'
  ];
  view_name text;
begin
  foreach view_name in array secured_views loop
    if to_regclass(format('public.%I', view_name)) is null then
      continue;
    end if;

    execute format(
      'alter view public.%I set (security_invoker = true)',
      view_name
    );
    execute format(
      'revoke all privileges on table public.%I from anon, authenticated',
      view_name
    );
    execute format(
      'grant select on table public.%I to service_role',
      view_name
    );
  end loop;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and c.relname = any (secured_views)
      and (
        not coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true']
        or has_table_privilege('anon', c.oid, 'select')
        or has_table_privilege('authenticated', c.oid, 'select')
      )
  ) then
    raise exception 'canonical public-view hardening verification failed';
  end if;
end
$migration$;
