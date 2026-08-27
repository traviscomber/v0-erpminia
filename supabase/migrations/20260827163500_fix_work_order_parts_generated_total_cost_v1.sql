do $$
declare
  v_oid oid;
  v_def text;
begin
  select p.oid into v_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'issue_available_materials_to_work_order'
    and pg_get_function_identity_arguments(p.oid) = 'p_work_order_id uuid';
  if v_oid is null then raise exception 'issue_available_materials_to_work_order not found'; end if;
  select pg_get_functiondef(v_oid) into v_def;
  v_def := replace(
    v_def,
    $q$quantity_requested,quantity_issued,unit_cost,total_cost,status,created_by$q$,
    $q$quantity_requested,quantity_issued,unit_cost,status,created_by$q$
  );
  v_def := replace(
    v_def,
    $q$ceil(v_req.quantity_required)::integer,v_qty,v_stock.unit_cost,v_qty*v_stock.unit_cost,'issued',public.current_application_user_id()$q$,
    $q$ceil(v_req.quantity_required)::integer,v_qty,v_stock.unit_cost,'issued',public.current_application_user_id()$q$
  );
  execute v_def;
end $$;
