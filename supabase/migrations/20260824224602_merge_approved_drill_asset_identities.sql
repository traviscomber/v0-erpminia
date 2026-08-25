create table if not exists canonical.asset_identity_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  source_asset_id uuid not null references canonical.assets(id) on delete restrict,
  target_asset_id uuid not null references canonical.assets(id) on delete restrict,
  evidence_rule text not null,
  approval_basis text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, source_asset_id),
  check (source_asset_id <> target_asset_id)
);

create index if not exists asset_identity_aliases_target_idx
  on canonical.asset_identity_aliases (organization_id, target_asset_id)
  where is_active;

create table if not exists canonical.asset_identity_merge_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  source_asset_id uuid not null,
  target_asset_id uuid not null,
  source_snapshot jsonb not null,
  target_snapshot jsonb not null,
  evidence_rule text not null,
  approval_basis text not null,
  merged_at timestamptz not null default now()
);

DO $$
DECLARE candidate_count integer;
BEGIN
  select count(*) into candidate_count
  from public.asset_duplicate_identity_candidates_v1
  where organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid;

  if candidate_count <> 5 then
    raise exception 'Expected exactly 5 approved asset identity candidates, found %', candidate_count;
  end if;
END $$;

insert into canonical.asset_identity_merge_audit (
  organization_id, source_asset_id, target_asset_id, source_snapshot, target_snapshot, evidence_rule, approval_basis
)
select c.organization_id,
       c.finance_asset_id,
       c.operational_asset_id,
       to_jsonb(src),
       to_jsonb(tgt),
       c.evidence_rule,
       'explicit_user_authorization_2026-08-24'
from public.asset_duplicate_identity_candidates_v1 c
join canonical.assets src on src.id = c.finance_asset_id and src.organization_id = c.organization_id
join canonical.assets tgt on tgt.id = c.operational_asset_id and tgt.organization_id = c.organization_id
where c.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
  and not exists (
    select 1 from canonical.asset_identity_merge_audit a
    where a.organization_id=c.organization_id and a.source_asset_id=c.finance_asset_id and a.target_asset_id=c.operational_asset_id
  );

insert into canonical.asset_identity_aliases (
  organization_id, source_asset_id, target_asset_id, evidence_rule, approval_basis
)
select organization_id,
       finance_asset_id,
       operational_asset_id,
       evidence_rule,
       'explicit_user_authorization_2026-08-24'
from public.asset_duplicate_identity_candidates_v1
where organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
on conflict (organization_id, source_asset_id) do update
set target_asset_id=excluded.target_asset_id,
    evidence_rule=excluded.evidence_rule,
    approval_basis=excluded.approval_basis,
    is_active=true;

update canonical.assets src
set is_active=false,
    validation_status='warning',
    validation_notes=array_append(coalesce(src.validation_notes, array[]::text[]), 'superseded_by_canonical_asset:' || a.target_asset_id::text),
    source_payload=coalesce(src.source_payload,'{}'::jsonb) || jsonb_build_object(
      'identity_merge', jsonb_build_object(
        'status','superseded',
        'target_asset_id',a.target_asset_id,
        'evidence_rule',a.evidence_rule,
        'approved','explicit_user_authorization_2026-08-24'
      )
    ),
    updated_at=now()
from canonical.asset_identity_aliases a
where a.organization_id=src.organization_id
  and a.source_asset_id=src.id
  and a.is_active
  and src.organization_id='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid;

create or replace view public.finance_maintenance_asset_reconciliation_v1 as
with finance as (
  select organization_id,
         asset_id as finance_asset_id,
         asset_code as finance_asset_code,
         asset_name as finance_asset_name,
         regexp_replace(lower(coalesce(asset_code,'')), '[^a-z0-9]+', '', 'g') as code_key,
         regexp_replace(lower(coalesce(asset_name,'')), '[^a-z0-9]+', '', 'g') as name_key
  from public.canonical_finance_assets
),
alias_match as (
  select f.organization_id,
         f.finance_asset_id,
         f.finance_asset_code,
         f.finance_asset_name,
         a.target_asset_id as canonical_asset_id,
         c.asset_code as canonical_asset_code,
         c.name as canonical_asset_name,
         1::bigint as candidate_count,
         'resolved_exact'::text as reconciliation_status,
         'approved_identity_alias'::text as match_method
  from finance f
  join canonical.asset_identity_aliases a
    on a.organization_id=f.organization_id
   and a.source_asset_id=f.finance_asset_id
   and a.is_active
  join canonical.assets c
    on c.id=a.target_asset_id
   and c.organization_id=f.organization_id
),
canonical_asset as (
  select organization_id,
         id as canonical_asset_id,
         asset_code as canonical_asset_code,
         name as canonical_asset_name,
         regexp_replace(lower(coalesce(asset_code,'')), '[^a-z0-9]+', '', 'g') as code_key,
         regexp_replace(lower(coalesce(name,'')), '[^a-z0-9]+', '', 'g') as name_key
  from public.canonical_assets_current
  where is_active=true
),
candidates as (
  select f.organization_id,
         f.finance_asset_id,
         f.finance_asset_code,
         f.finance_asset_name,
         c.canonical_asset_id,
         c.canonical_asset_code,
         c.canonical_asset_name,
         case
           when f.code_key<>'' and f.code_key=c.code_key then 'exact_code'
           when f.name_key<>'' and f.name_key=c.name_key then 'exact_name'
           else null
         end as match_method
  from finance f
  left join canonical_asset c
    on c.organization_id=f.organization_id
   and ((f.code_key<>'' and f.code_key=c.code_key) or (f.name_key<>'' and f.name_key=c.name_key))
  where not exists (
    select 1 from alias_match am
    where am.organization_id=f.organization_id and am.finance_asset_id=f.finance_asset_id
  )
),
aggregated as (
  select organization_id,
         finance_asset_id,
         finance_asset_code,
         finance_asset_name,
         count(canonical_asset_id) as candidate_count,
         min(canonical_asset_id::text)::uuid as single_candidate_id,
         min(canonical_asset_code) as single_candidate_code,
         min(canonical_asset_name) as single_candidate_name,
         min(match_method) as match_method
  from candidates
  group by organization_id,finance_asset_id,finance_asset_code,finance_asset_name
),
normal_match as (
  select organization_id,
         finance_asset_id,
         finance_asset_code,
         finance_asset_name,
         case when candidate_count=1 then single_candidate_id else null::uuid end as canonical_asset_id,
         case when candidate_count=1 then single_candidate_code else null::text end as canonical_asset_code,
         case when candidate_count=1 then single_candidate_name else null::text end as canonical_asset_name,
         candidate_count,
         case when candidate_count=0 then 'unresolved' when candidate_count=1 then 'resolved_exact' else 'ambiguous' end::text as reconciliation_status,
         case when candidate_count=1 then match_method else null::text end as match_method
  from aggregated
)
select organization_id,
       finance_asset_id,
       finance_asset_code,
       finance_asset_name,
       canonical_asset_id as maintenance_asset_id,
       canonical_asset_code as maintenance_asset_code,
       canonical_asset_name as maintenance_asset_name,
       candidate_count,
       reconciliation_status,
       match_method
from alias_match
union all
select organization_id,
       finance_asset_id,
       finance_asset_code,
       finance_asset_name,
       canonical_asset_id as maintenance_asset_id,
       canonical_asset_code as maintenance_asset_code,
       canonical_asset_name as maintenance_asset_name,
       candidate_count,
       reconciliation_status,
       match_method
from normal_match;

create or replace view public.finance_asset_reconciliation_v1 as
select organization_id,
       finance_asset_id,
       finance_asset_code,
       finance_asset_name,
       maintenance_asset_id as canonical_asset_id,
       maintenance_asset_code as canonical_asset_code,
       maintenance_asset_name as canonical_asset_name,
       candidate_count,
       reconciliation_status,
       match_method
from public.finance_maintenance_asset_reconciliation_v1;

update public.data_reconciliation_reviews r
set status='resolved',
    resolution_note='Identidad consolidada mediante alias canónico aprobado; la identidad financiera queda retirada y los costos conservan lineage original.',
    reviewed_at=now(),
    updated_at=now()
from canonical.asset_identity_aliases a
where r.organization_id=a.organization_id
  and r.entity_type='asset'
  and r.issue_key like ('asset_duplicate_candidate:' || a.source_asset_id::text || ':' || a.target_asset_id::text)
  and a.is_active;
