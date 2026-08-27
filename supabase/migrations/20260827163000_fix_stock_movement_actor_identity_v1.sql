do $$
declare
  v_oid oid;
  v_def text;
begin
  select p.oid into v_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'receive_operational_order'
    and pg_get_function_identity_arguments(p.oid) = 'p_order_id uuid, p_lines jsonb, p_notes text';
  if v_oid is null then raise exception 'receive_operational_order not found'; end if;
  select pg_get_functiondef(v_oid) into v_def;
  v_def := replace(
    v_def,
    $q$public.current_application_user_id(),'Recepción de OC operativa'$q$,
    $q$auth.uid(),'Recepción de OC operativa'$q$
  );
  execute v_def;

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
    $q$public.current_application_user_id(),'Entrega a OT'$q$,
    $q$auth.uid(),'Entrega a OT'$q$
  );
  execute v_def;
end $$;
