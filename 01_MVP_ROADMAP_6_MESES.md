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

La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, calendario, planes preventivos y relaciones entre equipos, repuestos, proveedores y costos.

## Bloques completados recientemente

### Mantenimiento conectado

- Equipo 360° con identificacion, estado y accesos relacionados;
- ordenes, componentes, personas, documentos, costos y tiempos conectados;
- entrega, instalacion y devolucion de repuestos;
- costo final real y bloqueo de cierre con pendientes;
- mano de obra, servicios externos e informe final;
- planes preventivos por equipo, frecuencia y proxima fecha;
- vencimientos visibles y generacion controlada de ordenes preventivas.

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

## Bloque 11 — Proveedor 360°

Estado: **Completado**

1. Ficha unica basada en `canonical.suppliers`.
2. Relaciones comerciales y operacionales completas.
3. Desempeno, productos suministrados y precios historicos.

## Bloque 12 — Inventario canonico y trazabilidad completa

Estado: **Completado**

1. Producto 360° con existencias, lotes, vencimientos y valorizacion.
2. Movimientos, compras, recepciones, devoluciones y consumo.
3. Costos, proveedores historicos y necesidades de mantenimiento.

## Bloque 13 — Equipo 360° y gemelo operacional

Estado: **Completado**

1. Cabecera unica del equipo y accesos tecnicos.
2. Historia operacional de ordenes, componentes, personas, documentos y costos.
3. Tiempos de intervencion y confiabilidad derivados solo de registros reales.

Resultado operativo:

`Equipo → Arbol tecnico → Ordenes → Componentes → Personas → Documentos → Costos → Tiempos → Confiabilidad`

## Bloque 14 — Mantenimiento preventivo y predictivo

Estado: **Completado**

1. **Planes preventivos reales**
   - vinculados a `maintenance_assets` y, cuando existe correspondencia, al equipo canonico;
   - tarea, descripcion, prioridad, duracion y proxima fecha;
   - frecuencia por dias o por horas;
   - activacion y pausa controlada.

2. **Vencimientos operacionales**
   - planes vencidos;
   - intervenciones dentro de los proximos 30 dias;
   - planes pausados;
   - ordenes ya generadas;
   - estado vacio explicito cuando no existen planes registrados.

3. **Generacion controlada de ordenes**
   - creacion de OT mediante la funcion operacional existente;
   - una orden relacionada visible desde el plan;
   - ninguna generacion automatica sin accion del usuario;
   - eliminacion de los calendarios simulados que existian para demostracion.

Resultado operativo:

`Equipo → Plan preventivo → Vencimiento → Orden de trabajo → Ejecucion → Seguimiento`

Entrega tecnica:

- API `/api/maintenance/preventive` con lectura, creacion, activacion y generacion;
- pantalla `/dashboard/mantenimiento/planificacion` operativa;
- reutilizacion de `preventive_maintenance_schedules` y `create_work_order_from_schedule`;
- sin planes ficticios ni recomendaciones presentadas sin datos suficientes.

Nota:

Las alertas por condicion, kilometraje o comportamiento se habilitaran cuando existan lecturas canonicas suficientes. El sistema no fabrica esas señales.

## Bloque 15 — Centro ejecutivo de decisiones

Estado: **Siguiente**

1. Operacion detenida, atrasada o bloqueada.
2. Decisiones requeridas hoy y responsables.
3. Mejoras, costos, riesgos y tendencias semanales.

Resultado esperado:

`Dato operacional → Excepcion verificada → Responsable → Accion requerida → Seguimiento`

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

Comenzar el **Bloque 15 — Centro ejecutivo de decisiones**:

1. identificar operacion detenida, atrasada o bloqueada;
2. mostrar decisiones requeridas y responsables reales;
3. resumir costos, riesgos y tendencias verificables.
