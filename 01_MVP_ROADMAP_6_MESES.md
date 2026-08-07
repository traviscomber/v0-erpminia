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
La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, planes preventivos, Equipo/Proveedor/Producto 360, centro ejecutivo de decisiones, aislamiento por organizacion, QA de lanzamiento, bandeja personal de acciones, reglas seguras de aviso, planificacion de recursos, operacion personal de terreno, entrega de turno trazable, auditoria operacional referenciada, conciliacion humana de calidad de datos, telemetria operacional conectada a mantenimiento, campañas/paradas mayores trazables y analisis de confiabilidad basado en fallas observadas.

## Bloques 10 a 19
Todos completados: compras inteligentes, Proveedor 360, inventario canonico, Equipo 360, mantenimiento preventivo, centro ejecutivo, seguridad organizacional, QA, acciones personales y automatizaciones seguras.

---

## Bloque 20 — Planificacion avanzada y recursos
Estado: **Completado**
1. Carga real desde OT y preventivos.
2. Ventanas de personas/equipos y conflictos antes de programar.
3. Programacion escrita directamente sobre la OT canonica.

## Bloque 21 — Operacion movil de terreno
Estado: **Completado**

## Bloque 22 — Entrega de turno y continuidad operacional
Estado: **Completado**

## Bloque 23 — Centro de cumplimiento y auditoria operacional
Estado: **Completado**

## Bloque 24 — Calidad de datos maestros y conciliacion
Estado: **Completado**

## Bloque 25 — Telemetria operacional conectada a mantenimiento
Estado: **Completado**

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

## Bloque 27 — Confiabilidad y fallas repetitivas
Estado: **Completado**
1. Recurrencias identificadas exclusivamente desde OT correctivas asociadas a equipos registrados.
2. Priorizacion por frecuencia, horas de detencion y costo real; MTBF observado solo cuando existen eventos consecutivos suficientes.
3. Causas raiz y componentes repetidos se muestran unicamente cuando fueron registrados explicitamente; no se infieren diagnosticos ni probabilidades.

Entrega tecnica:
- `/api/maintenance/reliability`;
- `/dashboard/mantenimiento/confiabilidad`;
- acceso desde la navegacion de Mantenimiento.

Regla de integridad:
- una recurrencia significa repeticion observada, no prediccion de falla;
- MTBF observado se calcula desde fechas de OT correctivas consecutivas y no reemplaza mediciones registradas;
- causas raiz ausentes permanecen como ausentes;
- componentes solo entran al analisis cuando existe instalacion registrada en `work_order_parts`;
- costos provienen de `work_order_cost_summary`.

## Bloque 28 — Repuestos criticos y obsolescencia
Estado: **Siguiente**
1. Identificar repuestos con demanda real desde OT, stock, movimientos y compras historicas.
2. Priorizar faltantes y riesgo operacional por consumo, disponibilidad, tiempo de reposicion registrado y equipos afectados.
3. Gestionar sustituciones u obsolescencia solo mediante relaciones aprobadas, sin inventar equivalencias tecnicas.

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
**Bloque 28 — Repuestos criticos y obsolescencia.**
