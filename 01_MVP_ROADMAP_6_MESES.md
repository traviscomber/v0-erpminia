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

La base funcional cubre autenticacion, roles, produccion, mantenimiento, ordenes de trabajo, inventario, compras, recepciones parciales, devoluciones, conciliacion de facturas, proveedores, productos, documentos, personas, calendario, planes preventivos, centro ejecutivo de decisiones y relaciones entre equipos, repuestos, proveedores y costos.

## Bloques completados recientemente

### Mantenimiento conectado

- Equipo 360° con identificacion, estado y accesos relacionados;
- ordenes, componentes, personas, documentos, costos y tiempos conectados;
- entrega, instalacion y devolucion de repuestos;
- costo final real y bloqueo de cierre con pendientes;
- mano de obra, servicios externos e informe final;
- planes preventivos por equipo, frecuencia y proxima fecha;
- vencimientos visibles y generacion controlada de ordenes preventivas.

### Control ejecutivo conectado

- excepciones verificadas de mantenimiento, preventivos, inventario, documentos y finanzas;
- prioridades ordenadas por severidad y fecha registrada;
- area responsable y acceso directo al flujo operacional correspondiente;
- actividad de ordenes de trabajo comparada entre los ultimos 7 dias y los 7 anteriores;
- sin indices sinteticos de salud, eficiencia artificial ni predicciones sin datos canonicos.

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

Estado: **Completado**

1. **Excepciones operacionales verificadas**
   - ordenes de trabajo vencidas;
   - ordenes abiertas de prioridad alta o critica;
   - preventivos vencidos o proximos sin OT generada;
   - repuestos bajo nivel de reorden o sin stock;
   - documentos registrados dentro de su ventana de vencimiento;
   - compromisos financieros vencidos y contratos proximos a vencer.

2. **Decision y responsabilidad operacional**
   - severidad critica, atencion o seguimiento;
   - area responsable identificada por dominio operacional;
   - fecha y monto cuando existen en la fuente;
   - acceso directo al registro o modulo que permite resolver la excepcion.

3. **Lectura ejecutiva sin simulacion**
   - conteo directo de decisiones abiertas y criticas;
   - monto pendiente obtenido de compromisos financieros registrados;
   - comparacion de OT abiertas y completadas en los ultimos 7 dias contra los 7 anteriores;
   - eliminacion de indices sinteticos de salud, eficiencia artificial y predicciones sin fuente canonica.

Resultado operativo:

`Dato operacional → Excepcion verificada → Area responsable → Accion requerida → Seguimiento`

Entrega tecnica:

- API canonica `/api/dashboard/ia-operacional` transformada en feed ejecutivo de decisiones;
- pantalla `/dashboard/ia-operacional` reemplazada por el Centro ejecutivo de decisiones;
- alias funcional `/dashboard/decisiones`;
- reutilizacion del snapshot operacional y tablas existentes, sin nuevas tablas ni datos ficticios.

## Bloque 16 — Seguridad, permisos y aislamiento por organizacion

Estado: **Completado**

1. **Aislamiento organizacional verificable**
   - lectura publica eliminada de `profiles`, `user_roles` y `organizations`;
   - ordenes de trabajo, preventivos, compras, stock y movimientos aislados por membresia organizacional;
   - todas las tablas publicas con `organization_id` que estaban expuestas fueron incorporadas a RLS;
   - tablas legacy con relacion verificable heredan organizacion desde usuario, planta, equipo, contrato, zona u OT.

2. **Superficies privilegiadas cerradas**
   - funciones mutadoras `SECURITY DEFINER` retiradas de `PUBLIC`, `anon` y `authenticated`;
   - helpers antiguos de login y eventos retirados de exposicion RPC directa;
   - `search_path` fijado en funciones antiguas revisadas;
   - vistas canonicas expuestas cambiadas a `security_invoker`;
   - vista materializada de mantenimiento retirada del Data API directo.

3. **Legacy sin pertenencia inventada**
   - tablas agregadas antiguas sin una clave organizacional real quedan server-only;
   - RLS esta activado y los grants directos a `anon`/`authenticated` fueron retirados;
   - el backend con service role conserva acceso para compatibilidad y migracion gradual;
   - no se modificaron ni eliminaron registros historicos.

Validacion:

- Security Advisor sin errores de RLS ni advertencias de funciones `SECURITY DEFINER` expuestas;
- usuario autenticado limitado a su organizacion en tablas operacionales probadas;
- `anon` sin acceso a tablas operacionales protegidas;
- superficies server-only verificadas sin privilegios de lectura para `anon` ni `authenticated`;
- permanece una advertencia de configuracion global de Supabase Auth: proteccion de contrasenas filtradas desactivada, fuera del esquema SQL del bloque.

Resultado operativo:

`Sesion → Membresia → Organizacion → RLS → API de servidor → Registro autorizado`

## Bloque 17 — QA operacional y lanzamiento estable

Estado: **Siguiente**

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

Comenzar el **Bloque 17 — QA operacional y lanzamiento estable**:

1. probar cadenas completas de mantenimiento, inventario, compras, documentos y decisiones con datos reales existentes;
2. revisar permisos, rutas, estados vacios, errores, importaciones y exportaciones sin alterar datos historicos;
3. corregir regresiones, validar responsive/rendimiento y cerrar la lista de lanzamiento estable.
