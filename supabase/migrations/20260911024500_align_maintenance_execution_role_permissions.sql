-- Align terrain execution cargos with the canonical mobile maintenance workflow.
-- Execution roles can operate assigned work orders and read maintenance documents,
-- but receive no gerencial, recursos, finance, or cross-module access here.

with execution_cargos as (
  select id
  from public.cargos
  where name in (
    'Jefe de Taller Mina Don Jaime',
    'Jefe de Taller Mina Peumo',
    'Jefe de Taller Mina San Pedro',
    'Encargado de Camionetas y Camiones',
    'Soldador'
  )
), desired_permissions(module_key, access_level) as (
  values
    ('mant_operaciones'::text, 'ED'::text),
    ('mant_documentos'::text, 'LEC'::text)
)
insert into public.role_matrix (cargo_id, module_key, access_level, updated_at)
select c.id, p.module_key, p.access_level, now()
from execution_cargos c
cross join desired_permissions p
on conflict (cargo_id, module_key)
do update set
  access_level = excluded.access_level,
  updated_at = excluded.updated_at;
