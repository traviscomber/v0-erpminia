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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica y planes estandar de trabajo.

## Bloques 10 a 29
Estado: **Completados**

## Bloque 30 — Planes estandar de trabajo y kits de mantenimiento
Estado: **Completado**
1. Planes estándar propuestos/aprobados por tipo de intervención y, opcionalmente, equipo exacto.
2. Pasos, duración, personas, competencia, controles, documentación y materiales canónicos asociados explícitamente.
3. Aplicación controlada a OT o preventivo. Al generarse una OT desde un preventivo vinculado, el plan aprobado se aplica y solo crea requerimientos de material faltantes.

Entrega tecnica:
- `maintenance_standard_job_plans`;
- `maintenance_standard_job_plan_steps`;
- `maintenance_standard_job_plan_materials`;
- `maintenance_standard_job_plan_applications`;
- `/api/maintenance/standard-job-plans`;
- `/dashboard/mantenimiento/planes-estandar`;
- integración con generación de OT desde preventivo.

Regla de integridad:
- ningún plan entra en operación antes de aprobación;
- materiales deben ser productos canónicos existentes;
- una línea BOM indicada debe estar aprobada y corresponder al producto/equipo;
- aplicar un plan no reemplaza cantidades ya registradas en una OT;
- la generación desde preventivo conserva la relación con el mismo plan aprobado.

## Bloque 31 — Estrategia de mantenimiento por criticidad
Estado: **Siguiente**
1. Clasificar equipos por criticidad usando datos registrados y criterios explícitos.
2. Asociar estrategia permitida: preventiva, predictiva, inspección o run-to-failure cuando corresponda.
3. Verificar cobertura: equipo crítico sin preventivo, BOM, repuesto crítico o plan estándar aprobado debe aparecer como brecha, no como recomendación inventada.

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
**Bloque 31 — Estrategia de mantenimiento por criticidad.**
