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
La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, planes preventivos, Equipo/Proveedor/Producto 360, centro ejecutivo de decisiones y aislamiento por organizacion.

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

1. **Comprobacion real de fuentes**
   - sesion y pertenencia a la organizacion activa;
   - ordenes de trabajo;
   - mantenimiento preventivo;
   - inventario;
   - compras;
   - documentos.

2. **Estado de lanzamiento visible**
   - correcto, observacion o bloqueo por cada fuente;
   - estados vacios tratados como observacion, no como error ficticio;
   - enlaces directos a los modulos operacionales correspondientes.

3. **QA sin alterar produccion**
   - comprobaciones de solo lectura;
   - sin semillas, registros de prueba ni cambios historicos;
   - build de produccion y tipos como puerta obligatoria antes del merge.

Resultado operativo:
`Sesion → Organizacion → Fuente real → Comprobacion → Observacion/Bloqueo → Modulo responsable`

Entrega tecnica:
- API `/api/admin/readiness`;
- pantalla `/dashboard/estado-sistema`;
- comprobacion canonica y read-only de preparacion operacional.

## Bloque 18 — Centro de notificaciones y acciones
Estado: **Siguiente**

1. Bandeja personal construida sobre las excepciones canonicas del Centro ejecutivo.
2. Estado individual por usuario: pendiente, leido y pospuesto, sin copiar la informacion fuente.
3. Acceso directo desde cada aviso al registro o flujo que debe resolverse.

Resultado esperado:
`Excepcion canonica → Usuario → Estado personal → Accion → Registro fuente`

## Bloque 19 — Reglas y automatizaciones seguras
Estado: **Planificado**

1. Reglas por organizacion sobre eventos operacionales verificables.
2. Primera etapa limitada a avisos y acciones reversibles; sin pagos, cierres ni compras irreversibles automaticas.
3. Historial de ejecucion reutilizando la infraestructura de eventos existente cuando corresponda.

Resultado esperado:
`Evento real → Regla activa → Condicion → Aviso/accion segura → Historial`

## Bloque 20 — Planificacion avanzada y recursos
Estado: **Planificado**

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
**Bloque 18 — Centro de notificaciones y acciones.**
