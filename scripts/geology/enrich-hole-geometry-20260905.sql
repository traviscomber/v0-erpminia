-- La Patagua Geologia — deterministic geometry enrichment
-- Applied in production on 2026-09-05 after a second Exelito evidence pass.
-- Scope: only values explicitly present in the canonical Reporte_Sondajes_I_A source.
-- No collar coordinates, inferred azimuths, inferred sectors, lithology intervals, or assays are fabricated.
--
-- Rules:
-- 1. dip_deg may be promoted when all numeric Inclinacion source rows for one canonical hole agree.
-- 2. Explicit same-hole setup narratives may supply more precise dip, azimuth, or planned length.
-- 3. Sector promotion requires an exact same-hole posture statement plus an existing active sector under the already-canonical mine.

begin;

with vals as (
  select h.id,
         replace(btrim(r.inclination_raw), ',', '.')::numeric as dip_value
  from production_drill_holes h
  join production_drilling_source_reports r on r.canonical_drill_hole_id = h.id
  where h.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
    and h.dip_deg is null
    and r.inclination_raw ~ '^[-+]?[0-9]+([.,][0-9]+)?$'
), safe as (
  select id,
         min(dip_value) as dip_value,
         count(distinct dip_value) as distinct_values,
         count(*) as support_rows
  from vals
  group by id
  having count(distinct dip_value) = 1
)
update production_drill_holes h
set dip_deg = s.dip_value,
    source_reference = concat_ws(
      ' | ',
      nullif(h.source_reference, ''),
      'Exelito geometry pass 2026-09-05: unanimous Reporte_Sondajes_I_A.Inclinacion (' || s.support_rows || ' source rows)'
    ),
    updated_at = now()
from safe s
where h.id = s.id
  -- ONP24-02 has a more precise explicit narrative value of 2.5 degrees.
  and h.id <> 'ff9e29fb-bc14-4aa3-9c24-f5c41f5df804';

update production_drill_holes
set dip_deg = 2.5,
    source_reference = concat_ws(' | ', nullif(source_reference, ''),
      'Exelito geometry pass 2026-09-05: explicit drilling observation 2024-03-08, inclinacion 2.5 degrees (structured field rounded to 2)'),
    updated_at = now()
where id = 'ff9e29fb-bc14-4aa3-9c24-f5c41f5df804'
  and dip_deg is null;

-- Exact same-hole setup narratives.
update production_drill_holes set dip_deg=20, planned_depth_m=120, updated_at=now() where id='a7acb0cd-bbcf-4306-93c5-b69e0bf73cc0'; -- DP25-40
update production_drill_holes set dip_deg=18, planned_depth_m=120, updated_at=now() where id='1b72dc3b-a12e-4e4e-85c9-4b64061cb6ac'; -- DP25-37
update production_drill_holes set dip_deg=35, planned_depth_m=120, updated_at=now() where id='079ed55a-b0e7-4f6c-809f-71bdeaca5609'; -- DP25-09
update production_drill_holes set dip_deg=-7, planned_depth_m=120, updated_at=now() where id='e15b89fa-fd38-4d23-a640-979ac0497622'; -- DP25-10
update production_drill_holes set dip_deg=20, planned_depth_m=100, updated_at=now() where id='38d56bf2-b97c-4925-800a-561c318822ee'; -- DP24-37
update production_drill_holes set dip_deg=30, planned_depth_m=100, updated_at=now() where id='ceffc0c8-ae7b-4aca-a0a4-0c24e07f5c0f'; -- DP24-35
update production_drill_holes set dip_deg=28, azimuth_deg=122, updated_at=now() where id='17e89a22-63ba-4c11-bd4b-890c3ab0fd51'; -- DP25-31

-- Exact same-hole sector statement: DDJI26-38 was explicitly operated at posture 740 Cuerpo 5.
update production_drill_holes h
set mine_sector_id = '38bdc059-b425-447f-9d58-6e5b6c41c73e',
    source_reference = concat_ws(' | ', nullif(h.source_reference, ''),
      'Exelito sector pass 2026-09-05: exact same-hole posture 740 CUERPO - 5'),
    updated_at = now()
where h.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
  and h.hole_code = 'DDJI26-38'
  and h.mine_sector_id is null;

commit;
