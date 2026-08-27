create or replace function public.mark_supplier_return_received_v1(p_organization_id uuid,p_return_id uuid,p_reference text default null,p_notes text default null) returns void
language plpgsql security definer set search_path='public','pg_temp' as $$
begin
  update public.procurement_supplier_returns
  set status='received_by_supplier',resolution_reference=coalesce(nullif(btrim(p_reference),''),resolution_reference),notes=coalesce(nullif(btrim(p_notes),''),notes),updated_at=now()
  where id=p_return_id and organization_id=p_organization_id and status='sent';
  if not found then raise exception 'Devolución no encontrada o no está enviada'; end if;
end $$;
revoke all on function public.mark_supplier_return_received_v1(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.mark_supplier_return_received_v1(uuid,uuid,text,text) to service_role;
