-- Promote canonical drilling workbook facts without altering RAW source values.
-- Source: Reporte_Sondajes_I_A.xlsx / BaseDatos

begin;

-- Expand the existing synthetic source campaign to the full canonical workbook range.
update public.production_drilling_campaigns c
set campaign_code = 'SOURCE-SONDAJES-2023-2026',
    campaign_name = 'Reporte Sondajes I_A 2023-2026',
    actual_start_date = s.min_date,
    actual_end_date = s.max_date,
    updated_at = now()
from (
  select organization_id, min(operation_date) min_date, max(operation_date) max_date
  from public.production_drilling_source_reports
  where source_file_sha256 = '890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50'
  group by organization_id
) s
where c.organization_id = s.organization_id
  and c.campaign_code in ('SOURCE-SONDAJES-2023','SOURCE-SONDAJES-2023-2026');

-- Materialize one operational hole per exact source hole code.
with src as (
  select r.organization_id,
         trim(r.hole_code_raw) hole_code,
         min(r.operation_date) first_date,
         max(r.operation_date) last_date,
         max(r.meter_final) filter (where r.meter_final is not null) max_depth
  from public.production_drilling_source_reports r
  where r.source_file_sha256 = '890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50'
    and nullif(trim(r.hole_code_raw),'') is not null
  group by r.organization_id, trim(r.hole_code_raw)
), campaign as (
  select distinct on (organization_id) id, organization_id
  from public.production_drilling_campaigns
  where campaign_code = 'SOURCE-SONDAJES-2023-2026'
  order by organization_id, created_at desc
)
insert into public.production_drill_holes(
  organization_id,campaign_id,hole_code,drilling_domain,drilled_depth_m,
  start_at,completed_at,status,notes,source_type,source_reference,updated_at
)
select s.organization_id,c.id,s.hole_code,'production',s.max_depth,
       s.first_date::timestamp at time zone 'UTC',
       s.last_date::timestamp at time zone 'UTC',
       'completed',
       'Materializado desde Reporte_Sondajes_I_A.xlsx / BaseDatos. Mina/Sector sólo se promueven cuando la fuente es explícita y no conflictiva.',
       'source_report','Reporte_Sondajes_I_A.xlsx / BaseDatos',now()
from src s join campaign c using (organization_id)
on conflict (organization_id,hole_code) do update set
  campaign_id=excluded.campaign_id,
  drilled_depth_m=excluded.drilled_depth_m,
  start_at=excluded.start_at,
  completed_at=excluded.completed_at,
  notes=excluded.notes,
  source_type=excluded.source_type,
  source_reference=excluded.source_reference,
  updated_at=now();

-- Exact source-row -> hole lineage. Rows with no Pozo remain intentionally unlinked.
update public.production_drilling_source_reports r
set canonical_drill_hole_id=h.id,
    reconciliation_notes=concat_ws(' | ',nullif(r.reconciliation_notes,''),'Pozo vinculado por igualdad exacta de hole_code_raw al workbook canónico')
from public.production_drill_holes h
where h.organization_id=r.organization_id
  and h.hole_code=trim(r.hole_code_raw)
  and r.source_file_sha256='890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50'
  and nullif(trim(r.hole_code_raw),'') is not null;

-- Preserve exact valid sector strings as operational review sectors; variants are NOT merged.
with resolved as (
  select trim(r.hole_code_raw) hole_code,
         min(upper(trim(r.mine_raw))) filter (where nullif(trim(r.mine_raw),'') is not null and upper(trim(r.mine_raw)) not in ('NO REGISTRADO','#ERROR!')) mine_raw,
         min(trim(r.sector_raw)) filter (where nullif(trim(r.sector_raw),'') is not null and upper(trim(r.sector_raw)) <> 'NO REGISTRADO') sector_raw,
         count(distinct upper(trim(r.mine_raw))) filter (where nullif(trim(r.mine_raw),'') is not null and upper(trim(r.mine_raw)) not in ('NO REGISTRADO','#ERROR!')) mines,
         count(distinct upper(trim(r.sector_raw))) filter (where nullif(trim(r.sector_raw),'') is not null and upper(trim(r.sector_raw)) <> 'NO REGISTRADO') sectors
  from public.production_drilling_source_reports r
  where r.source_file_sha256='890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50'
    and nullif(trim(r.hole_code_raw),'') is not null
  group by trim(r.hole_code_raw)
), exact_locations as (
  select distinct h.organization_id,ms.id mine_source_id,r.sector_raw sector_name,lower(trim(r.sector_raw)) normalized_name
  from resolved r
  join public.production_drill_holes h on h.hole_code=r.hole_code
  join public.production_mine_sources ms on ms.organization_id=h.organization_id and (
       (r.mine_raw='DON JAIME' and ms.code='DON_JAIME') or
       (r.mine_raw='PEUMO' and ms.code='PEUMO') or
       (r.mine_raw='SAN PEDRO' and ms.code='SAN_PEDRO'))
  where r.mines=1 and r.sectors=1 and r.sector_raw is not null
)
insert into public.production_mine_sectors(organization_id,mine_source_id,name,normalized_name,status,created_at,updated_at)
select organization_id,mine_source_id,sector_name,normalized_name,'review',now(),now()
from exact_locations
on conflict (organization_id,mine_source_id,normalized_name) do nothing;

-- Promote Mina/Sector only when the workbook provides one unique non-error value for the hole.
with resolved as (
  select trim(r.hole_code_raw) hole_code,
         min(upper(trim(r.mine_raw))) filter (where nullif(trim(r.mine_raw),'') is not null and upper(trim(r.mine_raw)) not in ('NO REGISTRADO','#ERROR!')) mine_raw,
         min(trim(r.sector_raw)) filter (where nullif(trim(r.sector_raw),'') is not null and upper(trim(r.sector_raw)) <> 'NO REGISTRADO') sector_raw,
         count(distinct upper(trim(r.mine_raw))) filter (where nullif(trim(r.mine_raw),'') is not null and upper(trim(r.mine_raw)) not in ('NO REGISTRADO','#ERROR!')) mines,
         count(distinct upper(trim(r.sector_raw))) filter (where nullif(trim(r.sector_raw),'') is not null and upper(trim(r.sector_raw)) <> 'NO REGISTRADO') sectors
  from public.production_drilling_source_reports r
  where r.source_file_sha256='890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50'
    and nullif(trim(r.hole_code_raw),'') is not null
  group by trim(r.hole_code_raw)
), mapped as (
  select h.id hole_id,ms.id mine_source_id,case when r.sectors=1 then sec.id end mine_sector_id
  from resolved r
  join public.production_drill_holes h on h.hole_code=r.hole_code
  join public.production_mine_sources ms on ms.organization_id=h.organization_id and (
       (r.mine_raw='DON JAIME' and ms.code='DON_JAIME') or
       (r.mine_raw='PEUMO' and ms.code='PEUMO') or
       (r.mine_raw='SAN PEDRO' and ms.code='SAN_PEDRO'))
  left join public.production_mine_sectors sec on sec.organization_id=h.organization_id and sec.mine_source_id=ms.id and sec.normalized_name=lower(trim(r.sector_raw))
  where r.mines=1
)
update public.production_drill_holes h
set mine_source_id=m.mine_source_id,mine_sector_id=m.mine_sector_id,updated_at=now()
from mapped m where h.id=m.hole_id;

-- Per-row canonical references follow only explicit valid source values.
with srcmap as (
  select r.id report_id,ms.id mine_source_id,sec.id mine_sector_id
  from public.production_drilling_source_reports r
  join public.production_mine_sources ms on ms.organization_id=r.organization_id and (
       (upper(trim(r.mine_raw))='DON JAIME' and ms.code='DON_JAIME') or
       (upper(trim(r.mine_raw))='PEUMO' and ms.code='PEUMO') or
       (upper(trim(r.mine_raw))='SAN PEDRO' and ms.code='SAN_PEDRO'))
  left join public.production_mine_sectors sec on sec.organization_id=r.organization_id and sec.mine_source_id=ms.id and sec.normalized_name=lower(trim(r.sector_raw))
  where r.source_file_sha256='890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50'
    and nullif(trim(r.mine_raw),'') is not null
    and upper(trim(r.mine_raw)) not in ('NO REGISTRADO','#ERROR!')
)
update public.production_drilling_source_reports r
set canonical_mine_source_id=s.mine_source_id,canonical_mine_sector_id=s.mine_sector_id
from srcmap s where r.id=s.report_id;

commit;

create or replace view public.production_drilling_source_fidelity_v1
with (security_invoker=true)
as
with c as (
  select distinct organization_id
  from public.production_drilling_source_reports
  where source_file_sha256='890a02364b1b41c9724458c40e46964190255d34c9f7ca8b9e9985d53bb1ad50'
), checks as (
  select organization_id,'operational_holes'::text check_key,400::numeric expected_value,(select count(*)::numeric from public.production_drill_holes h where h.organization_id=c.organization_id) actual_value,'rows'::text unit from c
  union all select organization_id,'source_rows_linked_to_hole',4630::numeric,(select count(*)::numeric from public.production_drilling_source_reports r where r.organization_id=c.organization_id and r.canonical_drill_hole_id is not null),'rows' from c
  union all select organization_id,'source_rows_without_hole_code',63::numeric,(select count(*)::numeric from public.production_drilling_source_reports r where r.organization_id=c.organization_id and nullif(trim(r.hole_code_raw),'') is null),'rows' from c
  union all select organization_id,'holes_with_explicit_mine',159::numeric,(select count(*)::numeric from public.production_drill_holes h where h.organization_id=c.organization_id and h.mine_source_id is not null),'holes' from c
  union all select organization_id,'holes_with_explicit_sector',154::numeric,(select count(*)::numeric from public.production_drill_holes h where h.organization_id=c.organization_id and h.mine_sector_id is not null),'holes' from c
  union all select organization_id,'source_rows_with_explicit_mine',1542::numeric,(select count(*)::numeric from public.production_drilling_source_reports r where r.organization_id=c.organization_id and r.canonical_mine_source_id is not null),'rows' from c
  union all select organization_id,'source_rows_with_explicit_sector',1506::numeric,(select count(*)::numeric from public.production_drilling_source_reports r where r.organization_id=c.organization_id and r.canonical_mine_sector_id is not null),'rows' from c
)
select organization_id,check_key,expected_value,actual_value,unit,
       case when actual_value=expected_value then 'PASS' else 'HOLD' end status,
       actual_value-expected_value delta
from checks;

revoke all on public.production_drilling_source_fidelity_v1 from public,anon,authenticated;
grant select on public.production_drilling_source_fidelity_v1 to service_role;
