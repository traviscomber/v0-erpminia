-- La Patagua Geologia — deterministic hole -> mine reconciliation
-- Applied in production on 2026-09-05 after Exelito cross-check.
-- Scope: mine association only. This script intentionally does NOT infer sector,
-- collar coordinates, azimuth, dip, logging or any other geological attribute.
--
-- Evidence priority:
--   1. Existing high-confidence source-document site consensus for the hole.
--   2. Otherwise, a hole-code family with >= 10 already canonical holes and
--      100% agreement on one canonical mine.
-- If both are present and disagree, the hole is excluded from automation.

begin;

create temporary table tmp_geology_assign on commit drop as
with hbase as (
  select
    h.id,
    h.hole_code,
    h.mine_source_id,
    regexp_replace(
      regexp_replace(upper(coalesce(h.hole_code, '')), '[^A-Z0-9]', '', 'g'),
      '[0-9].*$',
      '',
      'g'
    ) as prefix
  from production_drill_holes h
),
fam as (
  select
    prefix,
    min(mine_source_id::text)::uuid as mine_id,
    count(*) as linked_count,
    count(distinct mine_source_id) as mine_count
  from hbase
  where mine_source_id is not null
  group by prefix
  having count(*) >= 10
     and count(distinct mine_source_id) = 1
),
site as (
  select
    e.drill_hole_id,
    min(e.mine_source_id::text)::uuid as mine_id,
    count(*) as evidence_count
  from production_drill_hole_location_evidence e
  join hbase h on h.id = e.drill_hole_id
  where h.mine_source_id is null
    and e.status = 'candidate'
    and e.confidence = 'high'
    and e.mine_source_id is not null
  group by e.drill_hole_id
  having count(distinct e.mine_source_id) = 1
)
select
  h.id as drill_hole_id,
  h.hole_code,
  h.prefix,
  coalesce(s.mine_id, f.mine_id) as proposed_mine_id,
  case
    when s.mine_id is not null then 'source_site_consensus'
    else 'validated_code_family'
  end as rule,
  coalesce(s.evidence_count, 0) as site_evidence_count,
  coalesce(f.linked_count, 0) as family_linked_count
from hbase h
left join fam f on f.prefix = h.prefix
left join site s on s.drill_hole_id = h.id
where h.mine_source_id is null
  and coalesce(s.mine_id, f.mine_id) is not null
  and not (
    s.mine_id is not null
    and f.mine_id is not null
    and s.mine_id <> f.mine_id
  );

-- Preserve a machine-readable audit trail for family-only decisions.
insert into production_drill_hole_location_evidence (
  id,
  organization_id,
  drill_hole_id,
  mine_source_id,
  mine_sector_id,
  evidence_type,
  source_reference,
  evidence_date,
  confidence,
  status,
  evidence_payload,
  evidence_hash,
  notes,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  h.organization_id,
  t.drill_hole_id,
  t.proposed_mine_id,
  null,
  'import_mapping',
  'Exelito deterministic cross: historical canonical hole-code family',
  current_date,
  'high',
  'candidate',
  jsonb_build_object(
    'rule', 'validated_code_family_v1',
    'prefix', t.prefix,
    'canonical_linked_holes', t.family_linked_count,
    'hole_code', t.hole_code,
    'source', 'La Patagua canonical history'
  ),
  md5('validated_code_family_v1|' || t.drill_hole_id::text || '|' || t.proposed_mine_id::text),
  'Asignacion de mina por familia de codigo solo cuando >=10 pozos canonicos previos de la misma familia apuntan unanimemente a la misma mina. No asigna sector ni coordenadas.',
  now(),
  now()
from tmp_geology_assign t
join production_drill_holes h on h.id = t.drill_hole_id
where t.rule = 'validated_code_family'
on conflict (organization_id, drill_hole_id, evidence_type, evidence_hash) do nothing;

update production_drill_holes h
set
  mine_source_id = t.proposed_mine_id,
  source_reference = concat_ws(
    ' | ',
    nullif(h.source_reference, ''),
    'Exelito mine reconciliation 2026-09-05: ' || t.rule
  ),
  updated_at = now()
from tmp_geology_assign t
where h.id = t.drill_hole_id
  and h.mine_source_id is null;

-- Keep granular drilling reports aligned with the canonical hole assignment.
update production_drilling_source_reports r
set
  canonical_mine_source_id = t.proposed_mine_id,
  reconciliation_status = case
    when r.canonical_mine_sector_id is not null
     and r.canonical_drill_hole_id is not null then 'matched'
    else 'review'
  end,
  reconciliation_notes = concat_ws(
    ' | ',
    nullif(r.reconciliation_notes, ''),
    'Exelito 2026-09-05 mine reconciliation: ' || t.rule
  )
from tmp_geology_assign t
where (
    r.canonical_drill_hole_id = t.drill_hole_id
    or regexp_replace(lower(coalesce(r.hole_code_raw, '')), '[^a-z0-9]', '', 'g')
       = regexp_replace(lower(coalesce(t.hole_code, '')), '[^a-z0-9]', '', 'g')
  )
  and r.canonical_mine_source_id is null;

commit;
