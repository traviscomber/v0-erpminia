-- Harden the non-destructive mine-sector reconciliation layer.
-- Alias data is internal canonicalization metadata and must not be exposed directly.

alter table public.production_mine_sector_aliases enable row level security;

revoke all on table public.production_mine_sector_aliases from anon, authenticated;
grant select, insert, update, delete on table public.production_mine_sector_aliases to service_role;

create or replace view public.production_mine_sector_resolution_v1
with (security_invoker = true) as
select
  s.organization_id,
  s.id as source_sector_id,
  s.mine_source_id,
  s.name as source_sector_name,
  s.normalized_name as source_normalized_name,
  coalesce(a.canonical_sector_id, s.id) as resolved_sector_id,
  coalesce(c.name, s.name) as resolved_sector_name,
  coalesce(c.normalized_name, s.normalized_name) as resolved_normalized_name,
  case when a.id is null then 'canonical' else 'alias' end as resolution_state,
  a.match_rule,
  a.confidence,
  a.evidence
from public.production_mine_sectors s
left join public.production_mine_sector_aliases a
  on a.organization_id = s.organization_id
 and a.alias_sector_id = s.id
 and a.status = 'active'
left join public.production_mine_sectors c
  on c.organization_id = s.organization_id
 and c.id = a.canonical_sector_id;

revoke all on public.production_mine_sector_resolution_v1 from anon, authenticated;
grant select on public.production_mine_sector_resolution_v1 to service_role;
