alter table public.procurement_operational_orders
  add column if not exists cost_center_id uuid null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='procurement_operational_orders_cost_center_id_fkey'
  ) then
    alter table public.procurement_operational_orders
      add constraint procurement_operational_orders_cost_center_id_fkey
      foreign key (cost_center_id) references public.cost_centers(id);
  end if;
end $$;

create index if not exists procurement_operational_orders_cost_center_id_idx
  on public.procurement_operational_orders(cost_center_id);

create or replace function public.award_intake_quotation(p_quotation_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public','canonical','pg_temp'
as $function$
declare
  v_quote public.procurement_intake_quotations%rowtype;
  v_req public.procurement_intake_requests%rowtype;
  v_work_order public.maintenance_work_orders%rowtype;
  v_cost_center public.cost_centers%rowtype;
  v_order_id uuid;
  v_order_number text;
begin
  select * into v_quote from public.procurement_intake_quotations where id=p_quotation_id for update;
  if not found then raise exception 'Cotización no encontrada'; end if;
  if v_quote.organization_id not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;
  if v_quote.status <> 'received' then raise exception 'Cotización no adjudicable'; end if;

  select * into v_req from public.procurement_intake_requests where id=v_quote.intake_request_id for update;
  if not found then raise exception 'Solicitud operativa no encontrada'; end if;

  if v_req.work_order_id is not null then
    select * into v_work_order
    from public.maintenance_work_orders
    where id=v_req.work_order_id and organization_id=v_req.organization_id
    for update;
    if not found then raise exception 'OT asociada no encontrada en la organización'; end if;
    if v_work_order.cost_center_id is null then
      raise exception 'Imputación contable pendiente: asigne un centro de costo válido a la OT antes de adjudicar';
    end if;
    select * into v_cost_center
    from public.cost_centers
    where id=v_work_order.cost_center_id
      and organization_id=v_req.organization_id
      and coalesce(status,'active') not in ('inactive','disabled','closed');
    if not found then
      raise exception 'Imputación contable inválida: el centro de costo de la OT no está activo o no pertenece a la organización';
    end if;
  end if;

  v_order_number := 'OCO-'||to_char(current_date,'YYYY')||'-'||lpad((coalesce((select count(*)+1 from public.procurement_operational_orders where organization_id=v_quote.organization_id),1))::text,5,'0');

  insert into public.procurement_operational_orders(
    organization_id,order_number,intake_request_id,awarded_quotation_id,supplier_id,
    work_order_id,canonical_asset_id,cost_center_id,total_amount,expected_delivery_date,issued_by
  ) values(
    v_quote.organization_id,v_order_number,v_req.id,v_quote.id,v_quote.supplier_id,
    v_req.work_order_id,v_req.canonical_asset_id,
    case when v_req.work_order_id is null then null else v_work_order.cost_center_id end,
    v_quote.total_amount,current_date+coalesce(v_quote.lead_time_days,0),public.current_application_user_id()
  ) returning id into v_order_id;

  insert into public.procurement_operational_order_lines(
    organization_id,order_id,intake_line_id,canonical_product_id,product_code,
    description,unit,quantity_ordered,unit_cost
  )
  select ql.organization_id,v_order_id,ql.intake_line_id,ql.canonical_product_id,
    irl.product_code,irl.description,irl.unit,ql.quantity,ql.unit_cost
  from public.procurement_intake_quotation_lines ql
  join public.procurement_intake_request_lines irl on irl.id=ql.intake_line_id
  where ql.quotation_id=v_quote.id;

  update public.procurement_intake_quotations
  set status=case when id=v_quote.id then 'awarded' else 'rejected' end,updated_at=now()
  where intake_request_id=v_req.id and status='received';

  update public.procurement_intake_requests
  set status='ordered',updated_at=now()
  where id=v_req.id;

  insert into public.work_order_events(
    organization_id,work_order_id,canonical_asset_id,event_type,actor_id,
    source_table,source_record_id,summary,payload
  ) values(
    v_req.organization_id,v_req.work_order_id,v_req.canonical_asset_id,
    'purchase_order_issued',public.current_application_user_id(),
    'procurement_operational_orders',v_order_id::text,'OC operativa emitida',
    jsonb_build_object(
      'order_id',v_order_id,
      'order_number',v_order_number,
      'total_amount',v_quote.total_amount,
      'cost_center_id',case when v_req.work_order_id is null then null else v_work_order.cost_center_id end,
      'cost_center_code',case when v_req.work_order_id is null then null else v_cost_center.code end
    )
  );

  return v_order_id;
end
$function$;

create or replace view intelligence.operational_procurement_finance_ledger_v1
with (security_invoker=true)
as
select
  o.organization_id,
  'operational_po_line:'::text || l.id::text as event_id,
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
  greatest(l.quantity_ordered-l.quantity_received,0::numeric) as quantity,
  l.unit_cost,
  greatest(l.quantity_ordered-l.quantity_received,0::numeric)*l.unit_cost as amount,
  coalesce(o.currency,'CLP'::text) as currency,
  l.description,
  jsonb_build_object(
    'order_id',o.id,'order_number',o.order_number,'order_status',o.status,
    'quantity_ordered',l.quantity_ordered,'quantity_received',l.quantity_received,
    'cost_center_id',o.cost_center_id,
    'cost_center_resolution',case when pc.id is null then 'missing'::text else 'order_snapshot'::text end
  ) as metadata
from public.procurement_operational_order_lines l
join public.procurement_operational_orders o
  on o.id=l.order_id and o.organization_id=l.organization_id
left join public.cost_centers pc
  on pc.id=o.cost_center_id and pc.organization_id=o.organization_id
where greatest(l.quantity_ordered-l.quantity_received,0::numeric)>0::numeric
union all
select
  r.organization_id,
  'operational_receipt_line:'::text || rl.id::text as event_id,
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
  rl.quantity_accepted*rl.unit_cost as amount,
  coalesce(o.currency,'CLP'::text) as currency,
  l.description,
  jsonb_build_object(
    'receipt_id',r.id,'receipt_number',r.receipt_number,'order_id',o.id,'order_number',o.order_number,
    'quantity_received',rl.quantity_received,'quantity_accepted',rl.quantity_accepted,'quantity_rejected',rl.quantity_rejected,
    'cost_center_id',o.cost_center_id,
    'cost_center_resolution',case when pc.id is null then 'missing'::text else 'order_snapshot'::text end
  ) as metadata
from public.procurement_operational_receipt_lines rl
join public.procurement_operational_receipts r
  on r.id=rl.receipt_id and r.organization_id=rl.organization_id
join public.procurement_operational_order_lines l
  on l.id=rl.order_line_id and l.organization_id=rl.organization_id
join public.procurement_operational_orders o
  on o.id=l.order_id and o.organization_id=l.organization_id
left join public.cost_centers pc
  on pc.id=o.cost_center_id and pc.organization_id=o.organization_id
where rl.quantity_accepted>0::numeric;

create or replace view intelligence.operational_procurement_finance_summary_v1
with (security_invoker=true)
as
select
  organization_id,
  coalesce(sum(amount) filter(where recognition_status='committed'::text),0::numeric) as committed_clp,
  coalesce(sum(amount) filter(where recognition_status='recognized'::text),0::numeric) as recognized_clp,
  count(*) filter(where recognition_status='committed'::text) as commitment_event_count,
  count(*) filter(where recognition_status='recognized'::text) as recognized_event_count,
  count(*) filter(where cost_center_code is null) as missing_cost_center_events,
  coalesce(sum(amount) filter(where cost_center_code is null),0::numeric) as missing_cost_center_amount,
  max(event_at) as last_activity_at
from intelligence.operational_procurement_finance_ledger_v1
group by organization_id;
