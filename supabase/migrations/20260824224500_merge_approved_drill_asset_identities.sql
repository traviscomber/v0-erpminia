-- Approved production consolidation of five deterministic drill-rig identities.
-- Canonical physical asset stays on the operational UUID; finance identity is retained as an alias.

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
select c.organization_id, c.finance_asset_id, c.operational_asset_id,
       to_jsonb(src), to_jsonb(tgt), c.evidence_rule,
       'explicit_user_authorization_2026-08-24'
from public.asset_duplicate_identity_candidates_v1 c
join canonical.assets src on src.id=c.finance_asset_id and src.organization_id=c.organization_id
join canonical.assets tgt on tgt.id=c.operational_asset_id and tgt.organization_id=c.organization_id
where c.organization_id='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
  and not exists (
    select 1 from canonical.asset_identity_merge_audit a
    where a.organization_id=c.organization_id
      and a.source_asset_id=c.finance_asset_id
      and a.target_asset_id=c.operational_asset_id
  );

insert into canonical.asset_identity_aliases (
  organization_id, source_asset_id, target_asset_id, evidence_rule, approval_basis
)
select organization_id, finance_asset_id, operational_asset_id, evidence_rule,
       'explicit_user_authorization_2026-08-24'
from public.asset_duplicate_identity_candidates_v1
where organization_id='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
on conflict (organization_id, source_asset_id) do update
set target_asset_id=excluded.target_asset_id,
    evidence_rule=excluded.evidence_rule,
    approval_basis=excluded.approval_basis,
    is_active=true;

update canonical.assets src
set is_active=false,
    validation_status='warning',
    validation_notes=array_append(coalesce(src.validation_notes,array[]::text[]), 'superseded_by_canonical_asset:' || a.target_asset_id::text),
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
  select organization_id, asset_id as finance_asset_id, asset_code as finance_asset_code, asset_name as finance_asset_name,
         regexp_replace(lower(coalesce(asset_code,'')), '[^a-z0-9]+', '', 'g') as code_key,
         regexp_replace(lower(coalesce(asset_name,'')), '[^a-z0-9]+', '', 'g') as name_key
  from public.canonical_finance_assets
),
alias_match as (
  select f.organization_id, f.finance_asset_id, f.finance_asset_code, f.finance_asset_name,
         a.target_asset_id as canonical_asset_id, c.asset_code as canonical_asset_code, c.name as canonical_asset_name,
         1::bigint as candidate_count, 'resolved_exact'::text as reconciliation_status, 'approved_identity_alias'::text as match_method
  from finance f
  join canonical.asset_identity_aliases a on a.organization_id=f.organization_id and a.source_asset_id=f.finance_asset_id and a.is_active
  join canonical.assets c on c.id=a.target_asset_id and c.organization_id=f.organization_id
),
canonical_asset as (
  select organization_id, id as canonical_asset_id, asset_code as canonical_asset_code, name as canonical_asset_name,
         regexp_replace(lower(coalesce(asset_code,'')), '[^a-z0-9]+', '', 'g') as code_key,
         regexp_replace(lower(coalesce(name,'')), '[^a-z0-9]+', '', 'g') as name_key
  from public.canonical_assets_current where is_active=true
),
candidates as (
  select f.organization_id, f.finance_asset_id, f.finance_asset_code, f.finance_asset_name,
         c.canonical_asset_id, c.canonical_asset_code, c.canonical_asset_name,
         case when f.code_key<>'' and f.code_key=c.code_key then 'exact_code'
              when f.name_key<>'' and f.name_key=c.name_key then 'exact_name' end as match_method
  from finance f
  left join canonical_asset c on c.organization_id=f.organization_id
    and ((f.code_key<>'' and f.code_key=c.code_key) or (f.name_key<>'' and f.name_key=c.name_key))
  where not exists (select 1 from alias_match am where am.organization_id=f.organization_id and am.finance_asset_id=f.finance_asset_id)
),
aggregated as (
  select organization_id, finance_asset_id, finance_asset_code, finance_asset_name,
         count(canonical_asset_id) as candidate_count,
         min(canonical_asset_id::text)::uuid as single_candidate_id,
         min(canonical_asset_code) as single_candidate_code,
         min(canonical_asset_name) as single_candidate_name,
         min(match_method) as match_method
  from candidates group by organization_id,finance_asset_id,finance_asset_code,finance_asset_name
),
normal_match as (
  select organization_id, finance_asset_id, finance_asset_code, finance_asset_name,
         case when candidate_count=1 then single_candidate_id end as canonical_asset_id,
         case when candidate_count=1 then single_candidate_code end as canonical_asset_code,
         case when candidate_count=1 then single_candidate_name end as canonical_asset_name,
         candidate_count,
         case when candidate_count=0 then 'unresolved' when candidate_count=1 then 'resolved_exact' else 'ambiguous' end::text as reconciliation_status,
         case when candidate_count=1 then match_method end as match_method
  from aggregated
)
select organization_id, finance_asset_id, finance_asset_code, finance_asset_name,
       canonical_asset_id as maintenance_asset_id, canonical_asset_code as maintenance_asset_code,
       canonical_asset_name as maintenance_asset_name, candidate_count, reconciliation_status, match_method
from alias_match
union all
select organization_id, finance_asset_id, finance_asset_code, finance_asset_name,
       canonical_asset_id, canonical_asset_code, canonical_asset_name, candidate_count, reconciliation_status, match_method
from normal_match;

create or replace view public.finance_asset_reconciliation_v1 as
select organization_id, finance_asset_id, finance_asset_code, finance_asset_name,
       maintenance_asset_id as canonical_asset_id, maintenance_asset_code as canonical_asset_code,
       maintenance_asset_name as canonical_asset_name, candidate_count, reconciliation_status, match_method
from public.finance_maintenance_asset_reconciliation_v1;

update public.data_reconciliation_reviews r
set status='resolved',
    resolution_note='Identidad consolidada mediante alias canónico aprobado; la identidad financiera queda retirada y los costos conservan lineage original.',
    reviewed_at=now(), updated_at=now()
from canonical.asset_identity_aliases a
where r.organization_id=a.organization_id
  and r.entity_type='asset'
  and r.issue_key like ('asset_duplicate_candidate:' || a.source_asset_id::text || ':' || a.target_asset_id::text)
  and a.is_active;

-- Cost ledger resolves legacy/finance asset references through the approved alias before exposing canonical_asset_id.
create or replace view intelligence.cost_event_ledger as
select ac.organization_id,
    'canonical_asset_cost:'::text || ac.id as event_id,
    ac.transaction_date::timestamptz as event_at,
    'CANONICAL'::text as origin,
    'actual_cost'::text as event_type,
    'recognized'::text as recognition_status,
    'canonical.asset_costs'::text as source_table,
    ac.id::text as source_record_id,
    coalesce(alias_cost.target_asset_id,a_cost.id) as canonical_asset_id,
    null::uuid as canonical_product_id,
    null::uuid as supplier_id,
    null::uuid as work_order_id,
    ac.cost_center_code, ac.quantity, ac.unit_cost, ac.total_cost as amount,
    coalesce(ac.currency,'CLP') as currency, ac.description,
    jsonb_build_object('document_number',ac.document_number,'category',ac.category,'asset_code',ac.asset_code,'validation_status',ac.validation_status,
      'asset_identity_resolution',case when alias_cost.target_asset_id is not null then 'approved_alias' else 'direct' end) as metadata
from canonical.asset_costs ac
left join canonical.assets a_cost on a_cost.organization_id=ac.organization_id and a_cost.asset_code=ac.asset_code
left join canonical.asset_identity_aliases alias_cost on alias_cost.organization_id=ac.organization_id and alias_cost.source_asset_id=a_cost.id and alias_cost.is_active
union all
select po.organization_id,
    'canonical_po_line:'::text || pol.id, po.order_date::timestamptz, 'CANONICAL','purchase_commitment','committed',
    'canonical.purchase_order_lines', pol.id::text,
    coalesce(alias_po.target_asset_id,a_po.id), pol.canonical_product_id, po.canonical_supplier_id, null::uuid,
    nullif(regexp_replace(coalesce(pol.cost_center_code,po.cost_center_code,''),'\s+.*$',''),'') as cost_center_code,
    pol.quantity, pol.unit_cost, pol.net_amount, coalesce(po.currency,'CLP'), pol.description,
    jsonb_build_object('order_number',po.order_number,'order_status',po.status,'validation_status',pol.validation_status,'asset_reference',pol.asset_reference,
      'asset_identity_resolution',case when alias_po.target_asset_id is not null then 'approved_alias' else 'direct' end)
from canonical.purchase_order_lines pol
join canonical.purchase_orders po on po.id=pol.purchase_order_id
left join canonical.assets a_po on a_po.organization_id=po.organization_id and (a_po.asset_code=pol.asset_reference or a_po.name=pol.asset_reference)
left join canonical.asset_identity_aliases alias_po on alias_po.organization_id=po.organization_id and alias_po.source_asset_id=a_po.id and alias_po.is_active
union all
select wop.organization_id,'erp_part:'||wop.id,coalesce(wop.installed_at,wop.created_at),'ERP','work_order_part_cost',
       case when wop.quantity_installed>0 then 'recognized' else 'pending' end,'public.work_order_parts',wop.id::text,wop.canonical_asset_id,wop.canonical_product_id,null::uuid,wop.work_order_id,
       cc.code,wop.quantity_installed::numeric,wop.unit_cost,coalesce(wop.quantity_installed,0)::numeric*coalesce(wop.unit_cost,0),'CLP',coalesce(wop.notes,'Repuesto OT'),
       jsonb_build_object('status',wop.status,'issued',wop.quantity_issued,'returned',wop.quantity_returned)
from public.work_order_parts wop
left join public.maintenance_work_orders wo on wo.id=wop.work_order_id
left join public.cost_centers cc on cc.id=wo.cost_center_id
where coalesce(wop.quantity_installed,0)>0
union all
select wol.organization_id,'erp_labor:'||wol.id,coalesce(wol.ended_at,wol.started_at,wol.created_at),'ERP','labor_cost','recognized','public.work_order_labor_entries',wol.id::text,
       wol.canonical_asset_id,null::uuid,null::uuid,wol.work_order_id,cc.code,wol.hours,wol.hourly_cost,coalesce(wol.hours,0)*coalesce(wol.hourly_cost,0),'CLP',coalesce(wol.notes,'Mano de obra OT'),
       jsonb_build_object('technician_id',wol.technician_id,'technician_name',wol.technician_name)
from public.work_order_labor_entries wol
left join public.maintenance_work_orders wo on wo.id=wol.work_order_id
left join public.cost_centers cc on cc.id=wo.cost_center_id
where coalesce(wol.hours,0)>0
union all
select wo.organization_id,'erp_external:'||wo.id,coalesce(wo.closed_at,wo.updated_at::timestamptz),'ERP','external_service_cost',
       case when wo.status='completed' then 'recognized' else 'pending' end,'public.maintenance_work_orders',wo.id::text,wo.canonical_asset_id,null::uuid,null::uuid,wo.id,
       cc.code,1::numeric,wo.external_cost,wo.external_cost,'CLP','Costo externo OT',jsonb_build_object('work_order_number',wo.work_order_number,'status',wo.status)
from public.maintenance_work_orders wo
left join public.cost_centers cc on cc.id=wo.cost_center_id
where coalesce(wo.external_cost,0)<>0;

create or replace view public.asset_identity_unified_preview_v1 as
with cost_by_finance_asset as (
  select r.organization_id,r.finance_asset_id as source_asset_id,
         count(c.id) filter (where c.validation_status<>'invalid') as recognized_cost_events,
         sum(c.total_cost) filter (where c.validation_status<>'invalid' and c.currency='CLP') as recognized_cost_clp,
         sum(c.total_cost) filter (where c.validation_status<>'invalid' and c.currency='CLP' and c.transaction_date>=date_trunc('year',current_date)::date) as recognized_cost_clp_ytd,
         max(c.transaction_date) filter (where c.validation_status<>'invalid') as last_cost_at
  from public.finance_asset_reconciliation_v1 r
  left join canonical.asset_costs c on c.organization_id=r.organization_id and c.asset_code=r.finance_asset_code
  group by r.organization_id,r.finance_asset_id
), drilling_by_operational_asset as (
  select organization_id,canonical_asset_id as target_asset_id,count(*) as drilling_reports,sum(drilled_meters) as drilled_meters,max(operation_date) as last_drilling_at
  from public.production_drilling_source_reports where canonical_asset_id is not null
  group by organization_id,canonical_asset_id
)
select p.organization_id,p.source_asset_id,p.source_asset_code,p.source_asset_name,p.target_asset_id,p.target_asset_code,p.target_asset_name,p.evidence_rule,
       coalesce(c.recognized_cost_events,0::bigint) as recognized_cost_events,c.recognized_cost_clp,c.recognized_cost_clp_ytd,c.last_cost_at,
       coalesce(d.drilling_reports,0::bigint) as drilling_reports,d.drilled_meters,d.last_drilling_at,
       case when c.recognized_cost_clp is not null and d.drilled_meters is not null and d.drilled_meters>0 then c.recognized_cost_clp/d.drilled_meters end as lifetime_cost_clp_per_meter_preview,
       case when a.id is not null then 'canonicalized' else 'review_required' end::text as identity_status,
       (a.id is not null) as canonicalized
from public.asset_identity_merge_plan_v1 p
left join cost_by_finance_asset c on c.organization_id=p.organization_id and c.source_asset_id=p.source_asset_id
left join drilling_by_operational_asset d on d.organization_id=p.organization_id and d.target_asset_id=p.target_asset_id
left join canonical.asset_identity_aliases a on a.organization_id=p.organization_id and a.source_asset_id=p.source_asset_id and a.target_asset_id=p.target_asset_id and a.is_active;
