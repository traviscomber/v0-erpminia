alter table public.procurement_supplier_returns
  add column if not exists received_by_supplier_at timestamptz;

update public.procurement_supplier_returns
set received_by_supplier_at = updated_at
where status = 'received_by_supplier'
  and received_by_supplier_at is null;

create or replace function public.mark_supplier_return_received_v1(
  p_organization_id uuid,
  p_return_id uuid,
  p_reference text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  update public.procurement_supplier_returns
  set status = 'received_by_supplier',
      received_by_supplier_at = now(),
      resolution_reference = coalesce(nullif(btrim(p_reference),''), resolution_reference),
      notes = coalesce(nullif(btrim(p_notes),''), notes),
      updated_at = now()
  where id = p_return_id
    and organization_id = p_organization_id
    and status = 'sent';

  if not found then
    raise exception 'Devolución no encontrada o no está enviada';
  end if;
end
$function$;

revoke all on function public.mark_supplier_return_received_v1(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.mark_supplier_return_received_v1(uuid,uuid,text,text) to service_role;

create or replace function public.resolve_supplier_return_replacement_v1(
  p_organization_id uuid,
  p_return_id uuid,
  p_replacement_receipt_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_ret public.procurement_supplier_returns%rowtype;
  v_receipt public.procurement_operational_receipts%rowtype;
  v_order public.procurement_operational_orders%rowtype;
  v_bad bigint;
begin
  select * into v_ret
  from public.procurement_supplier_returns
  where id = p_return_id
    and organization_id = p_organization_id
  for update;

  if not found then raise exception 'Devolución no encontrada'; end if;
  if v_ret.status in ('resolved','cancelled') then raise exception 'Devolución ya cerrada'; end if;
  if v_ret.status <> 'received_by_supplier' then
    raise exception 'La devolución debe estar recibida por el proveedor antes de registrar una reposición';
  end if;
  if v_ret.received_by_supplier_at is null then
    raise exception 'La devolución no tiene evidencia temporal de recepción por el proveedor';
  end if;

  select * into v_receipt
  from public.procurement_operational_receipts
  where id = p_replacement_receipt_id
    and organization_id = p_organization_id
    and order_id = v_ret.order_id
    and id is distinct from v_ret.receipt_id
    and received_at >= v_ret.received_by_supplier_at
  for update;

  if not found then
    raise exception 'Recepción de reposición inválida o anterior a la recepción de la devolución por el proveedor';
  end if;

  with needed as (
    select rl.order_line_id, sum(rl.quantity) as quantity
    from public.procurement_supplier_return_lines rl
    where rl.return_id = v_ret.id
      and rl.organization_id = p_organization_id
    group by rl.order_line_id
  ), accepted as (
    select x.order_line_id, sum(x.quantity_accepted) as quantity
    from public.procurement_operational_receipt_lines x
    where x.receipt_id = v_receipt.id
      and x.organization_id = p_organization_id
    group by x.order_line_id
  ), allocated as (
    select rl.order_line_id, sum(rl.quantity) as quantity
    from public.procurement_supplier_returns r
    join public.procurement_supplier_return_lines rl
      on rl.return_id = r.id
     and rl.organization_id = r.organization_id
    where r.organization_id = p_organization_id
      and r.id <> v_ret.id
      and r.status = 'resolved'
      and r.resolution_type = 'replacement'
      and r.replacement_receipt_id = v_receipt.id
    group by rl.order_line_id
  )
  select count(*) into v_bad
  from needed n
  left join accepted a on a.order_line_id = n.order_line_id
  left join allocated al on al.order_line_id = n.order_line_id
  where coalesce(a.quantity,0) < n.quantity + coalesce(al.quantity,0);

  if v_bad > 0 then
    raise exception 'La recepción de reposición no cubre toda la devolución disponible';
  end if;

  update public.procurement_supplier_returns
  set resolution_type = 'replacement',
      status = 'resolved',
      replacement_receipt_id = v_receipt.id,
      resolved_by = public.current_application_user_id(),
      resolved_at = now(),
      resolution_reference = v_receipt.receipt_number,
      notes = coalesce(nullif(btrim(p_notes),''), notes),
      updated_at = now()
  where id = v_ret.id;

  select * into v_order
  from public.procurement_operational_orders
  where id = v_ret.order_id
    and organization_id = p_organization_id
  for update;

  if not exists (
       select 1
       from public.procurement_operational_order_lines l
       where l.order_id = v_order.id
         and l.quantity_received < l.quantity_ordered
     )
     and not exists (
       select 1
       from public.procurement_supplier_returns r
       where r.order_id = v_order.id
         and r.organization_id = p_organization_id
         and r.status not in ('resolved','cancelled')
     ) then
    update public.procurement_operational_orders
    set status = 'closed', updated_at = now()
    where id = v_order.id;

    update public.procurement_intake_requests
    set status = 'received', updated_at = now()
    where id = v_order.intake_request_id
      and organization_id = p_organization_id;
  end if;
end
$function$;

revoke all on function public.resolve_supplier_return_replacement_v1(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.resolve_supplier_return_replacement_v1(uuid,uuid,uuid,text) to service_role;
