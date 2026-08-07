# Roadmap Operacional Canonico de Motil

## Objetivo
Construir Motil como un sistema operacional conectado, basado en informacion canonica y relaciones reales entre equipos, ordenes de trabajo, inventario, compras, proveedores, documentos, personas y costos.

Principios:
- una sola fuente de verdad por entidad;
- ninguna duplicacion de registros;
- cada pantalla muestra relaciones del mismo modelo operacional;
- cada bloque debe cerrar un circuito funcional completo;
- no se agregan funciones teoricas sin uso operacional verificable;
- ningun informe, alerta o automatizacion puede inventar informacion ausente.

## Estado actual
La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, planes preventivos, Equipo/Proveedor/Producto 360, centro ejecutivo de decisiones, aislamiento por organizacion, QA de lanzamiento, bandeja personal de acciones y reglas seguras de aviso.

## Bloques 10 a 16

### Bloque 10 — Cierre economico y de calidad de Compras
Estado: **Completado**
1. Devoluciones a proveedor.
2. Conciliacion orden–recepcion–factura.
3. Cumplimiento del proveedor.

### Bloque 11 — Proveedor 360°
Estado: **Completado**
1. Ficha unica de proveedor.
2. Relaciones comerciales y operacionales.
3. Desempeno, productos y precios historicos.

### Bloque 12 — Inventario canonico y trazabilidad completa
Estado: **Completado**
1. Producto 360°.
2. Movimientos, compras, recepciones, devoluciones y consumo.
3. Costos, proveedores y necesidades de mantenimiento.

### Bloque 13 — Equipo 360° y gemelo operacional
Estado: **Completado**
1. Cabecera unica del equipo.
2. Historia de OT, componentes, personas, documentos y costos.
3. Tiempos de intervencion y confiabilidad derivados de registros reales.

### Bloque 14 — Mantenimiento preventivo
Estado: **Completado**
1. Planes preventivos reales.
2. Vencimientos operacionales.
3. Generacion controlada de OT.

### Bloque 15 — Centro ejecutivo de decisiones
Estado: **Completado**
1. Excepciones verificadas de mantenimiento, inventario, documentos y finanzas.
2. Responsable y acceso directo al flujo que resuelve cada excepcion.
3. Lectura ejecutiva sin indices sinteticos ni predicciones sin fuente canonica.

### Bloque 16 — Seguridad, permisos y aislamiento por organizacion
Estado: **Completado**
1. RLS y pertenencia organizacional en el nucleo operacional.
2. Funciones privilegiadas y vistas expuestas protegidas.
3. Legacy sin relacion confiable restringido al servidor, sin inventar pertenencia.

---

## Bloque 17 — QA operacional y lanzamiento estable
Estado: **Completado**
1. Comprobacion real de sesion, organizacion y fuentes clave.
2. Estado visible: correcto, observacion o bloqueo.
3. QA read-only, sin semillas ni alteracion de produccion.

Entrega tecnica:
- API `/api/admin/readiness`;
- pantalla `/dashboard/estado-sistema`.

## Bloque 18 — Centro de notificaciones y acciones
Estado: **Completado**
1. Bandeja personal sobre las excepciones canonicas, sin copiar el contenido fuente.
2. Estado individual pendiente, leido o pospuesto con RLS por usuario y organizacion.
3. Resolucion directa en el registro operacional original.

Entrega tecnica:
- tabla `user_action_states`;
- API `/api/actions/state`;
- pantalla `/dashboard/acciones`.

## Bloque 19 — Reglas y automatizaciones seguras
Estado: **Completado**

1. **Reglas sobre excepciones verificables**
   - reglas aisladas por organizacion;
   - condicion por area operacional y prioridad;
   - activacion y pausa controladas por su creador.

2. **Automatizacion limitada a avisos**
   - unica accion permitida en esta etapa: `notify`;
   - no ejecuta pagos, compras, cierres de OT, movimientos de inventario ni cambios irreversibles;
   - la evaluacion reutiliza el feed canonico del Centro ejecutivo en vez de replicar su logica de negocio.

3. **Historial trazable**
   - cada coincidencia guarda regla, usuario y referencia a la excepcion/registro fuente;
   - no copia titulo, descripcion, monto ni otros datos del registro canonico;
   - deduplicacion por regla, usuario y excepcion.

Resultado operativo:
`Excepcion real → Regla activa → Condicion → Aviso seguro → Referencia historica`

Entrega tecnica:
- tablas `automation_rules` y `automation_rule_runs` con RLS;
- API `/api/automations/rules`;
- API `/api/automations/evaluate`;
- pantalla `/dashboard/automatizaciones`;
- Security Advisor sin nuevos errores atribuibles al bloque.

Nota de arquitectura:
La infraestructura legacy `event_log/event_history` no se usa como fuente de verdad del bloque porque no posee aislamiento organizacional directo. Se mantiene cerrada como infraestructura antigua hasta su reconciliacion canonica; el nuevo historial guarda solo referencias y queda aislado por organizacion y usuario.

## Bloque 20 — Planificacion avanzada y recursos
Estado: **Siguiente**

1. Capacidad de personas, equipos y ventanas de mantenimiento.
2. Conflictos, carga y prioridades visibles antes de programar.
3. Programacion operacional conectada a OT y preventivos existentes.

---

# Regla de desarrollo y entrega
Cada bloque se ejecuta con el siguiente proceso obligatorio:
1. Actualizar este roadmap al iniciar o cerrar el bloque.
2. Crear una rama especifica desde `main` estable.
3. Implementar solo relaciones y datos canonicos validados.
4. No usar datos ficticios, simulados o paralelos.
5. Validar compilacion, tipos, rutas y flujo funcional.
6. Abrir un Pull Request con alcance, impacto y pruebas.
7. Corregir regresiones antes del merge.
8. Fusionar el PR a `main`.
9. Confirmar el commit final y el deployment estable.
10. Marcar el bloque completado y listar el siguiente.

## Prioridad inmediata
**Bloque 20 — Planificacion avanzada y recursos.**
