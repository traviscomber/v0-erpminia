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
La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, planes preventivos, Equipo/Proveedor/Producto 360, centro ejecutivo de decisiones, aislamiento por organizacion, QA de lanzamiento, bandeja personal de acciones, reglas seguras de aviso, planificacion de recursos, operacion personal de terreno, entrega de turno trazable, auditoria operacional referenciada, conciliacion humana de calidad de datos, telemetria operacional conectada a mantenimiento y campañas/paradas mayores trazables.

## Bloques 10 a 19
Todos completados: compras inteligentes, Proveedor 360, inventario canonico, Equipo 360, mantenimiento preventivo, centro ejecutivo, seguridad organizacional, QA, acciones personales y automatizaciones seguras.

---

## Bloque 20 — Planificacion avanzada y recursos
Estado: **Completado**
1. Carga real desde OT y preventivos.
2. Ventanas de personas/equipos y conflictos antes de programar.
3. Programacion escrita directamente sobre la OT canonica.

Entrega tecnica:
- `maintenance_resource_windows`;
- `/api/planning/maintenance`;
- `/dashboard/planificacion-recursos`.

## Bloque 21 — Operacion movil de terreno
Estado: **Completado**
1. OT asignadas a la persona vinculada al usuario autenticado.
2. Inicio, notas y mano de obra sobre registros existentes.
3. Repuestos, historial y cierre mantenidos en la OT canonica.

Entrega tecnica:
- `/api/field/work-orders`;
- `/dashboard/terreno`.

## Bloque 22 — Entrega de turno y continuidad operacional
Estado: **Completado**
1. Entrega referenciada a personas, OT y equipos reales.
2. Pendiente y riesgo explicitos sin copiar el estado operacional.
3. Recepcion confirmada solo por el siguiente responsable.

Entrega tecnica:
- `operational_shift_handovers`;
- `/api/operations/handovers`;
- `/dashboard/entrega-turno`.

## Bloque 23 — Centro de cumplimiento y auditoria operacional
Estado: **Completado**
1. Revisiones sobre OT, preventivos, registros documentales de mantenimiento y ejecuciones de automatizacion con pertenencia organizacional verificable.
2. Hallazgos referenciados con criterio, severidad, responsable y fuente.
3. Cierre con resolucion y evidencia explicitas sin modificar automaticamente el registro fuente.

Entrega tecnica:
- `operational_audit_findings`;
- `/api/audit/operational`;
- `/dashboard/auditoria-operacional`.

## Bloque 24 — Calidad de datos maestros y conciliacion
Estado: **Completado**
1. Deteccion dinamica de campos incompletos, duplicados candidatos, referencias huerfanas y cantidades inconsistentes sobre fuentes reales.
2. Cola de conciliacion con decision humana, fundamento y evidencia, sin fusion automatica destructiva.
3. Indicadores de calidad derivados de productos, proveedores, equipos, personas, inventario y OT de la organizacion activa.

Entrega tecnica:
- `data_reconciliation_reviews` de acceso servidor;
- `/api/data-quality/reconciliation`;
- `/dashboard/calidad-datos`.

Regla de integridad:
- una revision registra la decision humana y su evidencia;
- el Centro de Conciliacion no modifica automaticamente productos, proveedores, equipos, personas, inventario ni OT;
- incidencias que dejan de existir en la fuente se conservan como historial de revision.

## Bloque 25 — Telemetria operacional conectada a mantenimiento
Estado: **Completado**
1. Vinculacion explicita de equipos y sensores existentes con equipos canonicos de la organizacion.
2. Condiciones operacionales creadas solo cuando una lectura real supera un umbral configurado en el sensor.
3. Vinculacion de cada condicion con planes preventivos u OT del mismo equipo y creacion controlada de OT predictiva cuando el usuario lo decide.

Entrega tecnica:
- `organization_id` y `canonical_asset_id` agregados a sensores y lecturas;
- `telemetry_asset_links`;
- `telemetry_condition_events`;
- `/api/telemetry/ingest` corregido para el esquema real;
- `/api/telemetry/maintenance`;
- `/dashboard/telemetria/mantenimiento`;
- `/dashboard/telemetria/integracion` sin lecturas simuladas.

Regla de integridad:
- el gateway identifica un sensor real y entrega solamente la lectura observada;
- la severidad y condicion se calculan desde umbrales registrados en Motil, no desde declaraciones del origen;
- un equipo debe estar vinculado explicitamente a un equipo canonico antes de aceptar sus lecturas;
- una condicion no constituye diagnostico ni causa raiz;
- la generacion de una OT requiere una accion explicita del usuario.

## Bloque 26 — Paradas mayores y campañas de mantenimiento
Estado: **Completado**
1. Agrupacion de OT existentes bajo una parada o campaña mediante relaciones, sin copiar ni recrear las OT.
2. Plan de fechas y dependencias de campaña conectado a responsables, equipos, ventanas de disponibilidad y requerimientos de materiales existentes.
3. Avance, bloqueos, faltantes y costo real calculados desde estados y costos operacionales de las OT vinculadas.

Entrega tecnica:
- `maintenance_campaigns`;
- `maintenance_campaign_work_orders`;
- `maintenance_campaign_dependencies`;
- `/api/maintenance/campaigns`;
- `/dashboard/mantenimiento/campanas`.

Regla de integridad:
- una OT sigue teniendo una sola identidad operacional y la campaña solo la referencia;
- una OT no puede incorporarse a dos campañas activas al mismo tiempo;
- las dependencias solo pueden relacionar OT de la misma campaña y se rechazan ciclos;
- los conflictos de recursos se comprueban contra ventanas reales existentes;
- los faltantes provienen de `work_order_material_requirements` y el costo de `work_order_cost_summary`;
- no se crean costos, materiales, avances ni bloqueos simulados.

## Bloque 27 — Confiabilidad y fallas repetitivas
Estado: **Siguiente**
1. Identificar recurrencias exclusivamente desde OT, eventos, tiempos detenidos, componentes y causas registradas.
2. Priorizar equipos y componentes por frecuencia, indisponibilidad y costo real.
3. Vincular acciones de confiabilidad a OT o preventivos existentes sin inventar diagnosticos ni probabilidades.

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
**Bloque 27 — Confiabilidad y fallas repetitivas.**
