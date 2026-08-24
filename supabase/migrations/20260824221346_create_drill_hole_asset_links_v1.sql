create or replace view public.production_drill_hole_asset_links_v1
with (security_invoker=true) as
select r.organization_id,
       r.canonical_drill_hole_id,
       r.canonical_asset_id,
       count(*)::bigint as report_count,
       sum(r.drilled_meters) filter (where r.drilled_meters is not null) as drilled_meters,
       min(r.operation_date) as first_operation_date,
       max(r.operation_date) as last_operation_date
from public.production_drilling_source_reports r
where r.canonical_drill_hole_id is not null
  and r.canonical_asset_id is not null
group by r.organization_id,r.canonical_drill_hole_id,r.canonical_asset_id;

comment on view public.production_drill_hole_asset_links_v1 is 'Derived many-to-many Mining OS relation between canonical drill holes and canonical physical assets, rebuilt from reconciled drilling source reports. Do not collapse multi-rig holes to one asset.';
revoke all on public.production_drill_hole_asset_links_v1 from anon, authenticated;
grant select on public.production_drill_hole_asset_links_v1 to service_role;
