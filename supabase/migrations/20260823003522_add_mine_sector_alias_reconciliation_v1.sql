create table if not exists public.production_mine_sector_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  mine_source_id uuid not null references public.production_mine_sources(id) on delete cascade,
  sector_id uuid not null references public.production_mine_sectors(id) on delete cascade,
  canonical_sector_id uuid not null references public.production_mine_sectors(id) on delete restrict,
  alias_key text not null,
  match_method text not null,
  confidence numeric(5,4) not null default 1.0,
  status text not null default 'approved',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_mine_sector_aliases_status_check check (status in ('approved','review','rejected')),
  constraint production_mine_sector_aliases_confidence_check check (confidence >= 0 and confidence <= 1),
  unique (organization_id, sector_id)
);

create index if not exists production_mine_sector_aliases_canonical_idx
  on public.production_mine_sector_aliases(organization_id, canonical_sector_id);
create index if not exists production_mine_sector_aliases_key_idx
  on public.production_mine_sector_aliases(organization_id, mine_source_id, alias_key);

with sector_usage as (
  select s.id,
         s.organization_id,
         s.mine_source_id,
         s.name,
         lower(regexp_replace(s.normalized_name,'[^a-zA-Z0-9]+','','g')) as alias_key,
         count(m.id)::bigint as movement_count
  from public.production_mine_sectors s
  left join public.production_material_movements m on m.mine_sector_id=s.id
  group by s.id,s.organization_id,s.mine_source_id,s.name,s.normalized_name
), ranked as (
  select *,
         first_value(id) over (
           partition by organization_id,mine_source_id,alias_key
           order by movement_count desc, length(name), name, id
         ) as canonical_id,
         count(*) over (partition by organization_id,mine_source_id,alias_key) as variants
  from sector_usage
  where alias_key <> ''
)
insert into public.production_mine_sector_aliases(
  organization_id,mine_source_id,sector_id,canonical_sector_id,alias_key,match_method,confidence,status,notes
)
select organization_id,mine_source_id,id,canonical_id,alias_key,
       'normalized_punctuation_spacing_v1',1.0,'approved',
       case when id=canonical_id then 'canonical representative' else 'formatting alias; existing foreign keys preserved' end
from ranked
where variants > 1
on conflict (organization_id,sector_id) do update set
  canonical_sector_id=excluded.canonical_sector_id,
  alias_key=excluded.alias_key,
  match_method=excluded.match_method,
  confidence=excluded.confidence,
  status=excluded.status,
  notes=excluded.notes,
  updated_at=now();

create or replace view public.production_mine_sector_resolution_v1 as
select
  s.organization_id,
  s.mine_source_id,
  s.id as source_sector_id,
  s.name as source_sector_name,
  coalesce(a.canonical_sector_id,s.id) as resolved_sector_id,
  cs.name as resolved_sector_name,
  a.alias_key,
  coalesce(a.match_method,'identity') as resolution_method,
  coalesce(a.confidence,1.0) as confidence,
  coalesce(a.status,'approved') as resolution_status
from public.production_mine_sectors s
left join public.production_mine_sector_aliases a
  on a.organization_id=s.organization_id and a.sector_id=s.id
left join public.production_mine_sectors cs
  on cs.id=coalesce(a.canonical_sector_id,s.id);

comment on table public.production_mine_sector_aliases is 'Non-destructive alias layer for mine-sector spelling/format variants. Existing sector IDs and foreign keys remain untouched.';
comment on view public.production_mine_sector_resolution_v1 is 'Resolved mine-sector identity through approved alias mappings without destructive FK rewrites.';
