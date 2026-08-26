-- Preserve RAW hole codes while reconciling proven typographic aliases to a single canonical drill-hole identity.
with aliases(raw_value, canonical_code, evidence) as (
  values
    ('DDJI26 - 39','DDJI26-39','Secuencia continua 1.3-122.3 m, mismo equipo y sitio, alternando ambas grafías del 24 al 30 de julio 2026.'),
    ('DDJI26 -08','DDJI26-08','Secuencia continua 0-120.6 m, mismo equipo y sitio, alternando ambas grafías del 18 al 20 de mayo 2026.'),
    ('ONDJI 26-01','ONDJI26-01','Secuencia continua 0-363 m, mismo equipo; la variante con espacio aparece intercalada dentro de la serie del mismo pozo.'),
    ('Onp25-10','ONP25-10','Única fila tipográfica dentro de la serie ONP25-10, mismo equipo y rango de metros.'),
    ('Onpsur 25-01','ONPSUR25-01','Única fila tipográfica dentro de la serie ONPSUR25-01, mismo equipo y rango de metros.'),
    ('DPA23-11','DPA 23-11','Secuencia continua 0-106.65 m del mismo equipo; ambas grafías se alternan en junio-julio 2025.'),
    ('ONPSUR25-21','ONPSUR 25-21','Secuencia continua 0-200.4 m del mismo equipo; ambas grafías se alternan entre el 18 y 20 de agosto 2025.')
)
insert into public.production_entity_reconciliation (
  organization_id,
  entity_type,
  raw_value,
  normalized_value,
  drill_hole_id,
  status,
  confidence,
  evidence,
  reviewed_at
)
select
  h.organization_id,
  'drill_hole',
  a.raw_value,
  regexp_replace(lower(a.raw_value), '[^a-z0-9]', '', 'g'),
  h.id,
  'matched',
  'high',
  a.evidence,
  now()
from aliases a
join public.production_drill_holes h
  on h.hole_code = a.canonical_code
on conflict (organization_id, entity_type, normalized_value)
do update set
  drill_hole_id = excluded.drill_hole_id,
  status = 'matched',
  confidence = 'high',
  evidence = excluded.evidence,
  reviewed_at = now(),
  updated_at = now();

update public.production_drilling_source_reports r
set canonical_drill_hole_id = er.drill_hole_id,
    reconciliation_notes = concat_ws(' | ', nullif(r.reconciliation_notes, ''), 'Alias tipográfico reconciliado por continuidad de serie.')
from public.production_entity_reconciliation er
where er.organization_id = r.organization_id
  and er.entity_type = 'drill_hole'
  and er.status = 'matched'
  and er.confidence = 'high'
  and er.drill_hole_id is not null
  and er.raw_value = r.hole_code_raw
  and r.canonical_drill_hole_id is distinct from er.drill_hole_id;
