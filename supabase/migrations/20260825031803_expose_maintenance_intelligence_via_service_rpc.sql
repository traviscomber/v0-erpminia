create or replace function public.get_work_order_supply_status_v1(
  p_organization_id uuid,
  p_work_order_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, intelligence, pg_temp
as $$
  select to_jsonb(s)
  from intelligence.work_order_supply_status s
  where s.organization_id = p_organization_id
    and s.work_order_id = p_work_order_id
  limit 1;
$$;

revoke all on function public.get_work_order_supply_status_v1(uuid, uuid) from public;
revoke all on function public.get_work_order_supply_status_v1(uuid, uuid) from anon;
revoke all on function public.get_work_order_supply_status_v1(uuid, uuid) from authenticated;
grant execute on function public.get_work_order_supply_status_v1(uuid, uuid) to service_role;

create or replace function public.get_entity_timeline_v1(
  p_organization_id uuid,
  p_entity_type text,
  p_entity_id text,
  p_limit integer default 30
)
returns jsonb
language sql
stable
security definer
set search_path = public, intelligence, pg_temp
as $$
  select coalesce(
    jsonb_agg(to_jsonb(t) order by t.event_at desc),
    '[]'::jsonb
  )
  from (
    select
      event_id,
      event_at,
      origin,
      event_type,
      source_table,
      source_record_id,
      work_order_id,
      canonical_asset_id,
      canonical_product_id,
      supplier_id,
      amount,
      currency,
      description,
      metadata
    from intelligence.universal_entity_timeline
    where organization_id = p_organization_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
    order by event_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) t;
$$;

revoke all on function public.get_entity_timeline_v1(uuid, text, text, integer) from public;
revoke all on function public.get_entity_timeline_v1(uuid, text, text, integer) from anon;
revoke all on function public.get_entity_timeline_v1(uuid, text, text, integer) from authenticated;
grant execute on function public.get_entity_timeline_v1(uuid, text, text, integer) to service_role;
