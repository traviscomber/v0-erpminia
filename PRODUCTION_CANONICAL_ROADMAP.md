# Producción Canónica — Roadmap v1

## Principios permanentes

- Los Excel fuente son evidencia inmutable, no tablas operacionales.
- Cada registro importado conserva archivo, hoja, fila, hash, batch y payload residual.
- TM y LEY/LEYES representan granos distintos y no se mezclan en una tabla KPI.
- Ninguna entidad textual crea automáticamente una persona, proveedor, activo, mina o sector canónico.
- Toda normalización de unidades usa reglas versionadas con evidencia.
- `TM 2026` define el contrato canónico `TM_2026_V1`; los años 2019–2025 se adaptan a ese contrato mediante perfiles versionados. Campos inexistentes en la fuente quedan NULL.
- `LEY/LEYES` conservan valores reportados y Motil recalcula automáticamente las fórmulas determinísticas con reglas versionadas.
- Los acumulados metalúrgicos son read models calculados, no valores canónicos copiados del Excel.
- `produccion_kpi` es legacy y dejará de ser fuente de verdad cuando existan read models derivados y validados.
- Ausencia de datos no equivale a cero, cumplimiento, eficiencia ni producción.

## P1 — Fundación canónica, ingreso e ingestión
Estado: **En progreso**

1. Registrar archivos fuente por hash y período.
2. Crear modelo para movimientos TM, minas/sectores, turnos de planta, metalurgia, despachos y reconciliación.
3. Preservar valor raw y valor normalizado por separado.
4. Codificar reglas auditadas de escala/unidad.
5. Crear ingestión idempotente por chunks y cierre por conteo esperado.
6. Proteger mutaciones de Producción por rol y organización.
7. Crear `Ingreso de Datos` con dos modos: `Transporte de Mineral` y `Planta / Leyes`.
8. Soportar ingreso manual y carga Excel con preview, validación y commit explícito.
9. Registrar cada sesión de ingreso y su template/version de adaptación.

## P2 — TM 2026 como contrato y adaptación histórica
Estado: **Pendiente**

1. Definir `TM_2026_V1` como esquema objetivo para Transporte de Mineral.
2. Importar TM 2026 y verificar 2.897 movimientos identificados por parser.
3. Construir perfiles de adaptación por año para 2019 → 2025 hacia `TM_2026_V1`.
4. Nunca inventar valores ausentes: campos no presentes históricamente quedan NULL y se conserva el payload original.
5. Aplicar la regla de escala efectiva por fecha y registrar `source_schema_version` + `adapter_version` en cada fila.
6. Reconciliar minas y sectores con centros de costo existentes cuando exista evidencia suficiente.
7. Crear cola de revisión para conductor, transportista y patente.
8. Resolver coincidencias exactas contra `profiles`, `suppliers` y `canonical.assets`; aliases ambiguos requieren aprobación humana.

## P3 — Planta, leyes y motor metalúrgico automático
Estado: **Pendiente**

1. Importar fecha + turno desde `LEY.xlsx` y `LEYES.xlsx` sin duplicar el mismo evento.
2. Usar LEY/LEYES como fuentes contrastables, conservando discrepancias.
3. Separar tonelaje tratado, humedad, ley cabeza, ley Galigher cuando exista, concentrado, relave, lote y variables de despacho.
4. Recalcular automáticamente:
   - recuperación teórica: `((cabeza - relave) * concentrado) / ((concentrado - relave) * cabeza) * 100`;
   - fino teórico tratado: `humedad * toneladas_tratadas * ley_cabeza / 100` usando toneladas canónicas;
   - fino real de despacho: `(1 - humedad_despacho/100) * (ley_despacho/100) * toneladas_despachadas`;
   - acumulados de fino tratado y fino despacho mediante ventanas ordenadas por fecha/turno.
5. Conservar siempre `reportado` vs `calculado` y mostrar discrepancia cuando no coincidan.
6. Tratar divisiones inválidas, campos faltantes y el 06-08-2026 incompleto como estado `partial/review`, nunca como cero.

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
- Ingreso de datos;
- Movimientos de mineral;
- Mina y sectores;
- Planta y turnos;
- Metalurgia y recuperación;
- Despachos;
- Reconciliación;
- Calidad del dato y fuentes.

`Ingreso de datos` debe permitir elegir `Transporte` o `Planta/Leyes`, ingresar manualmente o cargar archivo, previsualizar adaptación/cálculos, resolver errores y recién después confirmar el commit.

Estados `observado`, `calculado`, `pendiente`, `parcial` y `no reconciliado` deben ser visibles y semánticamente distintos.

## P6 — Retiro del KPI legacy y release
Estado: **Pendiente**

1. Sustituir `produccion_kpi` por read models canónicos.
2. Verificar roles, RLS, aislamiento tenant, idempotencia y lineage.
3. Comparar series resultantes contra Excel fuente.
4. Build, TypeScript, pruebas de API y deployment.
5. Congelar Producción Canónica v1.
