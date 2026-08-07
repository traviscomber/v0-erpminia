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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo, estrategia de mantenimiento por criticidad, ciclo de vida de activos, planificacion y ejecucion de renovacion, puesta en servicio, validacion post-puesta en servicio, gobernanza de cartera, retroalimentacion verificada, propuestas controladas, aplicacion transaccional, verificacion posterior de integridad y seguimiento gobernado de excepciones.

## Bloques 10 a 38
Estado: **Completados**

Reglas permanentes: fuente canonica unica, aislamiento por organizacion, datos reales, aprobacion humana para cambios consecuenciales, trazabilidad de relaciones y prohibicion de convertir ausencia de datos en conclusiones positivas, ahorro, ROI o beneficio.

## Bloque 39 — Aplicacion controlada de retroalimentacion aceptada
Estado: **Completado**
- Solo feedback `accepted` inicia una propuesta operacional.
- El activo se hereda de la retroalimentacion y el destino preventivo debe pertenecer al mismo activo.
- Crear la propuesta no altera ninguna fuente vigente.
- Una retroalimentacion no puede tener mas de una aplicacion activa.

Entrega: `maintenance_feedback_change_proposals`, `/api/maintenance/feedback-change-proposals`, `/dashboard/mantenimiento/aplicacion-retroalimentacion`.

## Bloque 40 — Aprobacion y aplicacion transaccional de cambios
Estado: **Completado**
1. Aprobar o rechazar una propuesta requiere decision humana y nota explicita.
2. Solo una propuesta `approved` puede aplicarse.
3. La aplicacion ocurre dentro de `apply_maintenance_feedback_change`, bloqueando la propuesta y el registro destino durante la transaccion.
4. Estrategia y ciclo de vida preservan historial; preventivos actualizan exclusivamente el registro validado.
5. Cada aplicacion conserva `before_snapshot`, `after_snapshot`, `result_record_id`, actor y fecha.
6. La propuesta cambia a `applied` solo cuando la fuente operacional fue modificada exitosamente.

## Bloque 41 — Auditoria y verificacion posterior de cambios aplicados
Estado: **Completado**
1. Solo propuestas `applied` entran a verificacion posterior.
2. Se compara el `after_snapshot` contra el registro operacional vigente asociado por `result_record_id`.
3. Motil diferencia coincidencia, divergencia, destino ausente y aplicacion incompleta sin interpretar coincidencias como mejora.
4. Una persona cierra la verificacion como `verified`, `diverged` o `needs_follow_up`, siempre con nota explicita.
5. Cerrar una verificacion no modifica estrategia, preventivo, ciclo de vida ni la propuesta aplicada.

Entrega: `maintenance_feedback_change_verifications`, `/api/maintenance/feedback-change-verifications`, `/dashboard/mantenimiento/verificacion-retroalimentacion`.

## Bloque 42 — Gobernanza de excepciones y seguimiento derivado
Estado: **Completado**
1. Solo verificaciones cerradas `diverged` o `needs_follow_up` pueden originar acciones de seguimiento.
2. Cada seguimiento conserva la relacion con verificacion, propuesta aplicada y activo canonico.
3. El tipo de accion es explicito: investigacion, recoleccion de evidencia, revision de nuevo cambio o revision de rollback.
4. Responsable y fecha objetivo son obligatorios y deben provenir de una persona real de la misma organizacion y una fecha ingresada por una persona.
5. Una verificacion no puede tener dos acciones abiertas del mismo tipo.
6. Cerrar una accion exige nota y referencia de evidencia real; cancelar exige nota explicita.
7. Crear, cerrar o cancelar una accion no modifica la fuente operacional, no ejecuta rollback y no crea automaticamente una nueva propuesta de cambio.
8. La verificacion de origen permanece inmutable y auditable.

Entrega tecnica:
- `maintenance_feedback_exception_followups`;
- `/api/maintenance/feedback-exception-followups`;
- `/dashboard/mantenimiento/seguimiento-excepciones`;
- acceso desde navegacion de Mantenimiento;
- control de responsable, fecha objetivo, evidencia y cierre humano.

Regla de integridad:
- no existe seguimiento sin una verificacion elegible;
- responsable y fecha no se infieren ni se completan automaticamente;
- rollback y nuevo cambio son revisiones, no ejecuciones automaticas;
- evidencia de cierre no reescribe la verificacion original;
- cero verificaciones elegibles produce cero seguimientos, nunca datos demo.

## Bloque 43 — Escalamiento de excepciones recurrentes y decisiones derivadas
Estado: **Siguiente**
1. Detectar recurrencia solo a partir de verificaciones y seguimientos reales del mismo activo y tipo de destino.
2. Exponer recurrencias y seguimientos vencidos sin crear severidad, causa raiz o impacto no demostrados.
3. Permitir escalamiento humano con responsable y fundamento explicitos.
4. Vincular cualquier nueva propuesta operacional al historial que justifica el escalamiento sin ejecutar cambios automaticamente.
5. Mantener separados seguimiento, escalamiento, decision y aplicacion.

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
**Bloque 43 — Escalamiento de excepciones recurrentes y decisiones derivadas.**
