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
La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, planes preventivos, Equipo/Proveedor/Producto 360, centro ejecutivo de decisiones, aislamiento por organizacion, QA de lanzamiento, bandeja personal de acciones, reglas seguras de aviso, planificacion de recursos y operacion personal de terreno.

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

1. **Trabajo personal asignado**
   - el usuario se vincula a `people` por email dentro de la organizacion activa;
   - la vista muestra solamente OT activas con `assigned_person_id` igual a esa persona;
   - si no existe vinculacion, se informa sin inferir identidad ni mostrar OT ajenas.

2. **Ejecucion sobre registros existentes**
   - iniciar trabajo actualiza la OT original a `in_progress` y conserva/establece su `start_date`;
   - notas de terreno se registran como `work_order_events`;
   - intervalos de trabajo se registran en `work_order_labor_entries` con inicio y termino explicitos.

3. **Continuidad con la OT completa**
   - repuestos se resumen desde `work_order_parts`;
   - historial se lee desde eventos y mano de obra reales;
   - repuestos, materiales y cierre se mantienen en la OT canonica existente, sin cierre rapido paralelo.

Resultado operativo:
`Tecnico → Persona canonica → OT asignada → Inicio/Nota/Horas → Repuestos → OT canonica`

Entrega tecnica:
- API `/api/field/work-orders`;
- pantalla movil `/dashboard/terreno`;
- sin nuevas tablas ni duplicacion de OT.

## Bloque 22 — Entrega de turno y continuidad operacional
Estado: **Siguiente**

1. Registro de entrega de turno vinculado a OT, equipos y responsables reales.
2. Pendientes y riesgos que deben continuar en el siguiente turno.
3. Confirmacion de recepcion por el siguiente responsable sin alterar la fuente operacional.

Resultado esperado:
`Turno saliente → Pendientes reales → Entrega → Recepcion → Continuidad`

## Bloque 23 — Centro de cumplimiento y auditoria operacional
Estado: **Planificado**

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
**Bloque 22 — Entrega de turno y continuidad operacional.**
