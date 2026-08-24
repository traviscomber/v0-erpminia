create or replace function public.create_work_order_from_operational_review(
  p_organization_id uuid,
  p_review_id uuid,
  p_created_by uuid,
  p_title text,
  p_work_type text default null,
  p_priority text default null,
  p_scheduled_date date default null,
  p_description text default null
)
returns table (
  work_order_id uuid,
  work_order_number text,
  canonical_asset_id uuid,
  work_order_status text,
  review_status text,
  source_report_id uuid
)
language plpgsql
security definer
set search_path = public, canonical, pg_temp
as $$
declare
  v_review public.operational_maintenance_reviews%rowtype;
  v_work_order public.maintenance_work_orders%rowtype;
  v_number text;
  v_description text;
begin
  select * into v_review
  from public.operational_maintenance_reviews
  where id = p_review_id and organization_id = p_organization_id
  for update;

  if not found then raise exception 'operational_review_not_found'; end if;

  if v_review.linked_work_order_id is not null then
    select * into v_work_order from public.maintenance_work_orders where id = v_review.linked_work_order_id;
    return query select v_work_order.id, v_work_order.work_order_number, v_work_order.canonical_asset_id, v_work_order.status, v_review.status, v_review.source_report_id;
    return;
  end if;

  if v_review.status <> 'accepted' then raise exception 'operational_review_must_be_accepted'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'work_order_title_required'; end if;

  v_number := 'WO-DRILL-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_review.id::text, '-', ''), 1, 8));
  v_description := concat_ws(E'\n', nullif(trim(p_description), ''), 'Origen: revisión operacional de Sondaje (' || v_review.review_reason || ').', 'Evidencia: production_drilling_source_reports:' || v_review.source_report_id::text || '.');

  insert into public.maintenance_work_orders (
    organization_id, work_order_number, asset_id, canonical_asset_id, title, description,
    work_type, status, priority, scheduled_date, created_by
  ) values (
    p_organization_id, v_number, v_review.canonical_asset_id, v_review.canonical_asset_id,
    left(trim(p_title), 180), v_description, nullif(trim(p_work_type), ''), 'pending',
    nullif(trim(p_priority), ''), p_scheduled_date, p_created_by
  ) returning * into v_work_order;

  update public.operational_maintenance_reviews
  set status = 'work_order_created', linked_work_order_id = v_work_order.id,
      reviewed_by = p_created_by, reviewed_at = now(), updated_at = now()
  where id = v_review.id;

  return query select v_work_order.id, v_work_order.work_order_number, v_work_order.canonical_asset_id, v_work_order.status, 'work_order_created'::text, v_review.source_report_id;
end;
$$;

revoke all on function public.create_work_order_from_operational_review(uuid,uuid,uuid,text,text,text,date,text) from public, anon, authenticated;
grant execute on function public.create_work_order_from_operational_review(uuid,uuid,uuid,text,text,text,date,text) to service_role;
