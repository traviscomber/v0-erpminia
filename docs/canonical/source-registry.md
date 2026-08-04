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

1. Productos: `Existencias (2) / Stock min-max`.
2. Stock valorizado: `Análisis de bodega (1) / Hoja6`.
3. Proveedores: `Existencias (2) / Proveedores`.
4. Compras: `Existencias (2) / compras`.
5. Centros de costo: `Base Existencias (1) / Centros de Costos`.
6. Costos por activo: `Costos equipos Mayo 2026 (1) / Base`.
7. Resúmenes y tablas dinámicas se regeneran; no se importan como hechos.

## Hallazgos bloqueantes o de revisión

- 6 centros de costo pertenecen a `Actividades Centenario`; se clasifican como `event` y no deben mostrarse como activos.
- 133 centros son candidatos a activo y 44 a vehículo; requieren conciliación con el maestro de equipos.
- 6 productos tienen stock negativo.
- 36 filas presentan diferencia de valorización.
- 354 líneas de compra tienen cantidad no numérica.
- 1 código de compras no aparece en el maestro de productos.
- Al menos 4 filas de `Stock min-max` tienen columnas desplazadas.
- 1 proveedor tiene el RUT interpretado como fecha.

## Tablas creadas

### `staging`

- `import_batches`
- `validation_errors`

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