create table if not exists public.operational_maintenance_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  source_domain text not null check (source_domain in ('drilling')),
  source_report_id uuid not null references public.production_drilling_source_reports(id) on delete restrict,
  canonical_asset_id uuid not null references canonical.assets(id) on delete restrict,
  review_reason text not null check (review_reason in ('out_of_service','operational_with_observations','machine_observation')),
  status text not null default 'pending' check (status in ('pending','accepted','dismissed','work_order_created')),
  linked_work_order_id uuid null references public.maintenance_work_orders(id) on delete set null,
  decision_note text null,
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_domain, source_report_id, review_reason)
);

create index if not exists operational_maintenance_reviews_org_status_idx
  on public.operational_maintenance_reviews (organization_id, status, created_at desc);
create index if not exists operational_maintenance_reviews_asset_idx
  on public.operational_maintenance_reviews (organization_id, canonical_asset_id, created_at desc);

revoke all on public.operational_maintenance_reviews from anon, authenticated;
grant select, insert, update on public.operational_maintenance_reviews to service_role;

create or replace view public.drilling_maintenance_review_queue_v1 as
with ranked as (
  select r.*,
    row_number() over (
      partition by r.organization_id, r.canonical_asset_id
      order by r.operation_date desc, r.created_at desc, r.id desc
    ) as rn
  from public.production_drilling_source_reports r
  where r.canonical_asset_id is not null
), latest as (
  select * from ranked where rn = 1
), candidate as (
  select
    l.organization_id,
    l.id as source_report_id,
    l.canonical_asset_id,
    l.operation_date,
    l.source_file,
    l.source_sheet,
    l.source_row,
    l.rig_name_raw,
    l.equipment_status_raw,
    nullif(trim(l.machine_observations), '') as machine_observations,
    case
      when upper(trim(coalesce(l.equipment_status_raw,''))) = 'FUERA DE SERVICIO' then 'out_of_service'
      when upper(trim(coalesce(l.equipment_status_raw,''))) = 'OPERATIVO CON OBSERVACIONES' then 'operational_with_observations'
      when nullif(trim(l.machine_observations), '') is not null then 'machine_observation'
      else null
    end as review_reason
  from latest l
)
select
  c.organization_id,
  c.source_report_id,
  c.canonical_asset_id,
  a.asset_code,
  a.name as asset_name,
  c.operation_date,
  c.review_reason,
  c.equipment_status_raw,
  c.machine_observations,
  c.source_file,
  c.source_sheet,
  c.source_row,
  coalesce(r.status, 'pending') as review_status,
  r.id as review_id,
  r.linked_work_order_id,
  r.decision_note,
  r.reviewed_by,
  r.reviewed_at,
  (r.linked_work_order_id is not null) as has_linked_work_order,
  'human_review_required_no_automatic_work_order'::text as policy
from candidate c
join canonical.assets a on a.id = c.canonical_asset_id and a.organization_id = c.organization_id
left join public.operational_maintenance_reviews r
  on r.organization_id = c.organization_id
 and r.source_domain = 'drilling'
 and r.source_report_id = c.source_report_id
 and r.review_reason = c.review_reason
where c.review_reason is not null;

insert into public.operational_maintenance_reviews (
  organization_id, source_domain, source_report_id, canonical_asset_id, review_reason, status
)
select q.organization_id, 'drilling', q.source_report_id, q.canonical_asset_id, q.review_reason, 'pending'
from public.drilling_maintenance_review_queue_v1 q
where q.review_id is null
on conflict (organization_id, source_domain, source_report_id, review_reason) do nothing;
