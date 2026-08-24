# MOTIL — Auditoría de propiedad por módulo

Fecha: 2026-08-24

Objetivo: separar **permiso** (`role_matrix`) de **responsabilidad canónica** del módulo y dejar trazable el estado real de gobernanza.

## Estado actual

- Los 48 módulos presentes en `role_matrix` tienen un propietario funcional definido en `lib/module-ownership.ts`.
- El registro de ownership es la fuente canónica para responsabilidad funcional.
- `role_matrix` sigue siendo la fuente de autorización; un cargo puede tener `ED` sin ser propietario del módulo.
- No se crearon cargos ni personas nuevas.
- No se eliminaron ni degradaron permisos existentes.
- Se añadieron únicamente los permisos `ED` que faltaban para que seis propietarios canónicos pudieran operar sus módulos.

## Reglas de gobernanza

1. Un módulo tiene exactamente un propietario funcional canónico.
2. Ownership y autorización son conceptos separados.
3. La propiedad se fundamenta en evidencia disponible: snapshot KPI, `role_matrix` y/o especialización funcional del módulo.
4. Un permiso transversal no convierte al usuario en propietario del módulo.
5. Los portales `Mi área` sólo se habilitan cuando el cargo autenticado coincide con la responsabilidad definida para el portal.
6. No se atribuyen datos, OT, KPI o resultados a una jefatura cuando la evidencia no permite segmentarlos de forma trazable.

## Registro canónico por dominio

### Producción

| Módulo | Propietario canónico |
|---|---|
| `prod_operaciones` | JEFE PLANTA |
| `prod_quimica` | JEFE PLANTA |
| `prod_geologia` | JEFE GEÓLOGIA |
| `prod_sondaje` | JEFE SONDAJE |
| `prod_sondaje_exploracion` | JEFE GEOLOGÍA EXPLO. |
| `prod_sondaje_produccion` | JEFE SONDAJE |
| `prod_topografia` | JEFE ING. PLA MINA |
| `prod_telemetria` | JEFE ADM. |

`prod_telemetria` conserva a JEFE ADM. porque es el único cargo con evidencia `ED` vigente. Debe revisarse si la gobernanza operacional cambia.

### Mantención

| Módulo | Propietario canónico |
|---|---|
| `mant_operaciones` | JEFE MAN. EQ |
| `mant_gerencial` | JEFE MAN. EQ |
| `mant_recursos` | JEFE MAN. EQ |
| `mant_documentos` | JEFE MAN. EQ |
| `mant_activos_estado` | JEFE MAN. PLANTA |
| `mant_combustible_mina` | JEFE MAN. PLANTA |
| `mant_evaluaciones_personal` | JEFE MAN. PLANTA |
| `mant_maestranza` | JEFE MAN. PLANTA |

### Bodega

| Módulo | Propietario canónico |
|---|---|
| `bodega_inventario` | JEFE BODEGA |
| `bodega_documentos` | JEFE BODEGA |

### Administración, finanzas y core

| Módulo | Propietario canónico |
|---|---|
| `fin_compras` | JEFE ADM. |
| `fin_finanzas` | JEFE ADM. |
| `fin_reportes` | JEFE ADM. |
| `core_alertas` | JEFE ADM. |
| `core_centros_costos` | JEFE ADM. |

### Legal y contratos

JEFE ADM. es propietario canónico de:

- `legal_modulo`
- `legal_contratos`
- `legal_eecc`
- `contratos_solicitar_link`
- `contratos_subir_info`
- `contratos_aprobar`
- `contratos_autorizar`
- `contratos_visualizacion`

### HSE

JEFE SOSTENIBILIDAD es propietario canónico de:

- `hse_tablero`
- `hse_kpls`
- `hse_documentacion`
- `hse_documentos_extra`
- `hse_epp`
- `hse_epp_diagnostico`
- `hse_incidente`
- `hse_riesgos`
- `hse_investigaciones`
- `hse_capacitaciones`

PREVENCIONISTA puede conservar permisos operativos donde corresponda, pero no reemplaza al propietario funcional del dominio HSE.

### Sostenibilidad

JEFE SOSTENIBILIDAD es propietario canónico de:

- `sos_tablero`
- `sos_medio_ambiente`
- `sos_comunidades`
- `sos_documentos`
- `sos_calendario`

### RRHH y desempeño

| Módulo | Propietario canónico | Observación |
|---|---|---|
| `rrhh_expediente` | JEFE RRHH | Cargo existente; ownership definido por especialización del módulo. |
| `core_desempeno` | GERENTE | PRESIDENTE puede conservar `ED` como nivel de gobierno, no como propietario operativo. |

## Correcciones aditivas de `role_matrix`

Se corrigieron seis ausencias de autorización del propio cargo responsable, sin quitar permisos a terceros:

- JEFE BODEGA → `bodega_documentos` → `ED`
- JEFE BODEGA → `bodega_inventario` → `ED`
- JEFE SOSTENIBILIDAD → `hse_tablero` → `ED`
- JEFE MAN. EQ → `mant_operaciones` → `ED`
- JEFE PLANTA → `prod_operaciones` → `ED`
- JEFE RRHH → `rrhh_expediente` → `ED`

La existencia de múltiples cargos `ED` en un módulo ya no se interpreta como ownership múltiple. Es autorización; el propietario funcional sigue siendo único.

## Perfiles activos relevantes

- Daniel Villarroel — GERENTE
- Pedro Pablo Zegers — GERENTE OPERACIONES
- Gustavo Vega — Jefe Departamento de Mantención
- Ariel Lopez — JEFE MAN. EQ
- M Astudillo — JEFE MAN. EQ
- Mauricio Astudillo — Jefe de Equipos Mineros
- Rodrigo Olmo — Jefe de Camionetas
- Gonzalo Canales — JEFE SOSTENIBILIDAD

No se crean perfiles para cargos vacantes. Los portales preparados por cargo permanecen inactivos hasta que exista una asignación real.

## Portales ejecutivos

El patrón vigente es:

- Pedro Pablo Zegers → `Mi operación`
- JEFE PLANTA → `Mi producción`
- JEFE MAN. EQ / Jefe Departamento de Mantención → portal ejecutivo de mantención según responsabilidad disponible
- JEFE SOSTENIBILIDAD → `Mi HSE`
- JEFE BODEGA → `Mi bodega`
- JEFE ADM. → `Mi administración`
- JEFE GEÓLOGIA → `Mi geología`
- JEFE SONDAJE → `Mi sondaje`
- Jefe de Equipos Mineros → `Mis equipos mineros`
- Jefe de Camionetas → `Mis camionetas`

Cada endpoint valida identidad/cargo en backend y usa fuentes canónicas de su dominio. Los endpoints especializados no deben caer en datos de otra área.

## Pendientes reales

1. Validar visualmente los portales autenticados en desktop y móvil cuando exista navegador con sesión disponible.
2. Mantener `prod_telemetria` bajo revisión de gobernanza si aparece nueva evidencia operacional.
3. Mejorar segmentación por activo para Equipos Mineros y Camionetas antes de atribuir OT globales a esas jefaturas.
4. Activar portales de cargos actualmente vacantes sólo cuando exista un perfil real asignado.
5. Revisar en una fase separada si algunos permisos `ED` transversales pueden simplificarse; no hacerlo como parte del ownership.
