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

- Equipo 360° con identificacion, estado y accesos relacionados;
- ficha del equipo con ordenes y costos relacionados;
- orden de trabajo conectada al flujo de compras;
- entrega, instalacion y devolucion de repuestos;
- costo final real y bloqueo de cierre con pendientes;
- mano de obra y servicios externos;
- informe final e historial de componentes instalados;
- tiempos de intervencion y confiabilidad derivados solo de registros existentes.

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

1. Ficha unica basada en `canonical.suppliers`.
2. Relaciones comerciales y operacionales completas.
3. Desempeno, productos suministrados y precios historicos.

Resultado operativo:

`Proveedor → Contratos → Cotizaciones → Ordenes → Facturas → Devoluciones → Productos → Desempeno`

## Bloque 12 — Inventario canonico y trazabilidad completa

Estado: **Completado**

1. Producto 360° con existencias, lotes, vencimientos y valorizacion.
2. Movimientos, compras, recepciones, devoluciones y consumo.
3. Costos, proveedores historicos y necesidades de mantenimiento.

Resultado operativo:

`Producto → Stock → Lotes → Movimientos → Compras → Recepciones → Proveedores → Ordenes de trabajo → Equipos → Costos`

## Bloque 13 — Equipo 360° y gemelo operacional

Estado: **Completado**

1. **Cabecera unica del equipo**
   - identificacion canonica, fabricante, modelo, serie y estado;
   - acceso directo al arbol tecnico, ficha tecnica, documentos y codigo QR;
   - integracion dentro de la ficha existente, sin crear un maestro paralelo.

2. **Historia operacional relacionada**
   - ordenes activas, completadas y criticas;
   - componentes instalados y ordenes de origen;
   - costos de repuestos, mano de obra y servicios externos;
   - timeline canonico y resumen financiero certificado.

3. **Indicadores derivados de registros reales**
   - tiempo total registrado entre inicio y termino de ordenes;
   - promedio de reparacion calculado con ordenes completas;
   - separacion promedio entre intervenciones historicas;
   - costo acumulado de ciclo operacional disponible.

Resultado operativo:

`Equipo → Arbol tecnico → Ordenes → Componentes → Personas → Documentos → Costos → Tiempos → Confiabilidad`

Entrega tecnica:

- componente `Asset360Overview`;
- integracion en `/dashboard/mantenimiento/equipos/[id]/ficha`;
- reutilizacion de `/api/maintenance/assets/[id]/timeline`;
- sin nuevas tablas, datos simulados ni calculos presentados sin base registrada.

## Bloque 14 — Mantenimiento preventivo y predictivo

Estado: **Siguiente**

1. Planes preventivos relacionados con equipo, componente, frecuencia y lectura.
2. Alertas por fecha, horas, kilometraje, condicion y comportamiento historico.
3. Recomendaciones basadas exclusivamente en datos canonicos disponibles.

Resultado esperado:

`Equipo → Plan preventivo → Proxima intervencion → Alerta → Orden de trabajo → Cumplimiento`

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

Comenzar el **Bloque 14 — Mantenimiento preventivo y predictivo**:

1. planes preventivos relacionados con equipos y componentes;
2. alertas por fecha, uso y condicion registrada;
3. generacion controlada de ordenes y seguimiento de cumplimiento.
