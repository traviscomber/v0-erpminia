# Producción Canónica — Inteligencia verificada

Corte de evidencia: 2026-08-08.

## Fuente maestra auditada

Workbook: `Motil_Produccion_Ingesta_Canonica_2019_2026.xlsx`.

La fuente se trata como evidencia `client-owned-canonical`: no pertenece a la metodología propietaria de N3uralia y no debe publicarse en el repositorio.

### Cobertura verificada

- Movimientos de transporte canónicos: 35.744.
- Registros de transporte separados para revisión por tonelaje 0: 3.165.
- Primer movimiento: 2019-04-18.
- Último movimiento: 2026-08-06.
- Turnos de planta consolidados: 11.171.
- Primer turno de planta: 2011-04-22.
- Último turno de planta: 2026-08-06.
- Archivos fuente consolidados: 10.

No se inventan valores faltantes.

## Contratos de datos

### Transporte

Grano: un movimiento físico/ticket por viaje mina → planta.

Campos canónicos observados incluyen número, fecha, cliente, descripción, conductor, transportista, patente, sector, mina origen, interior mina, sello, tonelaje raw, deuda/anotación, unidad original, toneladas normalizadas y lineage.

Regla de unidades:

- hasta 2020-09-30 el valor raw de TM se interpreta en toneladas;
- desde 2020-10-01 el valor raw se interpreta en kg y se normaliza a toneladas;
- raw y normalizado se preservan por separado;
- toda normalización conserva versión de esquema/adaptador.

No se crean automáticamente personas, proveedores, activos, minas o sectores desde texto histórico. Los alias ambiguos pasan a reconciliación humana.

### Planta / metalurgia

Grano: un turno observado por fecha + turno.

Se mantienen separados:

- humedad mineral;
- humedad de concentrado;
- mineral húmedo y seco;
- ley cabeza;
- ley Galigher cuando existe;
- ley concentrado;
- ley relave;
- recuperación reportada y calculada;
- fino reportado y calculado;
- lote;
- despacho húmedo/seco, humedad y ley de despacho;
- lineage de fuente.

Motil recalcula fórmulas determinísticas y no confía en caches de Excel.

## Reglas metalúrgicas determinísticas

- Mineral seco = mineral húmedo × (1 - humedad mineral / 100).
- Fino alimentación = mineral seco × ley cabeza / 100.
- Recuperación = ((cabeza - relave) × concentrado) / ((concentrado - relave) × cabeza) × 100, solo cuando los denominadores e inputs son válidos.
- Concentrado seco = concentrado húmedo × (1 - humedad concentrado / 100).
- Fino concentrado = concentrado seco × ley concentrado / 100.
- Fino despacho = toneladas despacho × (1 - humedad despacho / 100) × ley despacho / 100.

Dato faltante o división inválida produce estado parcial/revisión; nunca se convierte silenciosamente en cero.

## Frescura e interpretación

La última evidencia de transporte llega al 2026-08-06. La evidencia metalúrgica completa auditada llega al 2026-08-05; el 2026-08-06 puede contener tonelaje con leyes todavía incompletas. Esa diferencia debe mostrarse como latencia de evidencia y no como falla operacional.

## Modelo de producto

La cadena de decisión es:

mina/sector → movimiento físico → recepción → turno de planta → toneladas tratadas → leyes → recuperación/fino → concentrado → despacho → reconciliación.

`produccion_kpi` es legacy y no es fuente de verdad. Los KPI ejecutivos deben ser read models derivados desde las tablas canónicas y otras fuentes autorizadas como HSE, Mantenimiento y Telemetría.

## Estado de implementación verificado

El esquema canónico existe en Supabase con tablas para movimientos, turnos, metalurgia, despachos, lotes de importación, normalización y reconciliación. RLS está habilitado y las tablas de Producción no tienen grants directos para `anon` ni `authenticated`; el acceso operacional se realiza server-side.

Al corte de esta revisión, los lotes de fuente están registrados, pero las tablas de movimientos, turnos, metalurgia y despachos todavía no contienen filas materializadas. El frontend debe mostrar explícitamente este estado y nunca sustituirlo con los 30 registros legacy de `produccion_kpi`.

## Inteligencia permitida

La inteligencia de Producción puede:

- medir frescura y cobertura;
- detectar brechas de masa como diferencias a investigar;
- comparar reportado vs calculado;
- priorizar reconciliaciones pendientes;
- mostrar evolución por mina, sector, turno, lote y período una vez exista evidencia materializada;
- explicar reglas determinísticas y procedencia.

No puede:

- inventar producción faltante;
- interpretar una brecha como pérdida sin evidencia;
- crear maestros automáticamente desde texto histórico;
- usar `produccion_kpi` legacy para afirmaciones oficiales;
- presentar datos futuros prellenados de Excel como producción observada.
