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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo, estrategia de mantenimiento por criticidad, ciclo de vida de activos, planificacion de inversion para renovacion y ejecucion trazable de renovacion.

## Bloques 10 a 33
Estado: **Completados**

## Bloque 34 — Ejecución y seguimiento de renovación de activos
Estado: **Completado**
1. Solo necesidades de inversión aprobadas pueden originar una iniciativa de ejecución.
2. Cada iniciativa puede vincular órdenes de compra, contratos y órdenes de trabajo que ya existen y pertenecen a la misma organización; las OT además deben corresponder al mismo activo canónico.
3. Los montos se presentan separados por fuente: compromiso de OC, valor y pago registrado de contratos y costo real de OT. Motil no suma estas fuentes entre sí porque pueden representar etapas o documentos del mismo compromiso.
4. Los documentos se exponen únicamente cuando ya existen asociados a contratos vinculados; el bloque no crea compras, contratos, OT ni documentos.

Entrega tecnica:
- `asset_renewal_execution_initiatives`;
- `asset_renewal_execution_links`;
- `/api/maintenance/renewal-execution`;
- `/dashboard/mantenimiento/ejecucion-renovacion`;
- acceso desde el centro de Mantenimiento;
- seguimiento de estado planificada, en ejecución, completada o cancelada.

Regla de integridad:
- ninguna iniciativa existe sin una necesidad de inversión aprobada;
- una referencia se vincula solo después de validar su existencia y organización;
- una OC con centro de costo explícito debe coincidir con el centro de costo de la necesidad;
- una OT debe corresponder al mismo activo canónico de la iniciativa;
- contratos se vinculan solo por número exacto dentro de la organización;
- OC, contratos y OT se muestran como fuentes financieras separadas para evitar doble conteo;
- completar una iniciativa no crea, modifica ni cierra automáticamente registros financieros u operacionales externos.

## Bloque 35 — Puesta en servicio y cierre de renovación
Estado: **Siguiente**
1. Cerrar una renovación solo cuando exista evidencia explícita de ejecución terminada y registrar la decisión de puesta en servicio, cierre o reemplazo efectivo.
2. Cuando exista un activo de reemplazo ya registrado en el modelo canónico, vincularlo con el activo anterior y conservar trazabilidad histórica; Motil no creará automáticamente el nuevo activo.
3. Verificar cierre documental y operacional usando únicamente OC, contratos, OT y documentos realmente vinculados, mostrando brechas de cierre sin inferir cumplimiento.
4. Preservar el historial del activo anterior y evitar sobrescribir datos canónicos de origen durante la transición.

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
**Bloque 35 — Puesta en servicio y cierre de renovación.**
