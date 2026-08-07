alter table public.sensors add column if not exists organization_id uuid;
alter table public.sensors add column if not exists canonical_asset_id uuid;
alter table public.sensor_readings add column if not exists organization_id uuid;
alter table public.sensor_readings add column if not exists canonical_asset_id uuid;

create index if not exists idx_sensors_org_asset on public.sensors (organization_id, canonical_asset_id);
create index if not exists idx_sensor_readings_org_asset_time on public.sensor_readings (organization_id, canonical_asset_id, timestamp desc);

create table if not exists public.telemetry_asset_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  legacy_equipment_id uuid not null,
  canonical_asset_id uuid not null references canonical.assets(id),
  match_method text not null default 'manual' check (match_method in ('manual','exact_code')),
  verified_by uuid,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, legacy_equipment_id)
);

create table if not exists public.telemetry_condition_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  sensor_id uuid not null references public.sensors(id),
  reading_id uuid not null references public.sensor_readings(id),
  legacy_equipment_id uuid,
  canonical_asset_id uuid not null references canonical.assets(id),
  condition_type text not null check (condition_type in ('below_min','above_max','alarm_threshold','critical_threshold')),
  severity text not null check (severity in ('warning','critical')),
  observed_value numeric not null,
  threshold_value numeric not null,
  unit text,
  event_at timestamptz not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  preventive_schedule_id uuid,
  work_order_id uuid,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reading_id)
);

create index if not exists idx_telemetry_links_org_asset on public.telemetry_asset_links (organization_id, canonical_asset_id);
create index if not exists idx_telemetry_events_org_status_time on public.telemetry_condition_events (organization_id, status, event_at desc);
create index if not exists idx_telemetry_events_asset_time on public.telemetry_condition_events (organization_id, canonical_asset_id, event_at desc);
create index if not exists idx_telemetry_events_sensor_time on public.telemetry_condition_events (organization_id, sensor_id, event_at desc);

alter table public.telemetry_asset_links enable row level security;
alter table public.telemetry_condition_events enable row level security;
revoke all on table public.telemetry_asset_links from anon, authenticated;
revoke all on table public.telemetry_condition_events from anon, authenticated;
grant select, insert, update, delete on table public.telemetry_asset_links to service_role;
grant select, insert, update, delete on table public.telemetry_condition_events to service_role;
