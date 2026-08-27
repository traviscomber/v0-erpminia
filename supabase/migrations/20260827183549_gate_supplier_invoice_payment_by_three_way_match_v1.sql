alter table public.procurement_supplier_invoices
  add column if not exists approved_for_payment_by uuid,
  add column if not exists approved_for_payment_at timestamptz,
  add column if not exists approval_basis text,
  add column if not exists approval_notes text;

alter table public.procurement_supplier_invoices
  drop constraint if exists procurement_supplier_invoices_approval_basis_check;
alter table public.procurement_supplier_invoices
  add constraint procurement_supplier_invoices_approval_basis_check
  check (approval_basis is null or approval_basis in ('matched','accepted_exception'));

create or replace function public.sync_supplier_invoice_match_exceptions_v1(p_invoice_id uuid)
returns text language plpgsql security definer set search_path to 'public','intelligence','canonical','pg_temp'
as $function$
declare v_org uuid; v_match text;
begin
  select organization_id into v_org from public.procurement_supplier_invoices where id=p_invoice_id;
  if not found then raise exception 'Factura proveedor no encontrada'; end if;
  if v_org not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;
  select match_status into v_match from public.procurement_three_way_match_summary_v1 where invoice_id=p_invoice_id and organization_id=v_org;
  v_match := coalesce(v_match,'no_lines');
  delete from public.procurement_match_exceptions where invoice_id=p_invoice_id and organization_id=v_org and status='open';
  insert into public.procurement_match_exceptions(organization_id,invoice_id,order_line_id,exception_type,expected_value,actual_value,difference,status)
  select l.organization_id,l.invoice_id,l.order_line_id,
    case when l.line_match_status in ('quantity_over_order','quantity_over_receipt') then 'quantity' when l.line_match_status='price_mismatch' then 'unit_price' when l.line_match_status='pending_receipt' then 'missing_receipt' when l.line_match_status='product_mismatch' then 'unknown_product' else 'other' end,
    case when l.line_match_status='quantity_over_order' then l.quantity_ordered when l.line_match_status in ('quantity_over_receipt','pending_receipt') then l.quantity_accepted when l.line_match_status='price_mismatch' then l.ordered_unit_cost else null end,
    case when l.line_match_status in ('quantity_over_order','quantity_over_receipt','pending_receipt') then l.quantity_invoiced when l.line_match_status='price_mismatch' then l.invoiced_unit_cost else null end,
    case when l.line_match_status='quantity_over_order' then l.quantity_invoiced-l.quantity_ordered when l.line_match_status in ('quantity_over_receipt','pending_receipt') then l.quantity_invoiced-l.quantity_accepted when l.line_match_status='price_mismatch' then l.invoiced_unit_cost-l.ordered_unit_cost else null end,
    'open'
  from public.procurement_three_way_match_lines_v1 l
  where l.invoice_id=p_invoice_id and l.organization_id=v_org and l.line_match_status<>'matched'
    and not exists (select 1 from public.procurement_match_exceptions e where e.invoice_id=l.invoice_id and e.organization_id=l.organization_id and e.order_line_id=l.order_line_id and e.status='accepted'
      and e.exception_type=case when l.line_match_status in ('quantity_over_order','quantity_over_receipt') then 'quantity' when l.line_match_status='price_mismatch' then 'unit_price' when l.line_match_status='pending_receipt' then 'missing_receipt' when l.line_match_status='product_mismatch' then 'unknown_product' else 'other' end
      and e.expected_value is not distinct from case when l.line_match_status='quantity_over_order' then l.quantity_ordered when l.line_match_status in ('quantity_over_receipt','pending_receipt') then l.quantity_accepted when l.line_match_status='price_mismatch' then l.ordered_unit_cost else null end
      and e.actual_value is not distinct from case when l.line_match_status in ('quantity_over_order','quantity_over_receipt','pending_receipt') then l.quantity_invoiced when l.line_match_status='price_mismatch' then l.invoiced_unit_cost else null end);
  if v_match in ('supplier_mismatch','currency_mismatch','no_lines','amount_mismatch','exception') then
    insert into public.procurement_match_exceptions(organization_id,invoice_id,order_line_id,exception_type,expected_value,actual_value,difference,status)
    select s.organization_id,s.invoice_id,null,case when s.match_status='amount_mismatch' then 'total' else 'other' end,
      case when s.match_status='amount_mismatch' then s.lines_net_amount else null end,
      case when s.match_status='amount_mismatch' then s.net_amount else null end,
      case when s.match_status='amount_mismatch' then s.net_amount-s.lines_net_amount else null end,'open'
    from public.procurement_three_way_match_summary_v1 s
    where s.invoice_id=p_invoice_id and s.organization_id=v_org
      and not exists (select 1 from public.procurement_match_exceptions e where e.invoice_id=s.invoice_id and e.organization_id=s.organization_id and e.order_line_id is null and e.status='accepted'
        and e.exception_type=case when s.match_status='amount_mismatch' then 'total' else 'other' end
        and e.expected_value is not distinct from case when s.match_status='amount_mismatch' then s.lines_net_amount else null end
        and e.actual_value is not distinct from case when s.match_status='amount_mismatch' then s.net_amount else null end);
  end if;
  return v_match;
end $function$;

create or replace function public.refresh_supplier_invoice_match_v1(p_invoice_id uuid)
returns text language plpgsql security definer set search_path to 'public','intelligence','canonical','pg_temp'
as $function$
declare v_org uuid; v_match text; v_current_status text; v_new_status text;
begin
  select organization_id,status into v_org,v_current_status from public.procurement_supplier_invoices where id=p_invoice_id for update;
  if not found then raise exception 'Factura proveedor no encontrada'; end if;
  if v_org not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;
  v_match := public.sync_supplier_invoice_match_exceptions_v1(p_invoice_id);
  v_new_status := case when v_match='matched' then 'matched' when v_match='pending_receipt' then 'pending_match' else 'exception' end;
  if v_current_status not in ('approved','rejected') then update public.procurement_supplier_invoices set status=v_new_status,updated_at=now() where id=p_invoice_id; end if;
  return v_match;
end $function$;

create or replace function public.resolve_procurement_match_exception_v1(p_exception_id uuid,p_decision text,p_notes text)
returns void language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_org uuid;
begin
  if p_decision not in ('accepted','corrected','rejected') then raise exception 'Decisión de excepción inválida'; end if;
  if p_notes is null or btrim(p_notes)='' then raise exception 'Notas de resolución requeridas'; end if;
  select organization_id into v_org from public.procurement_match_exceptions where id=p_exception_id for update;
  if not found then raise exception 'Excepción no encontrada'; end if;
  if v_org not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;
  update public.procurement_match_exceptions set status=p_decision,resolution_notes=btrim(p_notes),resolved_by=public.current_application_user_id(),resolved_at=now() where id=p_exception_id;
end $function$;

create or replace function public.approve_supplier_invoice_for_payment_v1(p_invoice_id uuid,p_notes text default null)
returns text language plpgsql security definer set search_path to 'public','intelligence','canonical','pg_temp'
as $function$
declare v_org uuid; v_match text; v_basis text; v_open bigint; v_accepted bigint; v_rejected bigint;
begin
  select organization_id into v_org from public.procurement_supplier_invoices where id=p_invoice_id for update;
  if not found then raise exception 'Factura proveedor no encontrada'; end if;
  if v_org not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;
  v_match := public.sync_supplier_invoice_match_exceptions_v1(p_invoice_id);
  select count(*) filter(where status='open'),count(*) filter(where status='accepted'),count(*) filter(where status='rejected') into v_open,v_accepted,v_rejected from public.procurement_match_exceptions where invoice_id=p_invoice_id and organization_id=v_org;
  if v_match='matched' then v_basis := 'matched'; elsif v_open=0 and v_accepted>0 and v_rejected=0 then v_basis := 'accepted_exception'; else raise exception 'Factura no aprobable: match pendiente o excepción sin aprobar'; end if;
  update public.procurement_supplier_invoices set status='approved',approved_for_payment_by=public.current_application_user_id(),approved_for_payment_at=now(),approval_basis=v_basis,approval_notes=nullif(btrim(coalesce(p_notes,'')),''),updated_at=now() where id=p_invoice_id;
  return v_basis;
end $function$;

create or replace view public.procurement_finance_alerts_v1 with (security_invoker=true) as
select i.organization_id,'procurement_invoice_match'::text alert_code,'Facturas con diferencias de OC / recepción'::text title,'warning'::text severity,count(*)::bigint exception_count,'Revisar facturas pendientes de three-way match antes de aprobar pago.'::text description
from public.procurement_match_exceptions e join public.procurement_supplier_invoices i on i.id=e.invoice_id and i.organization_id=e.organization_id
where e.status='open' and i.status not in ('approved','rejected') group by i.organization_id;

create or replace view public.canonical_finance_alerts with (security_invoker=true) as
select organization_id,alert_code,title,severity,exception_count,description from intelligence.canonical_finance_alerts
union all
select organization_id,alert_code,title,severity,exception_count,description from public.procurement_finance_alerts_v1;

revoke all on public.procurement_finance_alerts_v1 from public,anon,authenticated;
revoke all on public.canonical_finance_alerts from public,anon,authenticated;
grant select on public.procurement_finance_alerts_v1 to service_role;
grant select on public.canonical_finance_alerts to service_role;
revoke all on function public.sync_supplier_invoice_match_exceptions_v1(uuid) from public,anon,authenticated;
revoke all on function public.refresh_supplier_invoice_match_v1(uuid) from public,anon,authenticated;
revoke all on function public.resolve_procurement_match_exception_v1(uuid,text,text) from public,anon,authenticated;
revoke all on function public.approve_supplier_invoice_for_payment_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.sync_supplier_invoice_match_exceptions_v1(uuid) to service_role;
grant execute on function public.refresh_supplier_invoice_match_v1(uuid) to service_role;
grant execute on function public.resolve_procurement_match_exception_v1(uuid,text,text) to service_role;
grant execute on function public.approve_supplier_invoice_for_payment_v1(uuid,text) to service_role;