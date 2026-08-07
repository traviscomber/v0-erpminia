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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo, estrategia de mantenimiento por criticidad, ciclo de vida de activos, planificacion y ejecucion de renovacion, puesta en servicio, validacion post-puesta en servicio, gobernanza de cartera, retroalimentacion verificada, propuestas controladas, aplicacion transaccional de cambios aprobados y verificacion posterior de integridad.

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
4. Estrategia y ciclo de vida preservan historial: el registro vigente se inactiva en la misma transaccion que crea el nuevo registro aprobado.
5. Preventivos actualizan exclusivamente el registro destino validado del mismo activo.
6. Cada aplicacion conserva `before_snapshot`, `after_snapshot`, `result_record_id`, actor y fecha.
7. La propuesta cambia a `applied` solo cuando la fuente operacional fue modificada exitosamente; una falla revierte toda la operacion.

Entrega tecnica:
- columnas `before_snapshot` y `after_snapshot`;
- funcion transaccional `apply_maintenance_feedback_change`;
- `/api/maintenance/feedback-change-proposals/decision`;
- `/dashboard/mantenimiento/aprobacion-retroalimentacion`;
- acceso desde navegacion de Mantenimiento.

Regla de integridad:
- aprobacion y aplicacion son pasos distintos;
- no existe aplicacion parcial;
- una propuesta aplicada no puede reaplicarse;
- la organizacion, activo y destino se revalidan al aplicar;
- el historial anterior permanece disponible.

## Bloque 41 — Auditoria y verificacion posterior de cambios aplicados
Estado: **Completado**
1. Solo propuestas `applied` entran a verificacion posterior.
2. La verificacion compara el `after_snapshot` registrado durante la aplicacion contra el registro operacional vigente asociado por `result_record_id`.
3. Para estrategia se verifican criticidad, estrategia y estado; para ciclo de vida decision, fecha objetivo y estado; para preventivos frecuencias y habilitacion.
4. Motil diferencia coincidencia, divergencia, destino ausente y aplicacion incompleta sin interpretar ninguna coincidencia como mejora de desempeno.
5. La interfaz expone snapshot anterior, snapshot aplicado y fuente vigente para auditoria directa.
6. Una persona cierra la verificacion como `verified`, `diverged` o `needs_follow_up`, siempre con nota explicita.
7. Al cerrar se conserva un `observed_snapshot`, actor y fecha independientes de la fuente operacional.
8. Cerrar una verificacion no modifica estrategia, preventivo, ciclo de vida ni la propuesta aplicada.

Entrega tecnica:
- `maintenance_feedback_change_verifications`;
- `/api/maintenance/feedback-change-verifications`;
- `/dashboard/mantenimiento/verificacion-retroalimentacion`;
- acceso desde navegacion de Mantenimiento;
- deteccion de divergencias por campos relevantes del destino.

Regla de integridad:
- una aplicacion puede tener una sola verificacion cerrada activa;
- la fuente vigente se lee en tiempo real y no se reconstruye desde el snapshot;
- ausencia del destino se informa como brecha, no como eliminacion valida;
- una coincidencia confirma integridad de aplicacion, no efectividad, ahorro ni mejora operacional;
- cero cambios aplicados produce cero verificaciones, nunca datos demo.

## Bloque 42 — Gobernanza de excepciones y seguimiento derivado
Estado: **Siguiente**
1. Permitir acciones de seguimiento solo desde verificaciones cerradas `diverged` o `needs_follow_up`.
2. Conservar relacion explicita entre verificacion, propuesta aplicada, activo y accion derivada.
3. Asignar responsable y fecha objetivo usando entidades reales disponibles; no inventar propietarios ni plazos.
4. Mantener cualquier rollback o nuevo cambio como una decision humana separada, nunca automatica.
5. Cerrar el seguimiento con evidencia real y sin alterar retrospectivamente la verificacion que lo origino.

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
**Bloque 42 — Gobernanza de excepciones y seguimiento derivado.**
