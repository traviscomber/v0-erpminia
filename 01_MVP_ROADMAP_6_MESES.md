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
La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, planes preventivos, Equipo/Proveedor/Producto 360, centro ejecutivo de decisiones, aislamiento por organizacion, QA de lanzamiento, bandeja personal de acciones, reglas seguras de aviso, planificacion de recursos, operacion personal de terreno, entrega de turno trazable y auditoria operacional referenciada.

## Bloques 10 a 19
Todos completados: compras inteligentes, Proveedor 360, inventario canonico, Equipo 360, mantenimiento preventivo, centro ejecutivo, seguridad organizacional, QA, acciones personales y automatizaciones seguras.

---

## Bloque 20 — Planificacion avanzada y recursos
Estado: **Completado**
1. Carga real desde OT y preventivos.
2. Ventanas de personas/equipos y conflictos antes de programar.
3. Programacion escrita directamente sobre la OT canonica.

Entrega tecnica:
- `maintenance_resource_windows`;
- `/api/planning/maintenance`;
- `/dashboard/planificacion-recursos`.

## Bloque 21 — Operacion movil de terreno
Estado: **Completado**
1. OT asignadas a la persona vinculada al usuario autenticado.
2. Inicio, notas y mano de obra sobre registros existentes.
3. Repuestos, historial y cierre mantenidos en la OT canonica.

Entrega tecnica:
- `/api/field/work-orders`;
- `/dashboard/terreno`.

## Bloque 22 — Entrega de turno y continuidad operacional
Estado: **Completado**
1. Entrega referenciada a personas, OT y equipos reales.
2. Pendiente y riesgo explicitos sin copiar el estado operacional.
3. Recepcion confirmada solo por el siguiente responsable.

Entrega tecnica:
- `operational_shift_handovers`;
- `/api/operations/handovers`;
- `/dashboard/entrega-turno`.

## Bloque 23 — Centro de cumplimiento y auditoria operacional
Estado: **Completado**

1. **Fuentes auditables con pertenencia verificable**
   - ordenes de trabajo;
   - planes preventivos;
   - registros documentales de mantenimiento con `organization_id`;
   - ejecuciones de automatizaciones seguras con `organization_id`;
   - se excluyen fuentes documentales globales cuya organizacion no puede demostrarse.

2. **Hallazgo referenciado**
   - criterio revisado y hallazgo son declaraciones explicitas del revisor;
   - fuente, responsable, severidad y estado quedan trazados;
   - la informacion de la fuente se resuelve al leer y no se copia a la tabla de auditoria.

3. **Cierre verificable**
   - cerrar exige una descripcion de resolucion;
   - puede agregar una referencia de evidencia: URL, archivo, folio o identificador verificable;
   - se conserva quien reviso, cuando reviso, quien cerro y cuando cerro;
   - cerrar un hallazgo no modifica automaticamente el registro fuente.

Resultado operativo:
`Fuente canonica → Criterio explicito → Hallazgo → Responsable → Resolucion/Evidencia → Cierre trazable`

Entrega tecnica:
- tabla `operational_audit_findings` de acceso servidor;
- API `/api/audit/operational`;
- pantalla `/dashboard/auditoria-operacional`.

## Bloque 24 — Calidad de datos maestros y conciliacion
Estado: **Siguiente**
1. Detectar referencias huerfanas, duplicados candidatos y campos canonicos incompletos sin fusion automatica destructiva.
2. Cola de conciliacion con evidencia y resolucion humana.
3. Indicadores de calidad derivados del estado real de equipos, personas, productos y proveedores.

## Bloque 25 — Telemetria operacional conectada a mantenimiento
Estado: **Planificado**
1. Vincular lecturas reales a equipos canonicos.
2. Convertir condiciones verificables en eventos y excepciones operacionales.
3. Conectar tendencias y limites reales con preventivos y OT sin generar diagnosticos ficticios.

## Bloque 26 — Paradas mayores y campañas de mantenimiento
Estado: **Planificado**
1. Agrupar OT existentes bajo una parada/campana sin duplicarlas.
2. Planificar recursos, materiales, ventanas y dependencias.
3. Seguir avance, bloqueos y costo real desde las fuentes operacionales existentes.

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
**Bloque 24 — Calidad de datos maestros y conciliacion.**
