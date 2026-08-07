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
Motil cubre autenticacion, roles, mantenimiento, OT, inventario, compras, recepciones, devoluciones, proveedores, productos, documentos, personas, preventivos, entidades 360, decisiones ejecutivas, aislamiento por organizacion, QA, acciones, automatizaciones seguras, planificacion de recursos, terreno, entrega de turno, auditoria operacional, calidad de datos, telemetria, campañas, confiabilidad, repuestos criticos, BOM tecnica, planes estandar de trabajo, estrategia de mantenimiento por criticidad, ciclo de vida de activos y planificacion de inversion para renovacion.

## Bloques 10 a 32
Estado: **Completados**

## Bloque 33 — Planificación de inversión para renovación de activos
Estado: **Completado**
1. Solo decisiones aprobadas de reconstrucción o reemplazo pueden originar una necesidad de inversión.
2. Cada necesidad conserva relación con decisión de ciclo de vida, activo canónico, centro de costo operacional, monto objetivo ingresado, fundamento y evidencia.
3. La cobertura financiera se compara contra `budget_annual` y `budget_used` existentes, agregando necesidades aprobadas por centro de costo para evitar doble conteo del saldo disponible.

Entrega tecnica:
- `asset_renewal_investment_needs`;
- `/api/maintenance/renewal-investments`;
- `/dashboard/mantenimiento/inversion-renovacion`;
- acceso directo desde ciclo de vida de activos;
- resumen de brecha presupuestaria por centro de costo.

Regla de integridad:
- Motil no crea montos de inversión automáticamente;
- una necesidad no puede existir sin una decisión aprobada de reconstrucción o reemplazo;
- el centro de costo debe corresponder al código registrado en el activo y existir en el presupuesto operacional;
- presupuesto ausente se muestra como ausencia, nunca como cero disponible;
- aprobar una necesidad no modifica ni reserva `budget_annual` o `budget_used`;
- no se inventan CAPEX, cotizaciones, moneda, fechas ni disponibilidad financiera.

## Bloque 34 — Ejecución y seguimiento de renovación de activos
Estado: **Siguiente**
1. Convertir necesidades de inversión aprobadas en iniciativas de ejecución trazables, sin crear compras, contratos u OT ficticias.
2. Vincular la ejecución con órdenes de compra, contratos, OT y documentos únicamente cuando esas relaciones existan realmente en Motil.
3. Comparar monto objetivo aprobado con compromisos y costos reales disponibles, mostrando avance y brechas sin asumir gasto futuro.

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
**Bloque 34 — Ejecución y seguimiento de renovación de activos.**
