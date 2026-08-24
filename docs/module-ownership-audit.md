# MOTIL — Auditoría de propiedad por módulo

Fecha: 2026-08-24

Objetivo: separar **permiso** (`role_matrix`) de **responsabilidad canónica** del módulo. Esta auditoría no cambia permisos, perfiles ni datos productivos.

Reglas:
- No se inventan cargos ni personas.
- Sólo se usan cargos ya existentes en `cargos`.
- `ED` significa permiso de edición, no necesariamente dueño del módulo.
- Un módulo queda `CONFIRMADO` sólo cuando existe un cargo responsable inequívoco y coherente con el dominio.
- Un módulo queda `POR RESOLVER` cuando hay múltiples cargos ED o cuando el único ED no es coherente con el dominio funcional.

## Mapa actual

| Módulo | Estado | Cargo responsable existente / evidencia | Observación |
|---|---|---|---|
| `prod_sondaje` | CONFIRMADO | JEFE SONDAJE | Único cargo ED y coincide con el dominio. |
| `prod_sondaje_produccion` | CONFIRMADO | JEFE SONDAJE | Único cargo ED y coincide con el dominio. |
| `prod_topografia` | CONFIRMADO | JEFE ING. PLA MINA | Único cargo ED y coincide con planificación/topografía mina. |
| `mant_maestranza` | CONFIRMADO | JEFE MAN. PLANTA | Único cargo ED y coincide con el dominio. |
| `legal_modulo` | CONFIRMADO | JEFE ADM. | Único cargo ED existente en la matriz. |
| `legal_contratos` | CONFIRMADO | JEFE ADM. | Único cargo ED existente en la matriz. |
| `legal_eecc` | CONFIRMADO | JEFE ADM. | Único cargo ED existente en la matriz. |
| `fin_finanzas` | CONFIRMADO | JEFE ADM. | Único cargo ED existente en la matriz. |
| `fin_reportes` | CONFIRMADO | JEFE ADM. | Único cargo ED existente en la matriz. |
| `core_alertas` | CONFIRMADO | JEFE ADM. | Único cargo ED existente en la matriz. |
| `core_centros_costos` | CONFIRMADO | JEFE ADM. | Único cargo ED existente en la matriz. |
| `prod_geologia` | POR RESOLVER | JEFE GEÓLOGIA / JEFE GEOLOGÍA EXPLO. | Dos cargos ED. |
| `prod_sondaje_exploracion` | POR RESOLVER | JEFE GEOLOGÍA EXPLO. / JEFE SONDAJE | Dos cargos ED. |
| `prod_quimica` | POR RESOLVER | JEFE PLANTA / JEFES DE TURNO PLANTA | Dos cargos ED. |
| `prod_operaciones` | POR RESOLVER | JEFE ADM. tiene ED; JEFE PLANTA existe pero no tiene ED aquí | Inconsistencia entre permiso y dominio funcional. |
| `prod_telemetria` | POR RESOLVER | JEFE ADM. tiene ED | No existe evidencia suficiente para declarar que Administración sea dueño operacional. |
| `bodega_inventario` | POR RESOLVER | JEFE ADM. / JEFE MAN. EQ; existe JEFE BODEGA | El cargo JEFE BODEGA existe pero no es ED en este módulo. |
| `bodega_documentos` | POR RESOLVER | JEFE ADM. / JEFE MAN. EQ; existe JEFE BODEGA | Múltiples ED y cargo lógico sin ED. |
| `fin_compras` | POR RESOLVER | JEFE ADM. / JEFE MAN. EQ | Dos cargos ED. |
| `mant_operaciones` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD | Los ED actuales no representan de forma inequívoca la jefatura de mantención. |
| `mant_gerencial` | POR RESOLVER | JEFE ADM. / JEFE MAN. EQ | Dos cargos ED. |
| `mant_recursos` | POR RESOLVER | JEFE ADM. / JEFE MAN. EQ | Dos cargos ED. |
| `mant_documentos` | POR RESOLVER | JEFE ADM. / JEFE MAN. EQ | Dos cargos ED. |
| `mant_activos_estado` | POR RESOLVER | GERENTE / JEFE MAN. PLANTA / SUBGERENTE OP. | Tres cargos ED. |
| `mant_combustible_mina` | POR RESOLVER | JEFE MAN. PLANTA / JEFE PLANTA / JEFES DE TURNO PLANTA / SUBGERENTE OP. | Cuatro cargos ED. |
| `mant_evaluaciones_personal` | POR RESOLVER | GERENTE / JEFE MAN. PLANTA / JEFE PLANTA / SUBGERENTE OP. | Cuatro cargos ED. |
| `sos_tablero` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD | Dos cargos ED; existe JEFE SOSTENIBILIDAD activo. |
| `sos_medio_ambiente` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD | Dos cargos ED. |
| `sos_comunidades` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD | Dos cargos ED. |
| `sos_documentos` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD | Dos cargos ED. |
| `sos_calendario` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD | Dos cargos ED. |
| `hse_tablero` | POR RESOLVER | JEFE ADM. tiene ED; existen JEFE SOSTENIBILIDAD y PREVENCIONISTA en otros módulos HSE | Inconsistencia de gobernanza. |
| `hse_kpls` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD | Dos cargos ED. |
| `hse_epp` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD / PREVENCIONISTA | Tres cargos ED. |
| `hse_riesgos` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD / PREVENCIONISTA | Tres cargos ED. |
| `hse_documentos_extra` | POR RESOLVER | JEFE ADM. / JEFE SOSTENIBILIDAD | Dos cargos ED. |
| `hse_epp_diagnostico` | POR RESOLVER | GERENTE / JEFE MAN. PLANTA / JEFE SOSTENIBILIDAD | Tres cargos ED. |
| `hse_capacitaciones` | POR RESOLVER | 20 cargos ED | Es un permiso transversal, no una propiedad clara. |
| `hse_documentacion` | POR RESOLVER | 23 cargos ED | Es un permiso transversal, no una propiedad clara. |
| `hse_incidente` | POR RESOLVER | 20 cargos ED | Es un flujo transversal; falta dueño canónico explícito. |
| `hse_investigaciones` | POR RESOLVER | 20 cargos ED | Es un flujo transversal; falta dueño canónico explícito. |
| `contratos_solicitar_link` | POR RESOLVER | ASISTENTE TÉCNICO / JEFE ADM. / PREVENCIONISTA | Tres cargos ED. |
| `contratos_subir_info` | POR RESOLVER | ASISTENTE TÉCNICO / JEFE ADM. / JEFE RRHH / PREVENCIONISTA | Cuatro cargos ED. |
| `contratos_aprobar` | POR RESOLVER | ASISTENTE TÉCNICO / JEFE ADM. / PREVENCIONISTA | Tres cargos ED. |
| `contratos_autorizar` | POR RESOLVER | JEFE ADM. / PREVENCIONISTA | Dos cargos ED. |
| `contratos_visualizacion` | POR RESOLVER | ASISTENTE TÉCNICO / JEFE ADM. / PREVENCIONISTA | Tres cargos ED. |
| `rrhh_expediente` | POR RESOLVER | GERENTE / SUBGERENTE OP.; existe JEFE RRHH | Cargo JEFE RRHH existe pero no es ED aquí. |
| `core_desempeno` | POR RESOLVER | GERENTE / PRESIDENTE | Dos cargos ED; es un módulo transversal, no de una sola jefatura operacional. |

## Cargos existentes relevantes

- GERENTE
- GERENTE OPERACIONES
- SUBGERENTE OP.
- JEFE ADM.
- JEFE BODEGA
- JEFE GEÓLOGIA
- JEFE GEOLOGÍA EXPLO.
- JEFE ING.
- JEFE ING. PLA MINA
- JEFE MAN. EQ
- JEFE MAN. PLANTA
- JEFE MANT EQ. MINA
- JEFE MINA DON JAIME
- JEFE MINA PEUMO
- JEFE MINA SAN PEDRO
- JEFE PLANTA
- JEFE RRHH
- JEFE SONDAJE
- JEFE SOSTENIBILIDAD
- JEFES DE TURNO PLANTA
- PREVENCIONISTA
- ASISTENTE TÉCNICO
- PRESIDENTE

## Perfiles activos ya ligados a cargos de jefatura/gerencia

- Daniel Villarroel — GERENTE
- Pedro Pablo Zegers — GERENTE OPERACIONES
- Gustavo Vega — Jefe Departamento de Mantención
- Ariel Lopez — JEFE MAN. EQ
- M Astudillo — JEFE MAN. EQ
- Gonzalo Canales — JEFE SOSTENIBILIDAD

## Regla para los portales `Mi área`

Un portal sólo se habilita cuando:
1. el módulo tiene un cargo responsable confirmado;
2. el usuario activo tiene ese `cargo_id`;
3. el backend valida la misma responsabilidad;
4. los datos del portal provienen de fuentes canónicas del módulo;
5. `role_matrix` se trata como autorización, no como fuente única de propiedad.

## Próxima acción

Resolver primero las discrepancias de mayor impacto, sin cambiar permisos todavía:
1. Producción (`prod_operaciones` → revisar JEFE PLANTA)
2. Bodega (`bodega_inventario` → revisar JEFE BODEGA)
3. Mantención (`mant_operaciones` → revisar jefaturas de mantención existentes)
4. RRHH (`rrhh_expediente` → revisar JEFE RRHH)
5. HSE (`hse_tablero` → definir entre cargos existentes, no crear uno nuevo)
6. Sostenibilidad (`sos_tablero` → revisar JEFE SOSTENIBILIDAD)
