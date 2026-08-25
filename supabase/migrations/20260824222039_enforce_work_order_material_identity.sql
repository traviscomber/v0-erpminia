create or replace function public.enforce_work_order_child_asset_identity()
returns trigger
language plpgsql
security definer
set search_path = public, canonical
as $$
declare
  wo record;
begin
  if new.work_order_id is null then
    return new;
  end if;

  select organization_id, coalesce(canonical_asset_id, asset_id) as canonical_asset_id
    into wo
  from public.maintenance_work_orders
  where id = new.work_order_id;

  if not found then raise exception 'work order % not found', new.work_order_id; end if;
  if wo.organization_id <> new.organization_id then raise exception 'child record organization does not match work order'; end if;
  if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from wo.canonical_asset_id then
    raise exception 'child record asset does not match work order canonical asset';
  end if;

  new.canonical_asset_id := wo.canonical_asset_id;
  return new;
end;
$$;

drop trigger if exists trg_enforce_material_requirement_asset on public.work_order_material_requirements;
create trigger trg_enforce_material_requirement_asset
before insert or update of organization_id, work_order_id, canonical_asset_id
on public.work_order_material_requirements
for each row execute function public.enforce_work_order_child_asset_identity();

drop trigger if exists trg_enforce_work_order_part_asset on public.work_order_parts;
create trigger trg_enforce_work_order_part_asset
before insert or update of organization_id, work_order_id, canonical_asset_id
on public.work_order_parts
for each row execute function public.enforce_work_order_child_asset_identity();

drop trigger if exists trg_enforce_stock_movement_asset on public.stock_movements;
create trigger trg_enforce_stock_movement_asset
before insert or update of organization_id, work_order_id, canonical_asset_id
on public.stock_movements
for each row execute function public.enforce_work_order_child_asset_identity();
