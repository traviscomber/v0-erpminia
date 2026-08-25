create or replace function public.enforce_supply_need_identity()
returns trigger
language plpgsql
security definer
set search_path = public, canonical
as $$
declare
  wo record;
begin
  if new.work_order_id is null then
    raise exception 'work_order_id is required for supply need';
  end if;

  select organization_id, coalesce(canonical_asset_id, asset_id) as canonical_asset_id
    into wo
  from public.maintenance_work_orders
  where id = new.work_order_id;

  if not found then
    raise exception 'work order % not found', new.work_order_id;
  end if;
  if wo.organization_id <> new.organization_id then
    raise exception 'supply need organization does not match work order';
  end if;
  if new.canonical_asset_id is not null and wo.canonical_asset_id is distinct from new.canonical_asset_id then
    raise exception 'supply need asset does not match work order canonical asset';
  end if;

  new.canonical_asset_id := wo.canonical_asset_id;
  return new;
end;
$$;

drop trigger if exists trg_enforce_supply_need_identity on public.work_order_supply_needs;
create trigger trg_enforce_supply_need_identity
before insert or update of organization_id, work_order_id, canonical_asset_id
on public.work_order_supply_needs
for each row execute function public.enforce_supply_need_identity();

create or replace function public.enforce_procurement_intake_identity()
returns trigger
language plpgsql
security definer
set search_path = public, canonical
as $$
declare
  need record;
  wo record;
begin
  if new.source_supply_need_id is not null then
    select organization_id, work_order_id, canonical_asset_id
      into need
    from public.work_order_supply_needs
    where id = new.source_supply_need_id;
    if not found then raise exception 'source supply need % not found', new.source_supply_need_id; end if;
    if need.organization_id <> new.organization_id then raise exception 'intake organization does not match supply need'; end if;
    if new.work_order_id is not null and new.work_order_id is distinct from need.work_order_id then raise exception 'intake work order does not match supply need'; end if;
    if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from need.canonical_asset_id then raise exception 'intake asset does not match supply need'; end if;
    new.work_order_id := need.work_order_id;
    new.canonical_asset_id := need.canonical_asset_id;
  elsif new.work_order_id is not null then
    select organization_id, coalesce(canonical_asset_id, asset_id) as canonical_asset_id into wo
    from public.maintenance_work_orders where id = new.work_order_id;
    if not found then raise exception 'work order % not found', new.work_order_id; end if;
    if wo.organization_id <> new.organization_id then raise exception 'intake organization does not match work order'; end if;
    if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from wo.canonical_asset_id then raise exception 'intake asset does not match work order'; end if;
    new.canonical_asset_id := wo.canonical_asset_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_procurement_intake_identity on public.procurement_intake_requests;
create trigger trg_enforce_procurement_intake_identity
before insert or update of organization_id, source_supply_need_id, work_order_id, canonical_asset_id
on public.procurement_intake_requests
for each row execute function public.enforce_procurement_intake_identity();

create or replace function public.enforce_procurement_order_identity()
returns trigger
language plpgsql
security definer
set search_path = public, canonical
as $$
declare
  req record;
  wo record;
begin
  if new.intake_request_id is not null then
    select organization_id, work_order_id, canonical_asset_id into req
    from public.procurement_intake_requests where id = new.intake_request_id;
    if not found then raise exception 'intake request % not found', new.intake_request_id; end if;
    if req.organization_id <> new.organization_id then raise exception 'order organization does not match intake request'; end if;
    if new.work_order_id is not null and new.work_order_id is distinct from req.work_order_id then raise exception 'order work order does not match intake request'; end if;
    if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from req.canonical_asset_id then raise exception 'order asset does not match intake request'; end if;
    new.work_order_id := req.work_order_id;
    new.canonical_asset_id := req.canonical_asset_id;
  elsif new.work_order_id is not null then
    select organization_id, coalesce(canonical_asset_id, asset_id) as canonical_asset_id into wo
    from public.maintenance_work_orders where id = new.work_order_id;
    if not found then raise exception 'work order % not found', new.work_order_id; end if;
    if wo.organization_id <> new.organization_id then raise exception 'order organization does not match work order'; end if;
    if new.canonical_asset_id is not null and new.canonical_asset_id is distinct from wo.canonical_asset_id then raise exception 'order asset does not match work order'; end if;
    new.canonical_asset_id := wo.canonical_asset_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_procurement_order_identity on public.procurement_operational_orders;
create trigger trg_enforce_procurement_order_identity
before insert or update of organization_id, intake_request_id, work_order_id, canonical_asset_id
on public.procurement_operational_orders
for each row execute function public.enforce_procurement_order_identity();
