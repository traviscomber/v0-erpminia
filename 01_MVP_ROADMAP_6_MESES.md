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
La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, planes preventivos, Equipo/Proveedor/Producto 360, centro ejecutivo de decisiones, aislamiento por organizacion, QA de lanzamiento, bandeja personal de acciones, reglas seguras de aviso, planificacion de recursos, operacion personal de terreno, entrega de turno trazable, auditoria operacional referenciada, conciliacion humana de calidad de datos, telemetria operacional conectada a mantenimiento, campañas/paradas mayores trazables, analisis de confiabilidad basado en fallas observadas, control de repuestos criticos/obsolescencia con aprobacion humana y BOM tecnica aprobada por equipo/componente/repuesto.

## Bloques 10 a 19
Todos completados: compras inteligentes, Proveedor 360, inventario canonico, Equipo 360, mantenimiento preventivo, centro ejecutivo, seguridad organizacional, QA, acciones personales y automatizaciones seguras.

---

## Bloque 20 — Planificacion avanzada y recursos
Estado: **Completado**

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

## Bloque 27 — Confiabilidad y fallas repetitivas
Estado: **Completado**

## Bloque 28 — Repuestos criticos y obsolescencia
Estado: **Completado**

## Bloque 29 — BOM tecnica y repuestos por equipo
Estado: **Completado**
1. Relaciones equipo-componente-repuesto creadas solo mediante referencia canónica y propuesta explícita.
2. Vista “Dónde se usa” construida exclusivamente desde líneas BOM aprobadas.
3. Contexto operacional conectado con requerimientos de OT, instalaciones registradas, preventivos del equipo, campañas y stock crítico existente.

Entrega tecnica:
- `equipment_technical_bom_lines`;
- `/api/maintenance/technical-bom`;
- `/dashboard/mantenimiento/bom`;
- acceso desde la navegacion de Mantenimiento.

Regla de integridad:
- cada línea BOM referencia un equipo y producto canónicos existentes;
- componente, cantidad, fundamento y evidencia quedan trazables;
- una relación propuesta no se considera parte de la BOM hasta aprobación explícita;
- no se infieren compatibilidades por nombre, familia, modelo o similitud textual;
- la BOM no copia OT, preventivos, campañas ni stock: solo muestra su relación operacional existente.

## Bloque 30 — Planes estandar de trabajo y kits de mantenimiento
Estado: **Siguiente**
1. Definir tareas estandar aprobadas por tipo de intervención/equipo sin reemplazar las OT reales.
2. Asociar mano de obra esperada, BOM aprobada, documentos y controles necesarios a cada plan.
3. Preparar una OT o preventivo desde un plan estándar mediante copia controlada y trazable de requerimientos, nunca mediante datos inventados.

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
**Bloque 30 — Planes estandar de trabajo y kits de mantenimiento.**
