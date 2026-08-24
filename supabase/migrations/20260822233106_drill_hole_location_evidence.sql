-- Auditable Pozo -> Mina -> Sector location evidence.
-- A drill hole is never promoted from naming conventions alone. Only verified,
-- internally consistent evidence may make it ready for canonical promotion.

create table if not exists public.production_drill_hole_location_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  drill_hole_id uuid not null references public.production_drill_holes(id) on delete cascade,
  mine_source_id uuid references public.production_mine_sources(id) on delete restrict,
  mine_sector_id uuid references public.production_mine_sectors(id) on delete restrict,
  evidence_type text not null check (evidence_type in ('topography','survey','geology','source_document','import_mapping','manual_review')),
  source_document_id uuid references public.production_source_documents(id) on delete set null,
  source_reference text,
  evidence_date date,
  confidence text not null default 'medium' check (confidence in ('high','medium','low')),
  status text not null default 'candidate' check (status in ('candidate','verified','rejected')),
  evidence_payload jsonb not null default '{}'::jsonb,
  evidence_hash text,
  notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status <> 'verified') or (mine_source_id is not null and mine_sector_id is not null)),
  unique (organization_id, drill_hole_id, evidence_type, evidence_hash)
);

alter table public.production_drill_hole_location_evidence enable row level security;

create index if not exists production_drill_hole_location_evidence_hole_idx
  on public.production_drill_hole_location_evidence (organization_id, drill_hole_id, status);
create index if not exists production_drill_hole_location_evidence_target_idx
  on public.production_drill_hole_location_evidence (organization_id, mine_source_id, mine_sector_id)
  where status = 'verified';
create index if not exists production_drill_hole_location_evidence_document_idx
  on public.production_drill_hole_location_evidence (source_document_id)
  where source_document_id is not null;

create or replace function public.validate_production_drill_hole_location_evidence()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  hole_org uuid;
  mine_org uuid;
  sector_org uuid;
  sector_mine uuid;
begin
  select organization_id into hole_org
  from public.production_drill_holes
  where id = new.drill_hole_id;

  if hole_org is null or hole_org <> new.organization_id then
    raise exception 'drill_hole_id does not belong to organization_id';
  end if;

  if new.mine_source_id is not null then
    select organization_id into mine_org
    from public.production_mine_sources
    where id = new.mine_source_id;

    if mine_org is null or mine_org <> new.organization_id then
      raise exception 'mine_source_id does not belong to organization_id';
    end if;
  end if;

  if new.mine_sector_id is not null then
    select organization_id, mine_source_id into sector_org, sector_mine
    from public.production_mine_sectors
    where id = new.mine_sector_id;

    if sector_org is null or sector_org <> new.organization_id then
      raise exception 'mine_sector_id does not belong to organization_id';
    end if;

    if new.mine_source_id is null or sector_mine <> new.mine_source_id then
      raise exception 'mine_sector_id does not belong to mine_source_id';
    end if;
  end if;

  if new.status = 'verified' and new.reviewed_at is null then
    new.reviewed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.validate_production_drill_hole_location_evidence() from public, anon, authenticated;

drop trigger if exists trg_validate_production_drill_hole_location_evidence
  on public.production_drill_hole_location_evidence;
create trigger trg_validate_production_drill_hole_location_evidence
before insert or update on public.production_drill_hole_location_evidence
for each row execute function public.validate_production_drill_hole_location_evidence();

create or replace view public.production_drill_hole_location_resolution_v1
with (security_invoker = true) as
with evidence as (
  select
    h.organization_id,
    h.id as drill_hole_id,
    h.hole_code,
    h.mine_source_id as current_mine_source_id,
    h.mine_sector_id as current_mine_sector_id,
    count(e.id) as evidence_count,
    count(e.id) filter (where e.status = 'verified') as verified_evidence_count,
    count(distinct (e.mine_source_id, e.mine_sector_id)) filter (where e.status = 'verified') as verified_target_count,
    (min(e.mine_source_id::text) filter (where e.status = 'verified'))::uuid as proposed_mine_source_id,
    (min(e.mine_sector_id::text) filter (where e.status = 'verified'))::uuid as proposed_mine_sector_id,
    max(e.reviewed_at) filter (where e.status = 'verified') as last_verified_at
  from public.production_drill_holes h
  left join public.production_drill_hole_location_evidence e
    on e.organization_id = h.organization_id
   and e.drill_hole_id = h.id
  group by
    h.organization_id,
    h.id,
    h.hole_code,
    h.mine_source_id,
    h.mine_sector_id
)
select
  e.*,
  m.name as proposed_mine_name,
  s.name as proposed_sector_name,
  case
    when e.current_mine_source_id is not null and e.current_mine_sector_id is not null then 'canonical'
    when e.verified_evidence_count = 0 then 'needs_evidence'
    when e.verified_target_count > 1 then 'evidence_conflict'
    when e.verified_target_count = 1 then 'ready_to_promote'
    else 'needs_review'
  end as resolution_state
from evidence e
left join public.production_mine_sources m
  on m.id = e.proposed_mine_source_id
 and m.organization_id = e.organization_id
left join public.production_mine_sectors s
  on s.id = e.proposed_mine_sector_id
 and s.organization_id = e.organization_id;

revoke all on public.production_drill_hole_location_resolution_v1 from anon, authenticated;
grant select on public.production_drill_hole_location_resolution_v1 to service_role;

create or replace view public.production_drill_hole_location_review_queue_v1
with (security_invoker = true) as
select *
from public.production_drill_hole_location_resolution_v1
where resolution_state <> 'canonical';

revoke all on public.production_drill_hole_location_review_queue_v1 from anon, authenticated;
grant select on public.production_drill_hole_location_review_queue_v1 to service_role;
