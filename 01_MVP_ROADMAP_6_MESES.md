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
La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, planes preventivos, Equipo/Proveedor/Producto 360, centro ejecutivo de decisiones, aislamiento por organizacion, QA de lanzamiento, bandeja personal de acciones, reglas seguras de aviso, planificacion de recursos, operacion personal de terreno y entrega de turno trazable.

## Bloques 10 a 19

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

### Bloque 17 — QA operacional y lanzamiento estable
Estado: **Completado**
1. Comprobacion real de sesion, organizacion y fuentes clave.
2. Estado visible: correcto, observacion o bloqueo.
3. QA read-only, sin semillas ni alteracion de produccion.

### Bloque 18 — Centro de notificaciones y acciones
Estado: **Completado**
1. Bandeja personal sobre las excepciones canonicas.
2. Estado individual pendiente, leido o pospuesto.
3. Resolucion directa en el registro fuente.

### Bloque 19 — Reglas y automatizaciones seguras
Estado: **Completado**
1. Reglas sobre excepciones verificables.
2. Automatizacion limitada a avisos.
3. Historial trazable por referencia canonica.

---

## Bloque 20 — Planificacion avanzada y recursos
Estado: **Completado**
1. Carga real desde OT y preventivos.
2. Ventanas de personas/equipos y conflictos antes de programar.
3. Programacion escrita directamente sobre la OT canonica.

Entrega tecnica:
- tabla `maintenance_resource_windows` de acceso servidor;
- API `/api/planning/maintenance`;
- pantalla `/dashboard/planificacion-recursos`.

## Bloque 21 — Operacion movil de terreno
Estado: **Completado**
1. OT asignadas a la persona vinculada al usuario autenticado.
2. Inicio, notas y mano de obra sobre registros existentes.
3. Repuestos, historial y cierre mantenidos en la OT canonica.

Entrega tecnica:
- API `/api/field/work-orders`;
- pantalla `/dashboard/terreno`.

## Bloque 22 — Entrega de turno y continuidad operacional
Estado: **Completado**

1. **Entrega referenciada, no duplicada**
   - el turno saliente se identifica por la persona vinculada al usuario;
   - cada entrega referencia al siguiente responsable y, cuando corresponde, una OT y/o equipo reales;
   - la tabla solo guarda el pendiente explicito, riesgo y estado de recepcion.

2. **Continuidad visible**
   - el receptor ve sus entregas pendientes;
   - OT, equipo y nombres se resuelven desde las entidades canonicas al leer la entrega;
   - el historial conserva emisor, receptor, fecha y estado.

3. **Recepcion controlada**
   - solo la persona receptora puede confirmar la entrega;
   - confirmar no cambia el estado de la OT ni del equipo;
   - no se inventa cierre ni resolucion del pendiente operacional.

Resultado operativo:
`Persona saliente → Pendiente real → OT/Equipo → Persona entrante → Recepcion → Continuidad`

Entrega tecnica:
- tabla `operational_shift_handovers` de acceso servidor;
- API `/api/operations/handovers`;
- pantalla `/dashboard/entrega-turno`.

## Bloque 23 — Centro de cumplimiento y auditoria operacional
Estado: **Siguiente**

1. Revisiones sobre OT, documentos, preventivos y acciones usando criterios verificables.
2. Hallazgos con referencia al registro fuente, responsable y estado de resolucion.
3. Evidencia de cierre y trazabilidad de quien reviso y cuando, sin inventar cumplimiento.

Resultado esperado:
`Registro canonico → Revision → Hallazgo → Responsable → Evidencia → Cierre`

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
**Bloque 23 — Centro de cumplimiento y auditoria operacional.**
