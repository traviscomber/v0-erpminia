with legacy as (
  select
    w.id,
    w.organization_id,
    a.asset_code as legacy_code,
    a.asset_name as legacy_name,
    a.manufacturer as legacy_manufacturer,
    a.model as legacy_model
  from public.maintenance_work_orders w
  join public.maintenance_assets a
    on a.id = w.asset_id
   and a.organization_id = w.organization_id
  where w.canonical_asset_id is null
), matches as (
  select
    l.id as work_order_id,
    c.id as canonical_asset_id,
    count(*) over (partition by l.id) as candidate_count
  from legacy l
  join public.maintenance_canonical_assets_v1 c
    on c.organization_id = l.organization_id
   and c.is_active = true
   and nullif(trim(l.legacy_code), '') is not null
   and lower(trim(c.asset_code)) = lower(trim(l.legacy_code))
   and nullif(trim(l.legacy_name), '') is not null
   and lower(trim(c.name)) = lower(trim(l.legacy_name))
   and nullif(trim(l.legacy_manufacturer), '') is not null
   and lower(trim(c.manufacturer)) = lower(trim(l.legacy_manufacturer))
   and nullif(trim(l.legacy_model), '') is not null
   and lower(trim(c.model)) = lower(trim(l.legacy_model))
), unique_matches as (
  select work_order_id, canonical_asset_id
  from matches
  where candidate_count = 1
)
update public.maintenance_work_orders w
set
  canonical_asset_id = u.canonical_asset_id,
  updated_at = now()
from unique_matches u
where w.id = u.work_order_id
  and w.canonical_asset_id is null;
