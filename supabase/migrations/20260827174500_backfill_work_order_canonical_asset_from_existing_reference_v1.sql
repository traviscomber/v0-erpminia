with eligible as (
  select wo.id, wo.asset_id
  from public.maintenance_work_orders wo
  join public.maintenance_canonical_assets_v1 a
    on a.id = wo.asset_id
   and a.organization_id = wo.organization_id
  where wo.canonical_asset_id is null
    and wo.asset_id is not null
)
update public.maintenance_work_orders wo
set canonical_asset_id = e.asset_id,
    updated_at = now()
from eligible e
where wo.id = e.id;
