# Auditoria de proveedores, maquinas e inventario

Fecha: 2026-06-25

## Alcance

Revision puntual de los tres flujos mas conectados a data real:

1. Proveedores
2. Maquinas y vehiculos
3. Bodega e inventario

## Estado actual

### 1. Proveedores

- La lista principal usa la tabla real `suppliers`.
- La importacion de existencias sigue cargando proveedores reales desde Excel.
- Se eliminan vistas de ejemplo y muestras artificiales en la importacion.
- El selector de compras sigue consumiendo `/api/compras/suppliers`.

### 2. Maquinas

- La vista de vehiculos ya toma el catalogo derivado desde centros de costo.
- El listado de modelos ya no estaba recortado a 12 elementos.
- La importacion de maquinaria ya no expone muestras de demo ni valores de ejemplo.
- La logica sigue dependiendo de centros de costo activos y de familias operativas.

### 3. Bodega e inventario

- El dashboard de bodega sigue conectado a inventario real.
- La importacion de inventario usa staging para no vaciar el sistema si algo falla.
- Se limpiaron restos de encoding visibles en la tabla y en el formulario de compras.
- Se removieron salidas de `sample` y `example` en respuestas de importacion.

## Cambios ya aplicados

- Limpieza visual de textos rotos en compras, maquinaria e inventario.
- Eliminacion de muestras artificiales en:
  - importacion de existencias
  - importacion de inventario
  - importacion de maquinaria
  - verificacion de uploads
- Expansion del catalogo derivado de maquinas para que cubra mejor las familias operativas.

## Riesgos que siguen vigentes

- El selector de proveedores en compras depende de que la tabla real este bien poblada y sin duplicados sucios.
- La vista de vehiculos depende de que los centros de costo esten bien normalizados.
- El dashboard de bodega depende de que la estructura de categorias y subfamilias siga consistente con los archivos fuente.

## Recomendacion siguiente

1. Revisar visualmente compras, vehiculos y bodega en produccion.
2. Confirmar que no haya ningun texto residual con encoding raro en pantallas secundarias.
3. Mantener la regla: ninguna importacion debe vaciar data real sin staging o backup.

