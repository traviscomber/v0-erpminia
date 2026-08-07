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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo, estrategia de mantenimiento por criticidad, ciclo de vida de activos, planificacion de inversion para renovacion, ejecucion trazable de renovacion y puesta en servicio/cierre de renovacion.

## Bloques 10 a 34
Estado: **Completados**

## Bloque 35 — Puesta en servicio y cierre de renovación
Estado: **Completado**
1. Solo una iniciativa de renovación completada puede originar una decisión de puesta en servicio, cierre o reemplazo efectivo.
2. El cierre valida evidencia operacional y documental realmente vinculada: OT, OC, contratos y documentos existentes.
3. Una propuesta puede registrar brechas, pero la aprobación se bloquea cuando existen OT abiertas, OC sin recepción/cierre, contratos vinculados sin evidencia documental o ausencia total de evidencia de ejecución.
4. Un reemplazo efectivo exige un activo canónico ya existente, activo y distinto del equipo anterior.
5. El cierre conserva la relación histórica entre activo anterior y activo de reemplazo sin modificar automáticamente los registros canónicos.

Entrega tecnica:
- `asset_renewal_commissioning_decisions`;
- `/api/maintenance/renewal-commissioning`;
- `/dashboard/mantenimiento/puesta-servicio`;
- validación de brechas de cierre antes de aprobación;
- relación explícita entre activo anterior y reemplazo existente.

Regla de integridad:
- Motil no crea el activo de reemplazo durante el cierre;
- aprobar un cierre no modifica `is_active`, códigos, nombres, origen ni `source_payload` de los activos;
- ninguna fecha de puesta en servicio se infiere: solo se guarda cuando fue ingresada explícitamente;
- no se considera una OC cerrada si su estado registrado no indica recepción/cierre;
- las OT vinculadas deben estar completadas para aprobar el cierre;
- un contrato vinculado sin archivo o documento registrado se mantiene como brecha;
- toda decisión conserva fundamento, evidencia, autor y fecha de aprobación.

## Bloque 36 — Validación post-puesta en servicio y desempeño de renovación
Estado: **Siguiente**
1. Seguir activos con cierre aprobado y comparar evidencia posterior de OT, downtime, costos, preventivos y telemetría solo cuando esos datos existan realmente.
2. Para reemplazos efectivos, mantener separado el historial del activo anterior y del activo nuevo; no trasladar ni reescribir historial entre equipos.
3. Mostrar brechas cuando todavía no exista suficiente evidencia post-puesta en servicio y evitar declarar éxito, ahorro o mejora sin datos comparables.
4. Permitir una validación humana trazable del resultado de la renovación con fundamento y referencia de evidencia.

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
**Bloque 36 — Validación post-puesta en servicio y desempeño de renovación.**
