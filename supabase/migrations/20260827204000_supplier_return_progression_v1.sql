create or replace view public.procurement_supplier_returnable_lines_v1
with (security_invoker=true) as
with returned as (
  select l.organization_id,l.receipt_line_id,sum(l.quantity) as quantity_returned
  from public.procurement_supplier_return_lines l
  join public.procurement_supplier_returns r on r.id=l.return_id and r.organization_id=l.organization_id
  where r.status<>'cancelled'
  group by l.organization_id,l.receipt_line_id
)
select rl.organization_id,
       rl.id as receipt_line_id,
       rl.receipt_id,
       r.receipt_number,
       r.order_id,
       o.order_number,
       o.supplier_id,
       rl.order_line_id,
       rl.canonical_product_id,
       rl.quantity_received,
       rl.quantity_accepted,
       rl.quantity_rejected,
       coalesce(x.quantity_returned,0) as quantity_returned,
       greatest(rl.quantity_rejected-coalesce(x.quantity_returned,0),0) as quantity_returnable,
       rl.unit_cost,
       rl.batch_number,
       rl.expiry_date,
       r.received_at
from public.procurement_operational_receipt_lines rl
join public.procurement_operational_receipts r on r.id=rl.receipt_id and r.organization_id=rl.organization_id
join public.procurement_operational_orders o on o.id=r.order_id and o.organization_id=r.organization_id
left join returned x on x.organization_id=rl.organization_id and x.receipt_line_id=rl.id
where rl.quantity_rejected>0;

revoke all on public.procurement_supplier_returnable_lines_v1 from public,anon,authenticated;
grant select on public.procurement_supplier_returnable_lines_v1 to service_role;

create or replace function public.create_supplier_return_v1(
  p_organization_id uuid,
  p_receipt_id uuid,
  p_reason text,
  p_resolution_type text,
  p_lines jsonb,
  p_evidence_url text default null,
  p_notes text default null
) returns uuid
language plpgsql security definer
set search_path='public','canonical','pg_temp'
as $$
declare
  v_receipt public.procurement_operational_receipts%rowtype;
  v_order public.procurement_operational_orders%rowtype;
  v_return_id uuid:=gen_random_uuid();
  v_return_number text;
  v_line jsonb;
  v_receipt_line public.procurement_operational_receipt_lines%rowtype;
  v_qty numeric;
  v_returned numeric;
begin
  if p_reason is null or btrim(p_reason)='' then raise exception 'Motivo de devolución requerido'; end if;
  if p_resolution_type not in ('replacement','credit_note','refund','repair','pending') then raise exception 'Resolución de devolución inválida'; end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'Debe informar líneas a devolver'; end if;

  select * into v_receipt from public.procurement_operational_receipts
  where id=p_receipt_id and organization_id=p_organization_id for update;
  if not found then raise exception 'Recepción no encontrada'; end if;
  select * into v_order from public.procurement_operational_orders
  where id=v_receipt.order_id and organization_id=p_organization_id for update;
  if not found then raise exception 'OC operativa no encontrada'; end if;
  if auth.role()<>'service_role' and p_organization_id not in (
    select organization_id from public.user_roles where user_id=public.current_application_user_id()
  ) then raise exception 'Sin permisos'; end if;

  v_return_number:='DEV-'||to_char(current_date,'YYYY')||'-'||lpad((coalesce((select count(*)+1 from public.procurement_supplier_returns where organization_id=p_organization_id),1))::text,5,'0');
  insert into public.procurement_supplier_returns(
    id,organization_id,return_number,order_id,receipt_id,supplier_id,reason,resolution_type,status,evidence_url,requested_by,requested_at,notes,created_at,updated_at
  ) values (
    v_return_id,p_organization_id,v_return_number,v_order.id,v_receipt.id,v_order.supplier_id,btrim(p_reason),p_resolution_type,'sent',p_evidence_url,public.current_application_user_id(),now(),p_notes,now(),now()
  );

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_receipt_line from public.procurement_operational_receipt_lines
    where id=(v_line->>'receipt_line_id')::uuid
      and receipt_id=v_receipt.id
      and organization_id=p_organization_id
    for update;
    if not found then raise exception 'Línea de recepción inválida'; end if;
    v_qty:=coalesce((v_line->>'quantity')::numeric,0);
    if v_qty<=0 then raise exception 'Cantidad a devolver inválida'; end if;
    select coalesce(sum(l.quantity),0) into v_returned
    from public.procurement_supplier_return_lines l
    join public.procurement_supplier_returns sr on sr.id=l.return_id and sr.organization_id=l.organization_id
    where l.organization_id=p_organization_id and l.receipt_line_id=v_receipt_line.id and sr.status<>'cancelled';
    if v_qty>greatest(v_receipt_line.quantity_rejected-v_returned,0) then raise exception 'La devolución excede la cantidad rechazada pendiente'; end if;

    insert into public.procurement_supplier_return_lines(
      organization_id,return_id,receipt_line_id,order_line_id,canonical_product_id,quantity,unit_cost,created_at
    ) values (
      p_organization_id,v_return_id,v_receipt_line.id,v_receipt_line.order_line_id,v_receipt_line.canonical_product_id,v_qty,v_receipt_line.unit_cost,now()
    );

    update public.procurement_operational_order_lines
      set quantity_received=greatest(quantity_received-v_qty,0)
    where id=v_receipt_line.order_line_id and organization_id=p_organization_id;
  end loop;

  update public.procurement_operational_orders o
    set status=case when exists(
      select 1 from public.procurement_operational_order_lines l
      where l.order_id=o.id and l.organization_id=o.organization_id and l.quantity_received<l.quantity_ordered
    ) then 'partially_received' else 'received' end,
    updated_at=now()
  where o.id=v_order.id and o.organization_id=p_organization_id;

  update public.procurement_intake_requests r
    set status=case when (select status from public.procurement_operational_orders where id=v_order.id)='received' then 'received' else 'partially_received' end,
        updated_at=now()
  where r.id=v_order.intake_request_id and r.organization_id=p_organization_id;

  if v_order.work_order_id is not null then
    perform public.recalculate_work_order_material_coverage(v_order.work_order_id, public.current_application_user_id());
    insert into public.work_order_events(organization_id,work_order_id,canonical_asset_id,event_type,actor_id,source_table,source_record_id,summary,payload)
    values(p_organization_id,v_order.work_order_id,v_order.canonical_asset_id,'supplier_return',public.current_application_user_id(),'procurement_supplier_returns',v_return_id::text,'Devolución enviada a proveedor',jsonb_build_object('return_id',v_return_id,'return_number',v_return_number,'resolution_type',p_resolution_type));
  end if;

  return v_return_id;
end $$;

revoke all on function public.create_supplier_return_v1(uuid,uuid,text,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.create_supplier_return_v1(uuid,uuid,text,text,jsonb,text,text) to service_role;
