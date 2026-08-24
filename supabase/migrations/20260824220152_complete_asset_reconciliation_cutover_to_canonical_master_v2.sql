alter table canonical.asset_reconciliation
  drop constraint asset_reconciliation_linked_asset_id_fkey;

update canonical.asset_reconciliation r
set linked_asset_id = c.id
from public.maintenance_assets m
join canonical.assets c
  on c.organization_id=m.organization_id
 and c.asset_code=m.asset_code
where r.linked_asset_id=m.id
  and not exists (select 1 from canonical.assets x where x.id=r.linked_asset_id);

alter table canonical.asset_reconciliation
  add constraint asset_reconciliation_linked_asset_id_fkey
    foreign key (linked_asset_id) references canonical.assets(id) on delete set null;
