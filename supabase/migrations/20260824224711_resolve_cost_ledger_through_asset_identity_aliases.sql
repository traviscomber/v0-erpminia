create or replace view intelligence.cost_event_ledger as
select ac.organization_id,
    'canonical_asset_cost:'::text || ac.id as event_id,
    ac.transaction_date::timestamptz as event_at,
    'CANONICAL'::text as origin,
    'actual_cost'::text as event_type,
    'recognized'::text as recognition_status,
    'canonical.asset_costs'::text as source_table,
    ac.id::text as source_record_id,
    coalesce(alias_cost.target_asset_id, a_cost.id) as canonical_asset_id,
    null::uuid as canonical_product_id,
    null::uuid as supplier_id,
    null::uuid as work_order_id,
    ac.cost_center_code,
    ac.quantity,
    ac.unit_cost,
    ac.total_cost as amount,
    coalesce(ac.currency, 'CLP'::text) as currency,
    ac.description,
    jsonb_build_object(
      'document_number', ac.document_number,
      'category', ac.category,
      'asset_code', ac.asset_code,
      'validation_status', ac.validation_status,
      'asset_identity_resolution', case when alias_cost.target_asset_id is not null then 'approved_alias' else 'direct' end
    ) as metadata
from canonical.asset_costs ac
left join canonical.assets a_cost
  on a_cost.organization_id=ac.organization_id and a_cost.asset_code=ac.asset_code
left join canonical.asset_identity_aliases alias_cost
  on alias_cost.organization_id=ac.organization_id
 and alias_cost.source_asset_id=a_cost.id
 and alias_cost.is_active

union all

select po.organization_id,
    'canonical_po_line:'::text || pol.id as event_id,
    po.order_date::timestamptz as event_at,
    'CANONICAL'::text as origin,
    'purchase_commitment'::text as event_type,
    'committed'::text as recognition_status,
    'canonical.purchase_order_lines'::text as source_table,
    pol.id::text as source_record_id,
    coalesce(alias_po.target_asset_id, a_po.id) as canonical_asset_id,
    pol.canonical_product_id,
    po.canonical_supplier_id as supplier_id,
    null::uuid as work_order_id,
    nullif(regexp_replace(coalesce(pol.cost_center_code,po.cost_center_code,''), '\s+.*$', ''), '') as cost_center_code,
    pol.quantity,
    pol.unit_cost,
    pol.net_amount as amount,
    coalesce(po.currency,'CLP'::text) as currency,
    pol.description,
    jsonb_build_object(
      'order_number', po.order_number,
      'order_status', po.status,
      'validation_status', pol.validation_status,
      'asset_reference', pol.asset_reference,
      'asset_identity_resolution', case when alias_po.target_asset_id is not null then 'approved_alias' else 'direct' end
    ) as metadata
from canonical.purchase_order_lines pol
join canonical.purchase_orders po on po.id=pol.purchase_order_id
left join canonical.assets a_po
  on a_po.organization_id=po.organization_id
 and (a_po.asset_code=pol.asset_reference or a_po.name=pol.asset_reference)
left join canonical.asset_identity_aliases alias_po
  on alias_po.organization_id=po.organization_id
 and alias_po.source_asset_id=a_po.id
 and alias_po.is_active

union all

select wop.organization_id,
    'erp_part:'::text || wop.id as event_id,
    coalesce(wop.installed_at,wop.created_at) as event_at,
    'ERP'::text as origin,
    'work_order_part_cost'::text as event_type,
    case when wop.quantity_installed>0 then 'recognized'::text else 'pending'::text end as recognition_status,
    'public.work_order_parts'::text as source_table,
    wop.id::text as source_record_id,
    wop.canonical_asset_id,
    wop.canonical_product_id,
    null::uuid as supplier_id,
    wop.work_order_id,
    cc.code as cost_center_code,
    wop.quantity_installed::numeric as quantity,
    wop.unit_cost,
    coalesce(wop.quantity_installed,0)::numeric * coalesce(wop.unit_cost,0::numeric) as amount,
    'CLP'::text as currency,
    coalesce(wop.notes,'Repuesto OT'::text) as description,
    jsonb_build_object('status',wop.status,'issued',wop.quantity_issued,'returned',wop.quantity_returned) as metadata
from public.work_order_parts wop
left join public.maintenance_work_orders wo on wo.id=wop.work_order_id
left join public.cost_centers cc on cc.id=wo.cost_center_id
where coalesce(wop.quantity_installed,0)>0

union all

select wol.organization_id,
    'erp_labor:'::text || wol.id as event_id,
    coalesce(wol.ended_at,wol.started_at,wol.created_at) as event_at,
    'ERP'::text as origin,
    'labor_cost'::text as event_type,
    'recognized'::text as recognition_status,
    'public.work_order_labor_entries'::text as source_table,
    wol.id::text as source_record_id,
    wol.canonical_asset_id,
    null::uuid as canonical_product_id,
    null::uuid as supplier_id,
    wol.work_order_id,
    cc.code as cost_center_code,
    wol.hours as quantity,
    wol.hourly_cost as unit_cost,
    coalesce(wol.hours,0::numeric) * coalesce(wol.hourly_cost,0::numeric) as amount,
    'CLP'::text as currency,
    coalesce(wol.notes,'Mano de obra OT'::text) as description,
    jsonb_build_object('technician_id',wol.technician_id,'technician_name',wol.technician_name) as metadata
from public.work_order_labor_entries wol
left join public.maintenance_work_orders wo on wo.id=wol.work_order_id
left join public.cost_centers cc on cc.id=wo.cost_center_id
where coalesce(wol.hours,0::numeric)>0::numeric

union all

select wo.organization_id,
    'erp_external:'::text || wo.id as event_id,
    coalesce(wo.closed_at,wo.updated_at::timestamptz) as event_at,
    'ERP'::text as origin,
    'external_service_cost'::text as event_type,
    case when wo.status='completed'::text then 'recognized'::text else 'pending'::text end as recognition_status,
    'public.maintenance_work_orders'::text as source_table,
    wo.id::text as source_record_id,
    wo.canonical_asset_id,
    null::uuid as canonical_product_id,
    null::uuid as supplier_id,
    wo.id as work_order_id,
    cc.code as cost_center_code,
    1::numeric as quantity,
    wo.external_cost as unit_cost,
    wo.external_cost as amount,
    'CLP'::text as currency,
    'Costo externo OT'::text as description,
    jsonb_build_object('work_order_number',wo.work_order_number,'status',wo.status) as metadata
from public.maintenance_work_orders wo
left join public.cost_centers cc on cc.id=wo.cost_center_id
where coalesce(wo.external_cost,0::numeric)<>0::numeric;
