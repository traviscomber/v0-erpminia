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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo, estrategia de mantenimiento por criticidad, ciclo de vida de activos, planificacion de inversion para renovacion, ejecucion trazable de renovacion, puesta en servicio/cierre de renovacion y validacion post-puesta en servicio.

## Bloques 10 a 35
Estado: **Completados**

## Bloque 36 — Validación post-puesta en servicio y desempeño de renovación
Estado: **Completado**
1. Solo cierres de renovación aprobados pueden entrar a validación post-puesta en servicio.
2. La comparación exige una fecha de puesta en servicio explícita y períodos base/posterior ingresados por una persona; Motil no inventa ventanas de análisis.
3. Se comparan únicamente registros existentes de OT, costos de OT, downtime, OT preventivas y telemetría vinculables al activo canónico.
4. Para OT históricas sin `canonical_asset_id`, Motil usa únicamente la relación existente en `canonical.asset_reconciliation`; no reescribe ni corrige automáticamente el histórico.
5. Para reemplazos efectivos, el período base corresponde al activo anterior y el período posterior al activo de reemplazo ya registrado.
6. Motil normaliza conteos y costos por 30 días cuando las ventanas tienen distinta duración, pero no interpreta automáticamente una variación como mejora, ahorro o éxito.
7. La conclusión es humana y trazable: satisfactoria, requiere seguimiento o evidencia insuficiente.
8. Un resultado satisfactorio no puede aprobarse sin al menos una fuente con registros comparables en ambos períodos.
9. Al aprobar, se conserva un snapshot de la evidencia observada para auditoría sin modificar OT, activos, telemetría, preventivos ni datos canónicos.

Entrega tecnica:
- `asset_renewal_post_commissioning_validations`;
- `/api/maintenance/renewal-post-validation`;
- `/dashboard/mantenimiento/validacion-renovacion`;
- comparación explícita antes/después por ventanas definidas;
- soporte para `canonical.asset_reconciliation` como fallback validado de OT históricas;
- snapshot de evidencia al aprobar la validación.

Regla de integridad:
- la validación no existe sin un cierre aprobado;
- la fecha de puesta en servicio no se infiere desde la fecha de aprobación;
- el período base debe terminar antes de la puesta en servicio y el período posterior no puede comenzar antes de ella;
- ninguna ventana puede incluir fechas futuras;
- el historial del activo anterior y del reemplazo permanece separado;
- cero registros se muestra como cero registros, no como ausencia de fallas;
- downtime y telemetría solo se consideran comparables cuando existen registros en ambos períodos;
- los preventivos actuales se muestran como contexto y no como evidencia histórica si no existe historial comparable;
- aprobar una validación no altera ninguna fuente operacional.

## Bloque 37 — Gobernanza de cartera de renovación y resultados verificados
Estado: **En progreso**
1. Consolidar cada necesidad de inversión aprobada con su ejecución, cierre y validación existentes, conservando la trazabilidad por activo y centro de costo.
2. Clasificar la cartera en resultado validado, seguimiento requerido, evidencia pendiente y aún sin validación, sin inventar estados intermedios.
3. Mostrar por separado inversión objetivo, compromiso por OC, compromiso contractual, pagos contractuales y costo real de OT; estas fuentes no se suman entre sí como si fueran una sola ejecución financiera.
4. Mantener visibles las brechas de evidencia y de proceso: sin iniciativa, ejecución incompleta, sin cierre aprobado, sin fecha de puesta en servicio, validación propuesta o evidencia insuficiente.
5. Permitir revisión ejecutiva por centro de costo y activo sin convertir variaciones observadas en ahorros, beneficios o ROI no demostrado.
6. La gobernanza es una vista de lectura sobre registros existentes; no duplica necesidades, iniciativas, cierres, validaciones ni datos financieros.

Criterio de cierre:
- cartera consultable desde Mantenimiento;
- resumen por centro de costo con métricas financieras separadas por fuente;
- estado verificable por cada renovación;
- filtros de resultado y búsqueda por activo/centro de costo;
- cero datos simulados o sembrados para demostrar la pantalla;
- build y deployment verificados antes de fusionar a `main`.

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
**Bloque 37 — Gobernanza de cartera de renovación y resultados verificados.**
