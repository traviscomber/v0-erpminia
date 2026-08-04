# Registro de fuentes canónicas

Estado al 4 de agosto de 2026.

## Principio

Los archivos operacionales se registran primero en `staging.import_batches`. Ningún registro se promueve a `canonical` sin conservar archivo, hoja, fila, hash y hallazgos de validación.

Los esquemas `canonical` y `staging` están restringidos a `service_role`. No reemplazan ni eliminan tablas productivas existentes.

## Fuentes registradas

| Archivo | SHA-256 | Filas analizadas | Dominio | Fuente aprobada |
|---|---|---:|---|---|
| Costos equipos Mayo 2026 (1).xlsx | `bda469b85d5093b25f71f08464f4facf501a54e7f301f935a655b310d1133314` | 19.426 | Costos de activos | Hoja `Base` |
| Análisis de bodega (1).xlsx | `1ec77e1c80bee19cfb15372607fbfb184b3f4b5521d09cd368316eefb003d8f0` | 4.918 | Snapshot de inventario | Hoja `Hoja6` |
| Base Existencias (1).xlsx | `8238e40a3398aac514336165167cfd9f7d620c77824e840eba7aaf10ff5e2315` | 5.381 | Centros de costo y catálogo complementario | `Centros de Costos`; `Productos` solo como complemento |
| Existencias (2).xlsx | `7f66932553a7739956515c43956e56b043e7b298bf2201e5f5ec67db64c9190c` | 97.733 | Productos, proveedores y compras | `Stock min-max`, `Proveedores`, `compras` |

## Precedencia

1. Productos activos: catálogo vigente de `public.warehouse_stock` del sitio.
2. Productos históricos o adicionales: `Existencias (2) / Stock min-max`, siempre con `is_active=false` hasta aprobación manual.
3. Stock operativo actual: `public.warehouse_stock`.
4. Stock valorizado histórico o conciliatorio: `Análisis de bodega (1) / Hoja6`.
5. Proveedores activos: `public.suppliers`.
6. Proveedores históricos o enriquecimiento: `Existencias (2) / Proveedores`.
7. Compras operativas: `public.purchase_orders`.
8. Líneas históricas completas: `Existencias (2) / compras`.
9. Centros de costo activos: catálogo vigente de `public.cost_centers` del sitio.
10. Centros de costo históricos o adicionales: `Base Existencias (1) / Centros de Costos`, siempre con `is_active=false` hasta aprobación manual.
11. Activos operativos: `public.maintenance_assets`.
12. Costos históricos por activo: `Costos equipos Mayo 2026 (1) / Base`.
13. Resúmenes y tablas dinámicas se regeneran; no se importan como hechos.

## Regla específica para productos

- La clave de deduplicación automática es `organization_id + product_code` normalizado.
- Un producto está activo únicamente cuando existe en el catálogo vigente del sitio.
- El registro existente conserva su identidad y prioridad; el Excel solo puede enriquecer campos faltantes.
- Un producto presente solo en archivos históricos se conserva con `is_active=false` y `validation_status='pending'`.
- Descripciones repetidas con códigos distintos no se fusionan automáticamente.
- Coincidencias aproximadas por descripción, unidad o familia se marcan para revisión y nunca generan una fusión automática.
- Las filas estructuralmente desplazadas se bloquean hasta corrección.

## Promoción operativa verificada

Para la organización `2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee` se promovió la data ya existente en el sitio, sin modificar las tablas públicas:

| Dominio | Registros canónicos | Advertencias | Clave de deduplicación |
|---|---:|---:|---|
| Productos | 12.268 | 0 | `organization_id + product_code` |
| Centros de costo | 277 | 0 | `organization_id + code` |
| Proveedores | 2.158 | 4 | `organization_id + RUT normalizado` |
| Inventario actual | 12.268 | 0 | `organization_id + snapshot_date + product_code + warehouse` |
| Órdenes de compra | 23.337 | 0 | `organization_id + order_number` |
| Líneas operativas de compra | 23.337 | 0 | `organization_id + order_number + line_number` |
| Activos | 5 | 0 | `organization_id + asset_code` |
| Costos de adquisición | 5 | 0 | hash determinístico por activo y tipo de costo |

Las cuatro advertencias de proveedores corresponden a registros sin RUT. Se conservaron activos porque existen en el sitio y recibieron una clave técnica `NO-RUT:<uuid>`; no se fusionaron por nombre.

Las líneas de compra promovidas desde `public.purchase_orders` representan el nivel operativo actualmente disponible en el sitio: una línea por orden. El archivo `Existencias (2) / compras` ampliará posteriormente esas órdenes al detalle histórico completo, sin duplicar cabeceras.

Los cinco costos promovidos desde `public.maintenance_assets` corresponden exclusivamente a adquisición. No se mezclan con mantenimiento, repuestos, combustible ni otros costos históricos.

## Promoción de productos realizada

El catálogo vigente del sitio fue consolidado en `canonical.products`:

- 12.268 productos activos.
- 12.268 códigos únicos.
- 0 filas duplicadas por código.
- Fuente operativa: `public.warehouse_stock`.

La hoja `Stock min-max` contiene:

- 13.176 filas con código.
- 13.176 códigos únicos.
- 125 grupos de descripción repetida, que abarcan 3.084 filas y no se fusionan automáticamente.
- 2 filas estructuralmente desplazadas: `Filtro0203` y `Repuesto1688`.

## Regla específica para centros de costo

- Un centro está activo únicamente cuando existe en el catálogo vigente del sitio para la organización.
- Un centro presente solo en archivos históricos se conserva en `canonical.cost_centers` con `is_active=false` y `validation_status='pending'`.
- La existencia en un archivo Excel nunca activa automáticamente un centro.
- `Actividades Centenario` y sus hijos se clasifican como `event`. Pueden permanecer activos como centros financieros si están vigentes en el sitio, pero no deben aparecer como equipos ni activos en Mantenimiento.
- Proyectos, administración, áreas, vehículos y activos se distinguen mediante `center_type`; la interfaz debe filtrar por tipo según el módulo.

## Promoción de centros de costo realizada

El lote `Base Existencias (1).xlsx` fue conciliado con el catálogo vigente del sitio:

- 277 centros promovidos.
- 277 activos por precedencia del sitio.
- 0 centros adicionales activados desde Excel.
- Tipificación resultante: 18 administración, 72 áreas, 107 activos, 6 eventos, 4 operaciones, 30 proyectos y 40 vehículos.

## Hallazgos bloqueantes o de revisión

- 6 centros de costo pertenecen a `Actividades Centenario`; se clasifican como `event` y no deben mostrarse como activos.
- 133 centros son candidatos a activo y 44 a vehículo; requieren conciliación con el maestro de equipos.
- 6 productos tienen stock negativo en el Excel de análisis de bodega.
- 36 filas del Excel presentan diferencia de valorización.
- 354 líneas históricas de compra tienen cantidad no numérica.
- 1 código histórico de compras no aparece en el maestro de productos.
- 2 filas de `Stock min-max` tienen columnas desplazadas.
- 1 proveedor del Excel tiene el RUT interpretado como fecha.
- 4 proveedores activos del sitio no tienen RUT y requieren regularización manual.

## Tablas creadas

### `staging`

- `import_batches`
- `validation_errors`
- `product_import_candidates`

### `canonical`

- `products`
- `suppliers`
- `cost_centers`
- `assets`
- `inventory_snapshots`
- `purchase_orders`
- `purchase_order_lines`
- `asset_costs`

## Regla de promoción

Un lote avanza por estos estados:

`analyzed -> staged -> validated -> promoted`

Los registros con advertencias se conservan y quedan marcados. Los registros inválidos no se promueven hasta resolver el hallazgo. Nunca se convierten valores desconocidos a cero ni se fusionan códigos automáticamente.