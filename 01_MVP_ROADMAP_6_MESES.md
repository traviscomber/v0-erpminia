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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo, estrategia de mantenimiento por criticidad y ciclo de vida de activos.

## Bloques 10 a 31
Estado: **Completados**

## Bloque 32 — Ciclo de vida y renovación de activos
Estado: **Completado**
1. Cada equipo reúne evidencia real de OT, correctivos, downtime, costos, repuestos instalados, preventivos y estrategia aprobada.
2. Fecha de adquisición, costo de adquisición y vida útil esperada solo se usan cuando existen explícitamente en la fuente canónica del activo.
3. Las decisiones mantener, reparar, reconstruir, reemplazar o retirar se registran como propuestas aprobables con fundamento y referencia de evidencia.

Entrega tecnica:
- `maintenance_asset_lifecycle_decisions`;
- `/api/maintenance/asset-lifecycle`;
- `/dashboard/mantenimiento/ciclo-vida`;
- brechas explícitas de evidencia para decisiones de renovación.

Regla de integridad:
- Motil no calcula automáticamente una decisión de reemplazo o retiro;
- no se inventa antigüedad, vida útil, costo ni fecha de origen;
- la ausencia de historial, costos, estrategia o fecha verificable se muestra como brecha;
- solo una decisión propuesta/aprobada permanece activa por equipo;
- toda decisión aprobada conserva fundamento, evidencia, autor y fecha.

## Bloque 33 — Planificación de inversión para renovación de activos
Estado: **Siguiente**
1. Convertir decisiones aprobadas de reconstrucción o reemplazo en necesidades de inversión trazables, sin crear presupuestos automáticos.
2. Relacionar cada necesidad con centro de costo, activo, decisión de ciclo de vida y monto objetivo solo cuando sea ingresado o provenga de evidencia canónica.
3. Comparar necesidades aprobadas con presupuesto disponible registrado y mostrar brechas de financiamiento sin inventar CAPEX, cotizaciones ni fechas.

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
**Bloque 33 — Planificación de inversión para renovación de activos.**
