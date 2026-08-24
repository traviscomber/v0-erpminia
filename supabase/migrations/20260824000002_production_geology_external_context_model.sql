create table if not exists production_geology_external_context (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null,
 source_provider text not null, source_dataset text not null, source_record_key text not null,
 record_type text not null, mine_source_id uuid null, mine_sector_id uuid null,
 title text null, status text null, valid_from date null, valid_to date null,
 geometry_geojson jsonb null, properties jsonb not null default '{}'::jsonb,
 source_url text null, retrieved_at timestamptz null,
 validation_status text not null default 'staged', validation_notes text null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,source_provider,source_dataset,source_record_key)
);
create index if not exists production_geology_external_context_org_sector_idx on production_geology_external_context(organization_id,mine_sector_id);
create index if not exists production_geology_external_context_org_mine_idx on production_geology_external_context(organization_id,mine_source_id);
create or replace view production_geology_context_quality_v1 as
select o.id organization_id, count(g.id)::int external_records,
 count(g.id) filter(where g.source_provider='SERNAGEOMIN')::int sernageomin_records,
 count(g.id) filter(where g.mine_source_id is not null)::int mine_linked_records,
 count(g.id) filter(where g.mine_sector_id is not null)::int sector_linked_records,
 count(g.id) filter(where g.geometry_geojson is not null)::int georeferenced_records,
 count(g.id) filter(where g.validation_status='valid')::int valid_records,
 count(g.id) filter(where g.validation_status='review')::int review_records
from organizations o left join production_geology_external_context g on g.organization_id=o.id group by o.id;
