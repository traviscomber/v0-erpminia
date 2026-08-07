# Roadmap Operacional Canonico de Motil

## Objetivo
Construir Motil como un sistema operacional conectado, basado en informacion canonica y relaciones reales entre equipos, ordenes de trabajo, inventario, compras, proveedores, documentos, personas y costos.

Principios:
- una sola fuente de verdad por entidad;
- ninguna duplicacion de registros;
- cada pantalla muestra relaciones del mismo modelo operacional;
- cada bloque debe cerrar un circuito funcional completo;
- no se agregan funciones teoricas sin uso operacional verificable;
- ningun informe, alerta o automatizacion puede inventar informacion ausente.

## Estado actual
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo, estrategia de mantenimiento por criticidad, ciclo de vida de activos, planificacion y ejecucion de renovacion, puesta en servicio, validacion post-puesta en servicio, gobernanza de cartera, retroalimentacion verificada y aplicacion controlada de retroalimentacion aceptada.

## Bloques 10 a 38
Estado: **Completados**

Los bloques 10 a 38 mantienen como reglas permanentes: fuente canonica unica, aislamiento por organizacion, datos reales, aprobacion humana para cambios consecuenciales, trazabilidad de relaciones y prohibicion de convertir ausencia de datos en conclusiones positivas, ahorro, ROI o beneficio.

## Bloque 39 — Aplicacion controlada de retroalimentacion aceptada
Estado: **Completado**
1. Solo una retroalimentacion `accepted` puede iniciar una propuesta operacional.
2. La propuesta queda separada de la fuente vigente y conserva `feedback_id`, activo canonico, tipo de destino, payload propuesto, fundamento y evidencia.
3. Estrategia solo acepta valores compatibles con el modelo vigente de criticidad y estrategia.
4. Frecuencia preventiva exige seleccionar un preventivo habilitado del mismo activo y una frecuencia valida en dias y/o horas.
5. Ciclo de vida solo acepta decisiones compatibles con el modelo vigente y una fecha objetivo explicita cuando corresponda.
6. Una retroalimentacion no puede tener mas de una aplicacion activa.
7. Crear la propuesta no altera `maintenance_asset_strategies`, `preventive_maintenance_schedules` ni `maintenance_asset_lifecycle_decisions`.

Entrega tecnica:
- `maintenance_feedback_change_proposals`;
- `/api/maintenance/feedback-change-proposals`;
- `/dashboard/mantenimiento/aplicacion-retroalimentacion`;
- acceso desde navegacion de Mantenimiento;
- RLS y acceso servidor sobre la nueva tabla.

Regla de integridad:
- feedback aceptada y propuesta operacional son estados distintos;
- el activo se hereda de la retroalimentacion y no se elige libremente;
- un preventivo destino debe pertenecer al mismo activo;
- no se sobrescribe ninguna decision previa al crear una propuesta;
- cero feedback aceptada produce cero propuestas, nunca datos demo.

## Bloque 40 — Aprobacion y aplicacion transaccional de cambios
Estado: **Siguiente**
1. Aprobar o rechazar una propuesta operacional mediante decision humana explicita.
2. Aplicar solo propuestas aprobadas y en una operacion transaccional que preserve el estado anterior.
3. Para estrategia y ciclo de vida, conservar historial e inactivar el registro vigente solo al crear el nuevo registro aprobado.
4. Para preventivos, actualizar exclusivamente el registro destino validado y conservar snapshot antes/despues en la propuesta.
5. Marcar la propuesta `applied` solo si la fuente operacional fue modificada exitosamente y registrar `result_record_id`, actor y fecha.
6. Impedir reaplicaciones e inconsistencias entre organizacion, activo y destino.

## Bloque 41 — Auditoria y verificacion posterior de cambios aplicados
Estado: **Planificado**
1. Consolidar propuesta, aprobacion, aplicacion y fuente resultante en una vista auditable.
2. Exponer antes/despues desde snapshots reales sin reinterpretar el resultado como mejora.
3. Detectar aplicaciones incompletas, destinos ausentes o divergencias entre propuesta aplicada y fuente vigente.
4. Permitir cierre humano de la verificacion posterior sin modificar automaticamente la estrategia, preventivo o ciclo de vida.

---

# Regla de desarrollo y entrega
Cada bloque se ejecuta con el siguiente proceso obligatorio:
1. Actualizar este roadmap al iniciar o cerrar el bloque.
2. Crear una rama especifica desde `main` estable.
3. Implementar solo relaciones y datos canonicos validados.
4. No usar datos ficticios, simulados o paralelos.
5. Validar compilacion, tipos, rutas y flujo funcional.
6. Abrir un Pull Request con alcance, impacto y pruebas.
7. Corregir regresiones antes del merge.
8. Fusionar el PR a `main`.
9. Confirmar el commit final y el deployment estable.
10. Marcar el bloque completado y listar el siguiente.

## Prioridad inmediata
**Bloque 40 — Aprobacion y aplicacion transaccional de cambios.**
