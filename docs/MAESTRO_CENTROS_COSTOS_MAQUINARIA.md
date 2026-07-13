# Maestro de Centros de Costos y Maquinaria

## Objetivo

Consolidar en un solo lugar la relacion entre:

- centros de costo reales,
- maquinaria y vehiculos visibles en el sistema,
- activos redistribuibles desde centros de costo,
- y criterios de exclusion para no mezclar estructura operativa con activos.

## Estado observado en produccion

Snapshot de auditoria tomada el 2026-07-12:

- Centros de costo totales: 277
- Raices `1-7` activas en base: 137
- Derivados desde centros de costo antes de normalizacion: 213
- Activos redistribuibles reales dentro de `1-7`: 17
- Estructura operativa o nodos no maquinaria dentro de `1-7`: 68
- Maquinaria y vehiculos derivados desde centros de costo despues de normalizar la regla: 145
- Maquinaria y vehiculos visibles en la vista principal de maquinaria antes de la redistribucion final: 118
- Vehiculos reales en `maintenance_assets`: 5

## Regla de negocio

### Debe aparecer como maquinaria

Solo los nodos que representen un activo operacional real:

- camionetas
- camiones
- cargadores
- compresores
- sondajes
- excavadoras
- generadores
- minicargadores

### No debe aparecer como maquinaria

Nodos que son estructura organizacional, areas, frentes, proyectos o centros operativos:

- planta
- exploracion como contenedor
- proyectos en ejecucion
- mantenimiento como area
- supervisiones
- recepciones
- campamentos
- caminos
- relaves
- bodegas como area

## Redistribucion aprobada

Estos 17 elementos de `1-7` si son redistribuibles y ya quedan mapeados a familias operativas validas:

| Codigo origen | Nombre actual | Familia destino | Root destino |
|---|---|---|---|
| `1-11` | Compresores | Compresores | `14` |
| `1-13` | sondajes | Equipos de Sondaje | `16` |
| `2-11` | Compresores | Compresores | `14` |
| `2-13` | sondajes | Equipos de Sondaje | `16` |
| `3-3-1` | Excavadora CAT 320-D | Excavadoras y Retroexcavadoras | `19` |
| `3-6-1` | Scoop Atlas Copco ST-1000 | Cargadores de Bajo Perfil | `10` |
| `3-6-2` | Compresor Doosan N1 | Compresores | `14` |
| `3-6-3` | Compresor Atlas Copco XAS-97 | Compresores | `14` |
| `3-7-1` | Sonda Diamec 230 | Equipos de Sondaje | `16` |
| `3-7-2` | Grupo Generador Positrn N63 | Grupos Generadores | `13` |
| `3-7-3` | Minicargador JCB (1) | Minicargadores | `18` |
| `3-7-5` | Compresor Atlas Copco XAS-97 | Compresores | `14` |
| `3-9-1` | Compresor Sullair 185 H | Compresores | `14` |
| `3-9-2` | Scoop Atlas Copco ST-1000 | Cargadores de Bajo Perfil | `10` |
| `3-9-3` | Cargador Ceterpillar 928G | Cargadores Frontales | `11` |
| `3-10-1` | Sonda MDS-141 | Equipos de Sondaje | `16` |
| `3-10-2` | Grupo Generador | Grupos Generadores | `13` |

## Elementos no redistribuibles

Los restantes 68 elementos de `1-7` no deben entrar al catalogo de maquinaria porque son estructura, frente, proyecto o area.

Ejemplos:

- `3-1` exploracion Mina Peumo
- `3-10` exploracion Mina Elsa
- `3-1-disponible` Disponible
- `4-11` Departamento de mantencion
- `4-21` Proyectos en Ejecucion
- `7-15` Proyecto Continuidad Operacional
- `7-15-6` Construccion Bodega

## Aplicacion en codigo

La logica central vive en:

- `lib/maintenance/cost-center-machines.ts`
- `app/api/maintenance/cost-center-machines/route.ts`
- `app/api/maquinaria/machinery/route.ts`

### Efecto esperado

Con la regla actual:

- `maintenance/cost-center-machines` conserva solo los activos redistribuibles reales.
- `maquinaria/machinery` muestra las mismas familias, pero con el criterio de redistribucion ya normalizado.
- Los nodos estructurales de `1-7` quedan fuera del catalogo visible.

## Observaciones de control

1. Los centros de costo raiz `1-7` siguen existiendo en la base, pero el catalogo ya no debe tratarlos como maquinaria.
2. Si se vuelve a importar la base, la regla de inactividad debe mantenerse en el proceso de carga.
3. Cualquier nuevo equipo que aparezca en `1-7` debe revisarse antes de mapearlo a una familia destino.

## Criterio operativo

La regla correcta para el MVP es:

- mantener centros de costo como estructura,
- mostrar maquinaria solo cuando represente un activo real,
- y usar redistribucion explicita solo cuando el registro tenga sentido operacional.

