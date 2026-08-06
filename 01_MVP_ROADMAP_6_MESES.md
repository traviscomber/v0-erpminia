# Roadmap Operacional Canonico de Motil

## Objetivo
Construir Motil como un sistema operacional conectado, basado en informacion canonica y relaciones reales entre equipos, ordenes de trabajo, inventario, compras, proveedores, documentos, personas y costos.

Principios:

- una sola fuente de verdad por entidad;
- ninguna duplicacion de registros;
- cada pantalla muestra relaciones del mismo modelo operacional;
- cada bloque debe cerrar un circuito funcional completo;
- no se agregan funciones teoricas sin uso operacional verificable.

## Estado actual

La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, seguridad, personas, calendario y relaciones entre equipos, repuestos, proveedores y costos.

## Bloques completados recientemente

### Mantenimiento conectado

- ficha del equipo con ordenes y costos relacionados;
- orden de trabajo conectada al flujo de compras;
- entrega, instalacion y devolucion de repuestos;
- costo final real y bloqueo de cierre con pendientes;
- mano de obra y servicios externos;
- informe final e historial de componentes instalados.

### Compras e inventario conectados

- recepciones parciales validadas;
- faltantes de una orden enviados directamente a Compras;
- devoluciones y conciliacion de facturas;
- evaluacion del proveedor;
- ficha Proveedor 360°;
- ficha Producto 360° y trazabilidad de inventario;
- trazabilidad desde mantenimiento hasta compra, recepcion, consumo y costo.

---

# Roadmap por bloques de tres

## Bloque 10 — Cierre economico y de calidad de Compras

Estado: **Completado**

1. Devoluciones a proveedor vinculadas a orden, recepcion y productos rechazados.
2. Conciliacion entre orden de compra, recepcion y factura.
3. Cumplimiento del proveedor basado en entregas, devoluciones y diferencias.

Resultado operativo:

`Orden de compra → Recepcion → Devolucion si corresponde → Factura → Conciliacion → Evaluacion del proveedor`

## Bloque 11 — Proveedor 360°

Estado: **Completado**

1. **Ficha unica del proveedor**
   - datos canonicos, RUT, razon social, nombre comercial, actividad, contacto, region y condiciones de pago;
   - busqueda por nombre o RUT;
   - estado y validacion del maestro canonico.

2. **Relaciones comerciales y operacionales**
   - cotizaciones;
   - ordenes historicas y operacionales;
   - contratos y documentos compatibles por RUT;
   - facturas conciliadas y diferencias abiertas;
   - devoluciones y soluciones pendientes.

3. **Desempeno y suministro**
   - puntaje de cumplimiento del Bloque 10;
   - compras acumuladas y facturacion;
   - productos suministrados;
   - cantidades, gasto y ultimo costo conocido;
   - visibilidad de diferencias pendientes.

Resultado operativo:

`Proveedor → Contratos → Cotizaciones → Ordenes → Facturas → Devoluciones → Productos → Desempeno`

Entrega tecnica:

- API `/api/procurement/suppliers-360`;
- pantalla `/dashboard/compras/proveedores-360`;
- acceso visible desde Compras;
- reutilizacion de `canonical.suppliers` sin crear un maestro paralelo.

## Bloque 12 — Inventario canonico y trazabilidad completa

Estado: **Completado**

1. **Producto 360°**
   - maestro `canonical.products`;
   - existencias, cantidades disponibles y reservadas;
   - lotes, vencimientos y valor de inventario;
   - alertas de stock minimo y vencimiento dentro de 90 dias.

2. **Historia operacional completa**
   - movimientos de inventario;
   - compras y recepciones;
   - devoluciones a proveedor;
   - consumo, instalacion y devolucion en ordenes de trabajo;
   - equipos y ordenes relacionadas.

3. **Costos y alternativas de suministro**
   - costo estandar y valorizacion actual;
   - proveedores historicos;
   - cantidades compradas y gasto acumulado;
   - rango de precios unitarios por proveedor;
   - ultima fecha de compra.

Resultado operativo:

`Producto → Stock → Lotes → Movimientos → Compras → Recepciones → Proveedores → Ordenes de trabajo → Equipos → Costos`

Entrega tecnica:

- API `/api/inventory/products-360`;
- pantalla `/dashboard/bodega/productos-360`;
- acceso visible desde Bodega;
- reutilizacion de `canonical.products` y relaciones existentes sin duplicar inventario.

## Bloque 13 — Equipo 360° y gemelo operacional

Estado: **Siguiente**

1. Arbol real de equipo, sistemas y componentes.
2. Historia unica de ordenes, componentes, documentos, personas y costos.
3. Disponibilidad, confiabilidad, tiempo detenido y costo de ciclo de vida.

Resultado esperado:

`Equipo → Sistemas → Componentes → Ordenes → Repuestos → Personas → Documentos → Costos → Disponibilidad`

## Bloque 14 — Mantenimiento preventivo y predictivo

Estado: **Planificado**

1. Planes preventivos relacionados con equipo, componente, frecuencia y lectura.
2. Alertas por fecha, horas, kilometraje, condicion y comportamiento historico.
3. Recomendaciones basadas exclusivamente en datos canonicos disponibles.

## Bloque 15 — Centro ejecutivo de decisiones

Estado: **Planificado**

1. Operacion detenida, atrasada o bloqueada.
2. Decisiones requeridas hoy y responsables.
3. Mejoras, costos, riesgos y tendencias semanales.

## Bloque 16 — Seguridad, permisos y aislamiento por organizacion

Estado: **Planificado**

1. Migracion gradual y verificada de aislamiento por organizacion.
2. Revision de funciones antiguas, permisos de servidor y accesos directos.
3. Pruebas por rol sin bloquear flujos productivos existentes.

## Bloque 17 — QA operacional y lanzamiento estable

Estado: **Planificado**

1. Pruebas de cadenas historicas completas con datos reales existentes.
2. Revision de rutas, permisos, estados vacios, errores, importaciones y exportaciones.
3. Rendimiento, accesibilidad, tablet, telefono y lista final de lanzamiento.

---

# Regla de desarrollo y entrega

Cada bloque se ejecuta con el siguiente proceso obligatorio:

1. Actualizar este roadmap al iniciar o cerrar el bloque.
2. Crear una rama especifica.
3. Implementar solo relaciones y datos canonicos validados.
4. No usar datos ficticios, simulados o paralelos.
5. Validar compilacion, tipos, rutas y flujo funcional.
6. Abrir un Pull Request con alcance, impacto y pruebas.
7. Corregir regresiones antes del merge.
8. Fusionar el PR a `main`.
9. Confirmar el commit final y el deployment estable.
10. Marcar el bloque completado y listar el siguiente.

---

## Prioridad inmediata

Comenzar el **Bloque 13 — Equipo 360° y gemelo operacional**:

1. jerarquia real de equipo, sistemas y componentes;
2. ficha unica con historia operacional completa;
3. disponibilidad, confiabilidad, detencion y costo de ciclo de vida.
