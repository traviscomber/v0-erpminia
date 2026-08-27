create or replace view intelligence.operational_procurement_finance_ledger_v1
with (security_invoker = true) as
select
  o.organization_id,
  'operational_po_line:' || l.id::text as event_id,
  o.issued_at as event_at,
  'ERP'::text as origin,
  'purchase_commitment'::text as event_type,
  'committed'::text as recognition_status,
  'public.procurement_operational_order_lines'::text as source_table,
  l.id::text as source_record_id,
  o.work_order_id,
  o.canonical_asset_id,
  l.canonical_product_id,
  o.supplier_id,
  pc.code as cost_center_code,
  greatest(l.quantity_ordered - l.quantity_received, 0) as quantity,
  l.unit_cost,
  greatest(l.quantity_ordered - l.quantity_received, 0) * l.unit_cost as amount,
  coalesce(o.currency, 'CLP') as currency,
  l.description,
  jsonb_build_object(
    'order_id', o.id,
    'order_number', o.order_number,
    'order_status', o.status,
    'quantity_ordered', l.quantity_ordered,
    'quantity_received', l.quantity_received,
    'cost_center_resolution', case when pc.id is null then 'missing' else 'work_order' end
  ) as metadata
from public.procurement_operational_order_lines l
join public.procurement_operational_orders o on o.id = l.order_id and o.organization_id = l.organization_id
left join public.maintenance_work_orders wo on wo.id = o.work_order_id and wo.organization_id = o.organization_id
left join public.cost_centers pc on pc.id = wo.cost_center_id and pc.organization_id = o.organization_id
where greatest(l.quantity_ordered - l.quantity_received, 0) > 0

union all

select
  r.organization_id,
  'operational_receipt_line:' || rl.id::text as event_id,
  r.received_at as event_at,
  'ERP'::text as origin,
  'procurement_receipt_cost'::text as event_type,
  'recognized'::text as recognition_status,
  'public.procurement_operational_receipt_lines'::text as source_table,
  rl.id::text as source_record_id,
  o.work_order_id,
  o.canonical_asset_id,
  rl.canonical_product_id,
  o.supplier_id,
  pc.code as cost_center_code,
  rl.quantity_accepted as quantity,
  rl.unit_cost,
  rl.quantity_accepted * rl.unit_cost as amount,
  coalesce(o.currency, 'CLP') as currency,
  l.description,
  jsonb_build_object(
    'receipt_id', r.id,
    'receipt_number', r.receipt_number,
    'order_id', o.id,
    'order_number', o.order_number,
    'quantity_received', rl.quantity_received,
    'quantity_accepted', rl.quantity_accepted,
    'quantity_rejected', rl.quantity_rejected,
    'cost_center_resolution', case when pc.id is null then 'missing' else 'work_order' end
  ) as metadata
from public.procurement_operational_receipt_lines rl
join public.procurement_operational_receipts r on r.id = rl.receipt_id and r.organization_id = rl.organization_id
join public.procurement_operational_order_lines l on l.id = rl.order_line_id and l.organization_id = rl.organization_id
join public.procurement_operational_orders o on o.id = l.order_id and o.organization_id = l.organization_id
left join public.maintenance_work_orders wo on wo.id = o.work_order_id and wo.organization_id = o.organization_id
left join public.cost_centers pc on pc.id = wo.cost_center_id and pc.organization_id = o.organization_id
where rl.quantity_accepted > 0;

create or replace view intelligence.operational_procurement_finance_summary_v1
with (security_invoker = true) as
select
  organization_id,
  coalesce(sum(amount) filter (where recognition_status = 'committed'),0) as committed_clp,
  coalesce(sum(amount) filter (where recognition_status = 'recognized'),0) as recognized_clp,
  count(*) filter (where recognition_status = 'committed') as commitment_event_count,
  count(*) filter (where recognition_status = 'recognized') as recognized_event_count,
  count(*) filter (where cost_center_code is null) as missing_cost_center_events,
  coalesce(sum(amount) filter (where cost_center_code is null),0) as missing_cost_center_amount,
  max(event_at) as last_activity_at
from intelligence.operational_procurement_finance_ledger_v1
group by organization_id;

create or replace view public.operational_procurement_finance_ledger_v1
with (security_invoker = true) as
select * from intelligence.operational_procurement_finance_ledger_v1;

create or replace view public.operational_procurement_finance_summary_v1
with (security_invoker = true) as
select * from intelligence.operational_procurement_finance_summary_v1;

revoke all on public.operational_procurement_finance_ledger_v1 from public, anon, authenticated;
revoke all on public.operational_procurement_finance_summary_v1 from public, anon, authenticated;
grant select on public.operational_procurement_finance_ledger_v1 to service_role;
grant select on public.operational_procurement_finance_summary_v1 to service_role;
