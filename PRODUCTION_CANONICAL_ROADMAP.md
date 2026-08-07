# Producción Canónica — Roadmap v1

## Principios permanentes

- Los Excel fuente son evidencia inmutable, no tablas operacionales.
- Cada registro importado conserva archivo, hoja, fila, hash, batch y payload residual.
- TM y LEY/LEYES representan granos distintos y no se mezclan en una tabla KPI.
- Ninguna entidad textual crea automáticamente una persona, proveedor, activo, mina o sector canónico.
- Toda normalización de unidades usa reglas versionadas con evidencia.
- `produccion_kpi` es legacy y dejará de ser fuente de verdad cuando existan read models derivados y validados.
- Ausencia de datos no equivale a cero, cumplimiento, eficiencia ni producción.

## P1 — Fundación canónica e ingestión
Estado: **En progreso**

1. Registrar archivos fuente por hash y período.
2. Crear modelo para movimientos TM, minas/sectores, turnos de planta, metalurgia, despachos y reconciliación.
3. Preservar valor raw y valor normalizado por separado.
4. Codificar reglas auditadas de escala/unidad.
5. Crear ingestión idempotente por chunks y cierre por conteo esperado.
6. Proteger mutaciones de Producción por rol y organización.

## P2 — TM histórico y reconciliación operacional
Estado: **Pendiente**

1. Importar TM 2026 y verificar 2.897 movimientos identificados por parser.
2. Importar 2019 → 2025 en orden cronológico conservando la regla de escala efectiva por fecha.
3. Reconciliar minas y sectores con centros de costo existentes cuando exista evidencia suficiente.
4. Crear cola de revisión para conductor, transportista y patente.
5. Resolver coincidencias exactas contra `profiles`, `suppliers` y `canonical.assets`; aliases ambiguos requieren aprobación humana.

## P3 — Planta, leyes y metalurgia
Estado: **Pendiente**

1. Importar fecha + turno desde `LEY.xlsx` y `LEYES.xlsx` sin duplicar el mismo evento.
2. Usar LEY/LEYES como fuentes contrastables, conservando discrepancias.
3. Separar tonelaje tratado, humedad, ley cabeza, concentrado, relave, recuperación, fino y lote.
4. Recalcular recuperación y fino mediante fórmulas determinísticas versionadas; conservar valores reportados por separado.
5. Tratar el 06-08-2026 y fechas posteriores con campos incompletos como evidencia parcial, no resultados completos.

## P4 — Reconciliación mina → planta → despacho
Estado: **Pendiente**

1. Agregar read models diarios y por turno.
2. Comparar mineral recibido, mineral tratado, inventario/acopio cuando exista evidencia y concentrado despachado.
3. Exponer brechas de masa y frescura sin interpretarlas automáticamente como pérdida o error.
4. Mantener granularidad por mina, sector, turno, lote y fuente.

## P5 — Producto y UX operacional
Estado: **Pendiente**

Reestructurar `/dashboard/produccion` en superficies:

- Resumen operacional;
- Movimientos de mineral;
- Mina y sectores;
- Planta y turnos;
- Metalurgia y recuperación;
- Despachos;
- Reconciliación;
- Calidad del dato y fuentes.

Estados `observado`, `calculado`, `pendiente`, `parcial` y `no reconciliado` deben ser visibles y semánticamente distintos.

## P6 — Retiro del KPI legacy y release
Estado: **Pendiente**

1. Sustituir `produccion_kpi` por read models canónicos.
2. Verificar roles, RLS, aislamiento tenant, idempotencia y lineage.
3. Comparar series resultantes contra Excel fuente.
4. Build, TypeScript, pruebas de API y deployment.
5. Congelar Producción Canónica v1.
