create or replace function public.sync_supplier_invoice_match_exceptions_v1(p_invoice_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public','intelligence','canonical','pg_temp'
as $function$
declare
  v_org uuid;
  v_match text;
begin
  select organization_id into v_org
  from public.procurement_supplier_invoices
  where id=p_invoice_id;
  if not found then raise exception 'Factura proveedor no encontrada'; end if;
  if v_org not in (select organization_id from public.user_roles where user_id=public.current_application_user_id()) then raise exception 'Sin permisos'; end if;

  select match_status into v_match
  from public.procurement_three_way_match_summary_v1
  where invoice_id=p_invoice_id and organization_id=v_org;
  v_match := coalesce(v_match,'no_lines');

  delete from public.procurement_match_exceptions
  where invoice_id=p_invoice_id and organization_id=v_org and status='open';

  insert into public.procurement_match_exceptions(organization_id,invoice_id,order_line_id,exception_type,expected_value,actual_value,difference,status)
  select l.organization_id,l.invoice_id,l.order_line_id,
         case when l.line_match_status in ('quantity_over_order','quantity_over_receipt') then 'quantity'
              when l.line_match_status='price_mismatch' then 'unit_price'
              when l.line_match_status='pending_receipt' then 'missing_receipt'
              when l.line_match_status='product_mismatch' then 'unknown_product'
              else 'other' end,
         case when l.line_match_status='quantity_over_order' then l.quantity_ordered
              when l.line_match_status in ('quantity_over_receipt','pending_receipt') then l.quantity_accepted
              when l.line_match_status='price_mismatch' then l.ordered_unit_cost else null end,
         case when l.line_match_status in ('quantity_over_order','quantity_over_receipt','pending_receipt') then l.quantity_invoiced
              when l.line_match_status='price_mismatch' then l.invoiced_unit_cost else null end,
         case when l.line_match_status='quantity_over_order' then l.quantity_invoiced-l.quantity_ordered
              when l.line_match_status in ('quantity_over_receipt','pending_receipt') then l.quantity_invoiced-l.quantity_accepted
              when l.line_match_status='price_mismatch' then l.invoiced_unit_cost-l.ordered_unit_cost else null end,
         'open'
  from public.procurement_three_way_match_lines_v1 l
  where l.invoice_id=p_invoice_id and l.organization_id=v_org and l.line_match_status<>'matched'
    and not exists (
      select 1 from public.procurement_match_exceptions e
      where e.invoice_id=l.invoice_id and e.organization_id=l.organization_id and e.order_line_id=l.order_line_id and e.status='accepted'
        and e.exception_type=case when l.line_match_status in ('quantity_over_order','quantity_over_receipt') then 'quantity'
                                  when l.line_match_status='price_mismatch' then 'unit_price'
                                  when l.line_match_status='pending_receipt' then 'missing_receipt'
                                  when l.line_match_status='product_mismatch' then 'unknown_product'
                                  else 'other' end
        and e.expected_value is not distinct from case when l.line_match_status='quantity_over_order' then l.quantity_ordered
                                                       when l.line_match_status in ('quantity_over_receipt','pending_receipt') then l.quantity_accepted
                                                       when l.line_match_status='price_mismatch' then l.ordered_unit_cost else null end
        and e.actual_value is not distinct from case when l.line_match_status in ('quantity_over_order','quantity_over_receipt','pending_receipt') then l.quantity_invoiced
                                                     when l.line_match_status='price_mismatch' then l.invoiced_unit_cost else null end
    );

  if v_match in ('supplier_mismatch','currency_mismatch','no_lines','amount_mismatch') then
    insert into public.procurement_match_exceptions(organization_id,invoice_id,order_line_id,exception_type,expected_value,actual_value,difference,status)
    select s.organization_id,s.invoice_id,null,
           case when s.match_status='amount_mismatch' then 'total' else 'other' end,
           case when s.match_status='amount_mismatch' then s.lines_net_amount else null end,
           case when s.match_status='amount_mismatch' then s.net_amount else null end,
           case when s.match_status='amount_mismatch' then s.net_amount-s.lines_net_amount else null end,
           'open'
    from public.procurement_three_way_match_summary_v1 s
    where s.invoice_id=p_invoice_id and s.organization_id=v_org
      and not exists (
        select 1 from public.procurement_match_exceptions e
        where e.invoice_id=s.invoice_id and e.organization_id=s.organization_id and e.order_line_id is null and e.status='accepted'
          and e.exception_type=case when s.match_status='amount_mismatch' then 'total' else 'other' end
          and e.expected_value is not distinct from case when s.match_status='amount_mismatch' then s.lines_net_amount else null end
          and e.actual_value is not distinct from case when s.match_status='amount_mismatch' then s.net_amount else null end
      );
  end if;

  return v_match;
end
$function$;

revoke all on function public.sync_supplier_invoice_match_exceptions_v1(uuid) from public,anon,authenticated;
grant execute on function public.sync_supplier_invoice_match_exceptions_v1(uuid) to service_role;
