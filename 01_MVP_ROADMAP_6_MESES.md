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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo y estrategia de mantenimiento por criticidad.

## Bloques 10 a 30
Estado: **Completados**

## Bloque 31 — Estrategia de mantenimiento por criticidad
Estado: **Completado**
1. La criticidad y la estrategia se registran como decisiones explícitas por equipo canónico, con fundamento, evidencia, propuesta y aprobación.
2. Las estrategias permitidas son preventiva, predictiva, inspección y run-to-failure; Motil no asigna una estrategia automáticamente.
3. La cobertura de equipos críticos y de alta criticidad se verifica contra preventivos activos, BOM técnica aprobada, repuestos críticos vinculados por BOM, planes estándar aprobados y telemetría cuando la estrategia es predictiva.

Entrega tecnica:
- `maintenance_asset_strategies`;
- `/api/maintenance/asset-strategies`;
- `/dashboard/mantenimiento/estrategia`;
- evaluación de brechas basada exclusivamente en relaciones operacionales existentes.

Regla de integridad:
- ninguna criticidad o estrategia se infiere por nombre, tipo, historial o scoring opaco;
- solo una estrategia propuesta/aprobada puede permanecer activa por equipo;
- una brecha expresa ausencia de cobertura verificable, no una recomendación inventada;
- un repuesto cuenta como cobertura únicamente cuando está relacionado mediante BOM aprobada y existe evidencia operacional registrada en el módulo de repuestos críticos;
- una estrategia predictiva sin telemetría vinculada se muestra como brecha explícita.

## Bloque 32 — Ciclo de vida y renovación de activos
Estado: **Siguiente**
1. Reunir por equipo la evidencia real de fallas, OT, costos, mantenimientos, criticidad, repuestos y antigüedad solo cuando exista una fecha registrada y verificable.
2. Registrar decisiones de mantener, reparar, reconstruir, reemplazar o retirar como propuestas aprobables; Motil no calculará reemplazos automáticos ni inventará vida útil.
3. Mostrar brechas de evidencia para decisiones de renovación y conservar trazabilidad entre la decisión, sus fuentes y el activo canónico.

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
**Bloque 32 — Ciclo de vida y renovación de activos.**
