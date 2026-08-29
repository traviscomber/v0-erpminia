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
  v_distinct_supplier_count integer;
  v_has_approved_exception boolean;
begin
  select * into v_quote from public.procurement_intake_quotations where id=p_quotation_id for update;
  if not found then raise exception 'Cotización no encontrada'; end if;
  if v_quote.organization_id not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;
  if v_quote.status <> 'received' then raise exception 'Cotización no adjudicable'; end if;

  select * into v_req from public.procurement_intake_requests where id=v_quote.intake_request_id for update;
  if not found then raise exception 'Solicitud operativa no encontrada'; end if;

  select count(distinct supplier_id)::integer
  into v_distinct_supplier_count
  from public.procurement_intake_quotations
  where intake_request_id=v_req.id
    and organization_id=v_req.organization_id
    and supplier_id is not null
    and status in ('received','awarded');

  v_has_approved_exception :=
    v_req.quotation_exception_type is not null
    and nullif(btrim(v_req.quotation_exception_reason),'') is not null
    and v_req.quotation_exception_approved_by is not null
    and v_req.quotation_exception_approved_at is not null;

  if v_distinct_supplier_count < greatest(coalesce(v_req.required_supplier_quotes,3),1)
     and not v_has_approved_exception then
    raise exception 'Política de cotizaciones incompleta: se requieren % proveedores distintos y sólo hay %. Registre las cotizaciones faltantes o una excepción aprobada.',
      greatest(coalesce(v_req.required_supplier_quotes,3),1), v_distinct_supplier_count;
  end if;

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
      'cost_center_code',case when v_req.work_order_id is null then null else v_cost_center.code end,
      'distinct_supplier_count',v_distinct_supplier_count,
      'required_supplier_quotes',greatest(coalesce(v_req.required_supplier_quotes,3),1),
      'used_quotation_exception',v_has_approved_exception
    )
  );

  return v_order_id;
end
$function$;
