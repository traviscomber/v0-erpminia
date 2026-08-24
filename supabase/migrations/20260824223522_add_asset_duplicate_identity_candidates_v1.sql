create or replace view public.asset_duplicate_identity_candidates_v1 as
with operational as (
  select
    organization_id,
    id as operational_asset_id,
    asset_code as operational_asset_code,
    name as operational_asset_name,
    regexp_replace(lower(coalesce(name,'')), '[^a-z0-9]+', '', 'g') as normalized_name
  from public.canonical_assets_current
  where asset_type = 'drill_rig'
), finance as (
  select
    organization_id,
    id as finance_asset_id,
    asset_code as finance_asset_code,
    name as finance_asset_name,
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(name,'')), '^sonda[[:space:]]+', ''),
        '^atlas[[:space:]]+copco[[:space:],-]*', ''
      ),
      '[^a-z0-9]+', '', 'g'
    ) as normalized_name
  from public.canonical_assets_current
  where category = 'EQUIPOS DE SONDAJE'
)
select
  f.organization_id,
  f.finance_asset_id,
  f.finance_asset_code,
  f.finance_asset_name,
  o.operational_asset_id,
  o.operational_asset_code,
  o.operational_asset_name,
  f.normalized_name as normalized_identity,
  'exact_normalized_equipment_name'::text as evidence_rule
from finance f
join operational o
  on o.organization_id = f.organization_id
 and o.normalized_name = f.normalized_name
where f.normalized_name <> '';
