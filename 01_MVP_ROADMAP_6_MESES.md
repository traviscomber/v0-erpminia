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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo, estrategia de mantenimiento por criticidad, ciclo de vida de activos, planificacion de inversion para renovacion, ejecucion trazable de renovacion, puesta en servicio/cierre de renovacion, validacion post-puesta en servicio, gobernanza ejecutiva de la cartera de renovacion y retroalimentacion verificada hacia estrategia y ciclo de vida.

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
Estado: **Completado**
1. Cada necesidad de inversión aprobada se consolida con su ejecución, cierre y validación existentes, conservando trazabilidad por activo y centro de costo.
2. La cartera diferencia resultado validado, seguimiento requerido, evidencia pendiente y aún sin validación sin crear estados financieros o técnicos ficticios.
3. Inversión objetivo, compromiso por OC, compromiso contractual, pagos contractuales y costo real de OT permanecen como fuentes separadas; Motil no las suma como si representaran una sola ejecución financiera.
4. Las referencias de OC, contratos y OT se deduplican dentro de cada centro de costo antes de agregarse dentro de su propia fuente.
5. Las brechas de proceso y evidencia permanecen visibles: sin iniciativa, ejecución incompleta, sin cierre, cierre pendiente, sin fecha de puesta en servicio, sin validación, validación propuesta o evidencia insuficiente.
6. La vista ejecutiva permite filtrar por resultado y buscar por activo o centro de costo sin convertir variaciones observadas en ahorro, beneficio o ROI.
7. La gobernanza es solo lectura sobre registros existentes; no duplica ni modifica necesidades, iniciativas, cierres, validaciones, activos ni fuentes financieras.

Entrega tecnica:
- `/api/maintenance/renewal-portfolio`;
- `/dashboard/mantenimiento/cartera-renovacion`;
- resumen ejecutivo por centro de costo;
- estado verificable por renovación;
- métricas financieras separadas por fuente;
- acceso desde Mantenimiento.

Regla de integridad:
- la cartera parte únicamente de necesidades de inversión aprobadas;
- ningún monto de OC, contrato, pago contractual o costo de OT se interpreta automáticamente como equivalente a otro;
- no se calcula ahorro, ROI ni beneficio financiero sin una fuente explícita que lo demuestre;
- cero renovaciones aprobadas produce una cartera vacía, no datos de demostración;
- este bloque no introduce tablas ni datos paralelos.

## Bloque 38 — Retroalimentación verificada a estrategia y ciclo de vida
Estado: **Completado**
1. Solo validaciones post-puesta en servicio aprobadas pueden originar propuestas de retroalimentación.
2. Una persona selecciona explícitamente si corresponde revisar estrategia de mantenimiento, frecuencia preventiva o decisión de ciclo de vida; Motil no infiere el tipo de ajuste.
3. Cada propuesta conserva activo canónico, validación de origen, resultado aprobado, fundamento y referencia de evidencia.
4. Aceptar o descartar exige una decisión humana trazable con nota explícita.
5. Una propuesta aceptada funciona únicamente como autorización para revisar la fuente correspondiente; no modifica automáticamente estrategia, preventivos ni ciclo de vida.
6. Se evita más de una propuesta activa del mismo tipo sobre la misma validación.
7. La interfaz muestra junto al resultado aprobado el contexto vigente de estrategia, preventivos y ciclo de vida sin reescribirlo.

Entrega tecnica:
- `asset_renewal_verified_feedback`;
- `/api/maintenance/renewal-feedback`;
- `/dashboard/mantenimiento/retroalimentacion-renovacion`;
- acceso desde la navegación de Mantenimiento;
- aprobación/descartado humano con trazabilidad de decisión.

Regla de integridad:
- ninguna retroalimentación existe sin una validación aprobada;
- el activo de la propuesta se deriva de la validación y no de entrada libre del cliente;
- aceptar una propuesta no modifica `maintenance_asset_strategies`, `preventive_maintenance_schedules` ni `maintenance_asset_lifecycle_decisions`;
- la ausencia de validaciones aprobadas produce cero propuestas, nunca datos de demostración;
- no se reinterpretan resultados como ahorro, ROI o beneficio financiero.

## Bloque 39 — Aplicación controlada de retroalimentación aceptada
Estado: **Siguiente**
1. Permitir iniciar un cambio de estrategia, preventivo o ciclo de vida únicamente desde retroalimentación aceptada, conservando el flujo de aprobación propio de cada fuente.
2. Crear una relación trazable entre la retroalimentación aceptada y la propuesta operacional resultante sin sobrescribir decisiones anteriores.
3. Verificar que una retroalimentación aceptada no pueda aplicarse dos veces al mismo destino activo.
4. Mantener separación entre autorización para revisar y cambio operacional finalmente aprobado.

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
**Bloque 39 — Aplicación controlada de retroalimentación aceptada.**
