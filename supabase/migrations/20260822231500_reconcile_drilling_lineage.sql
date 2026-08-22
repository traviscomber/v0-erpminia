-- Reconcile source drilling reports to canonical drill holes without inventing mine/sector lineage.
-- Mina/Sector remain review-only until backed by auditable evidence.

alter table public.production_entity_reconciliation
  drop constraint if exists production_entity_reconciliation_entity_type_check;

alter table public.production_entity_reconciliation
  add constraint production_entity_reconciliation_entity_type_check
  check (entity_type in ('driver','carrier','vehicle','mine','sector','drill_hole'));

alter table public.production_entity_reconciliation
  add column if not exists drill_hole_id uuid
  references public.production_drill_holes(id) on delete set null;

create index if not exists production_reconciliation_drill_hole_idx
  on public.production_entity_reconciliation (organization_id, drill_hole_id)
  where drill_hole_id is not null;

create index if not exists production_drill_holes_mine_source_idx
  on public.production_drill_holes (organization_id, mine_source_id)
  where mine_source_id is not null;

create index if not exists production_drill_holes_mine_sector_idx
  on public.production_drill_holes (organization_id, mine_sector_id)
  where mine_sector_id is not null;

create index if not exists production_drilling_reports_canonical_hole_idx
  on public.production_drilling_source_reports (organization_id, canonical_drill_hole_id)
  where canonical_drill_hole_id is not null;

create index if not exists production_drilling_reports_canonical_mine_idx
  on public.production_drilling_source_reports (organization_id, canonical_mine_source_id)
  where canonical_mine_source_id is not null;

create index if not exists production_drilling_reports_canonical_sector_idx
  on public.production_drilling_source_reports (organization_id, canonical_mine_sector_id)
  where canonical_mine_sector_id is not null;

insert into public.production_drilling_campaigns (
  organization_id, campaign_code, campaign_name, drilling_domain, status,
  actual_start_date, actual_end_date, objective
)
select
  organization_id,
  'SOURCE-SONDAJES-2023',
  'Reporte Sondajes 2023',
  'production',
  'completed',
  min(operation_date),
  max(operation_date),
  'Campaña técnica creada para preservar el linaje de pozos observados en production_drilling_source_reports; Mina/Sector quedan sin inferencia hasta contar con evidencia.'
from public.production_drilling_source_reports
group by organization_id
on conflict (organization_id, campaign_code) do nothing;

insert into public.production_drill_holes (
  organization_id, campaign_id, hole_code, drilling_domain, status,
  source_type, source_reference, notes
)
select
  r.organization_id,
  c.id,
  trim(r.hole_code_raw),
  'production',
  'completed',
  'source_report',
  'Reporte_Sondajes_I_A.xlsx / BaseDatos',
  'Pozo promovido por coincidencia exacta de código desde fuente operacional. Mina/Sector no inferidos.'
from public.production_drilling_source_reports r
join public.production_drilling_campaigns c
  on c.organization_id = r.organization_id
 and c.campaign_code = 'SOURCE-SONDAJES-2023'
where nullif(trim(r.hole_code_raw), '') is not null
group by r.organization_id, c.id, trim(r.hole_code_raw)
on conflict (organization_id, hole_code) do nothing;

update public.production_drilling_source_reports r
set canonical_drill_hole_id = h.id,
    reconciliation_status = case
      when r.canonical_mine_source_id is not null
       and r.canonical_mine_sector_id is not null then 'matched'
      else 'review'
    end,
    reconciliation_notes = case
      when r.canonical_mine_source_id is not null
       and r.canonical_mine_sector_id is not null
        then 'Pozo reconciliado por código exacto; Mina/Sector ya disponibles.'
      else 'Pozo reconciliado por código exacto. Mina/Sector pendientes: la fuente reporta No registrado y no se infiere ubicación.'
    end
from public.production_drill_holes h
where h.organization_id = r.organization_id
  and h.hole_code = trim(r.hole_code_raw)
  and nullif(trim(r.hole_code_raw), '') is not null
  and r.canonical_drill_hole_id is distinct from h.id;

insert into public.production_entity_reconciliation (
  organization_id, entity_type, raw_value, normalized_value,
  drill_hole_id, status, confidence, evidence
)
select
  h.organization_id,
  'drill_hole',
  h.hole_code,
  lower(trim(h.hole_code)),
  h.id,
  'matched',
  'high',
  'Coincidencia exacta de hole_code_raw con production_drill_holes.hole_code; sin inferencia de Mina/Sector.'
from public.production_drill_holes h
where h.source_reference = 'Reporte_Sondajes_I_A.xlsx / BaseDatos'
on conflict (organization_id, entity_type, normalized_value)
do update set
  drill_hole_id = excluded.drill_hole_id,
  status = 'matched',
  confidence = 'high',
  evidence = excluded.evidence,
  updated_at = now();

create or replace view public.production_drilling_reconciliation_v1
with (security_invoker = true) as
select
  r.organization_id,
  r.id as report_id,
  r.operation_date,
  r.hole_code_raw,
  r.mine_raw,
  r.sector_raw,
  r.drilled_meters,
  r.canonical_mine_source_id,
  r.canonical_mine_sector_id,
  r.canonical_drill_hole_id,
  m.name as canonical_mine_name,
  s.name as canonical_sector_name,
  h.hole_code as canonical_hole_code,
  (r.canonical_mine_source_id is not null) as mine_linked,
  (r.canonical_mine_sector_id is not null) as sector_linked,
  (r.canonical_drill_hole_id is not null) as hole_linked,
  case when s.id is null then null else s.mine_source_id = r.canonical_mine_source_id end as sector_belongs_to_mine,
  case when h.id is null or h.mine_source_id is null then null else h.mine_source_id = r.canonical_mine_source_id end as hole_mine_consistent,
  case when h.id is null or h.mine_sector_id is null then null else h.mine_sector_id = r.canonical_mine_sector_id end as hole_sector_consistent,
  case
    when r.canonical_drill_hole_id is null then 'unlinked_hole'
    when r.canonical_mine_source_id is null and r.canonical_mine_sector_id is null then 'hole_only_review'
    when r.canonical_mine_source_id is null then 'missing_mine'
    when r.canonical_mine_sector_id is null then 'missing_sector'
    when s.mine_source_id is distinct from r.canonical_mine_source_id then 'sector_mine_conflict'
    when h.mine_source_id is not null and h.mine_source_id is distinct from r.canonical_mine_source_id then 'hole_mine_conflict'
    when h.mine_sector_id is not null and h.mine_sector_id is distinct from r.canonical_mine_sector_id then 'hole_sector_conflict'
    else 'fully_reconciled'
  end as lineage_state,
  r.reconciliation_status,
  r.reconciliation_notes
from public.production_drilling_source_reports r
left join public.production_mine_sources m
  on m.id = r.canonical_mine_source_id and m.organization_id = r.organization_id
left join public.production_mine_sectors s
  on s.id = r.canonical_mine_sector_id and s.organization_id = r.organization_id
left join public.production_drill_holes h
  on h.id = r.canonical_drill_hole_id and h.organization_id = r.organization_id;

revoke all on public.production_drilling_reconciliation_v1 from anon, authenticated;
grant select on public.production_drilling_reconciliation_v1 to service_role;
