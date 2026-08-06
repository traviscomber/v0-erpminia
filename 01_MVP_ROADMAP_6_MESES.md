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

La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, documentos, seguridad, personas, calendario y relaciones entre equipos, repuestos, proveedores y costos.

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
- trazabilidad desde mantenimiento hasta compra y recepcion;
- etapas expresadas en lenguaje operacional claro.

---

# Roadmap por bloques de tres

## Bloque 10 — Cierre economico y de calidad de Compras

Estado: **Completado**

1. **Devoluciones a proveedor**
   - vinculadas a orden, recepcion, proveedor y productos rechazados;
   - cantidad y costo validados contra la recepcion;
   - motivo y solucion esperada;
   - seguimiento de reposicion, nota de credito, devolucion de dinero o reparacion;
   - proteccion contra cantidades superiores a lo rechazado y registros incompletos.

2. **Conciliacion orden de compra–recepcion–factura**
   - registro de factura desde una orden operacional;
   - comparacion de cantidades facturadas con cantidades recibidas;
   - comparacion de precio unitario con la orden;
   - deteccion de producto desconocido o recepcion faltante;
   - factura marcada como coincidente o con diferencias por resolver.

3. **Cumplimiento del proveedor**
   - nombre y RUT del proveedor;
   - ordenes totales y completadas;
   - entregas a tiempo;
   - devoluciones;
   - facturas coincidentes;
   - diferencias abiertas;
   - puntaje calculado de 0 a 100.

Resultado operativo:

`Orden de compra → Recepcion → Devolucion si corresponde → Factura → Conciliacion → Evaluacion del proveedor`

Entrega tecnica:

- tablas nuevas protegidas con RLS y acceso exclusivo del servidor;
- vista calculada `intelligence.supplier_performance_v1`;
- API `/api/procurement/supplier-control`;
- pantalla `/dashboard/compras/control-proveedores`;
- acceso visible desde la navegacion de Compras.

## Bloque 11 — Proveedor 360°

Estado: **Siguiente**

1. Ficha unica del proveedor con datos generales, contactos, estado y documentos vigentes.
2. Contratos, cotizaciones, ordenes, recepciones, facturas, devoluciones y pagos relacionados.
3. Desempeno, riesgo, productos suministrados, precios historicos y proveedores alternativos.

Resultado esperado:

`Proveedor → Contratos → Cotizaciones → Ordenes → Recepciones → Facturas → Devoluciones → Desempeno → Riesgo`

## Bloque 12 — Inventario canonico y trazabilidad completa

Estado: **Planificado**

1. Producto 360° con existencias, ubicaciones, lotes y vencimientos.
2. Historial completo de movimientos, compras, entregas, devoluciones y consumo.
3. Costos, rotacion, reorden y necesidades de mantenimiento relacionadas.

Resultado esperado:

`Producto → Stock → Ubicaciones → Movimientos → Compras → Ordenes de trabajo → Consumo → Costos`

## Bloque 13 — Equipo 360° y gemelo operacional

Estado: **Planificado**

1. Arbol real de equipo, sistemas y componentes.
2. Historia unica de ordenes, componentes, documentos, personas y costos.
3. Disponibilidad, confiabilidad, tiempo detenido y costo de ciclo de vida.

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

Comenzar el **Bloque 11 — Proveedor 360°**:

1. ficha unica y contactos;
2. todas sus relaciones comerciales y operacionales;
3. desempeno, riesgo, precios historicos y alternativas.
