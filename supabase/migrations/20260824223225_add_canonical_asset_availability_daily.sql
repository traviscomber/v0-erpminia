create table if not exists canonical.asset_availability_daily (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
  operating_date date not null,
  scheduled_minutes integer not null,
  planned_downtime_minutes integer not null default 0,
  unplanned_downtime_minutes integer not null default 0,
  source_type text not null,
  evidence_reference text,
  source_record_id text,
  validation_status text not null default 'valid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_availability_scheduled_minutes_check check (scheduled_minutes > 0 and scheduled_minutes <= 1440),
  constraint asset_availability_planned_downtime_check check (planned_downtime_minutes >= 0),
  constraint asset_availability_unplanned_downtime_check check (unplanned_downtime_minutes >= 0),
  constraint asset_availability_total_downtime_check check (planned_downtime_minutes + unplanned_downtime_minutes <= scheduled_minutes),
  constraint asset_availability_validation_status_check check (validation_status in ('valid','review','rejected')),
  constraint asset_availability_daily_unique unique (organization_id, canonical_asset_id, operating_date)
);

create or replace function canonical.enforce_asset_availability_identity()
returns trigger
language plpgsql
security definer
set search_path = canonical, public
as $$
begin
  if not exists (
    select 1 from canonical.assets a
    where a.id = new.canonical_asset_id
      and a.organization_id = new.organization_id
  ) then
    raise exception 'canonical_asset_id does not belong to organization_id';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_asset_availability_identity on canonical.asset_availability_daily;
create trigger trg_enforce_asset_availability_identity
before insert or update on canonical.asset_availability_daily
for each row execute function canonical.enforce_asset_availability_identity();

create index if not exists idx_asset_availability_daily_org_date
  on canonical.asset_availability_daily (organization_id, operating_date desc);
create index if not exists idx_asset_availability_daily_asset_date
  on canonical.asset_availability_daily (canonical_asset_id, operating_date desc);

create or replace view public.asset_availability_daily_v1 as
select
  d.organization_id,
  d.canonical_asset_id,
  a.asset_code,
  a.name as asset_name,
  d.operating_date,
  d.scheduled_minutes,
  d.planned_downtime_minutes,
  d.unplanned_downtime_minutes,
  d.scheduled_minutes - d.planned_downtime_minutes - d.unplanned_downtime_minutes as available_minutes,
  round(
    100.0 * (d.scheduled_minutes - d.planned_downtime_minutes - d.unplanned_downtime_minutes)::numeric
      / nullif(d.scheduled_minutes, 0),
    2
  ) as availability_pct,
  d.source_type,
  d.evidence_reference,
  d.source_record_id,
  d.validation_status,
  d.created_at,
  d.updated_at
from canonical.asset_availability_daily d
join canonical.assets a
  on a.id = d.canonical_asset_id
 and a.organization_id = d.organization_id
where d.validation_status = 'valid';
