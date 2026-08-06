# Roadmap Operacional Canonico de Motil

## Objetivo
Construir Motil como un sistema operacional conectado, basado en informacion canonica y relaciones reales entre equipos, ordenes de trabajo, inventario, compras, proveedores, documentos, personas y costos.

El principio rector es simple:

- una sola fuente de verdad por entidad;
- ninguna duplicacion de registros;
- cada pantalla muestra relaciones del mismo modelo operacional;
- los nuevos bloques deben cerrar circuitos funcionales completos;
- no se agregan funciones teoricas sin uso operacional verificable.

## Estado actual

La base funcional ya cubre:

- autenticacion, roles y navegacion;
- produccion;
- mantenimiento y ordenes de trabajo;
- inventario y movimientos;
- compras y seguimiento;
- recepciones parciales;
- documentos;
- seguridad;
- personas y administracion;
- calendario operacional;
- relaciones basicas entre equipos, ordenes, repuestos, compras y costos.

## Bloques completados recientemente

### Mantenimiento conectado

- ficha del equipo con ordenes y costos relacionados;
- orden de trabajo conectada al flujo de compras;
- entrega de repuestos a la orden;
- confirmacion de instalacion;
- devolucion segura a bodega;
- costo final real de la orden;
- bloqueo de cierre con pendientes;
- mano de obra relacionada;
- servicios externos relacionados;
- informe final de la orden;
- historial de componentes instalados por equipo.

### Compras e inventario conectados

- recepciones parciales validadas;
- faltantes de una orden enviados directamente a Compras;
- trazabilidad desde necesidad de mantenimiento hasta compra y recepcion;
- etapas de compra expresadas en lenguaje operacional claro.

---

# Roadmap por bloques de tres

## Bloque 10 — Cierre economico y de calidad de Compras

Estado: **Siguiente**

1. **Devoluciones a proveedor**
   - devolucion vinculada a orden de compra y recepcion;
   - producto, cantidad, motivo y evidencia;
   - reposicion, nota de credito o cierre;
   - proteccion contra devoluciones duplicadas.

2. **Conciliacion orden de compra–recepcion–factura**
   - comparar cantidades compradas, recibidas y facturadas;
   - comparar precios, descuentos e impuestos;
   - marcar diferencias antes de aprobar el pago;
   - mantener trazabilidad hasta la resolucion.

3. **Cumplimiento del proveedor**
   - entregas a tiempo;
   - entregas completas;
   - productos rechazados;
   - diferencias de precio;
   - devoluciones;
   - tiempo de respuesta y cumplimiento acumulado.

Resultado esperado:

`Orden de compra → Recepcion → Devolucion si corresponde → Conciliacion → Aprobacion → Evaluacion del proveedor`

## Bloque 11 — Proveedor 360°

Estado: **Planificado**

1. Ficha unica del proveedor con datos generales, contactos y estado.
2. Contratos, cotizaciones, ordenes, recepciones, facturas y documentos relacionados.
3. Desempeno, riesgo, productos suministrados, precios historicos y alternativas.

Resultado esperado:

`Proveedor → Contratos → Cotizaciones → Ordenes → Recepciones → Facturas → Desempeno → Riesgo`

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
3. Indicadores de disponibilidad, confiabilidad, tiempo detenido y costo de ciclo de vida.

Resultado esperado:

`Equipo → Componentes → Ordenes → Repuestos → Personas → Documentos → Costos → Disponibilidad`

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

La vista ejecutiva debe responder en menos de diez segundos:

- que esta detenido;
- que esta atrasado;
- que requiere decision;
- que cambio o mejoro.

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

Cada bloque se ejecutara con el siguiente proceso obligatorio:

1. Actualizar este roadmap al iniciar o cerrar el bloque.
2. Crear una rama especifica para el bloque.
3. Implementar solo relaciones y datos canonicos validados.
4. No usar datos ficticios, simulados o paralelos.
5. Validar compilacion, tipos, rutas y flujo funcional.
6. Abrir un Pull Request con alcance, impacto y pruebas realizadas.
7. Revisar y corregir cualquier regresion antes del merge.
8. Fusionar el PR a `main` al finalizar.
9. Confirmar el commit final y el deployment estable.
10. Marcar el bloque completado y dejar listado el siguiente bloque de tres.

No se considerara terminado un bloque solo porque el codigo fue escrito. Debe quedar validado, fusionado a `main`, publicado y reflejado en este roadmap.

---

## Prioridad inmediata

Comenzar el **Bloque 10**:

1. devoluciones a proveedor;
2. conciliacion orden de compra–recepcion–factura;
3. cumplimiento del proveedor.

Al cerrar ese bloque se actualizara este documento, se listara el Bloque 11 como siguiente y se registraran el PR, commit, merge y deployment final.
