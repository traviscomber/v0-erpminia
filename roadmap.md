# Roadmap MVP

Estado base del MVP desde el codigo actual: **74%**.

## Regla de trabajo

- No introducir mock data en pantallas de produccion.
- No borrar data real cargada.
- No romper rutas que ya funcionan.
- Mantener todo el copy en espanol simple.
- Si un texto no puede llevar tilde por codificacion, dejarlo sin tilde pero completo.
- Cada modulo debe cumplir: data real, vacio controlado, error visible y resumen util.

## Objetivo de esta fase

Ir modulo por modulo y dejar claro:

1. donde ya hay data real
2. donde faltan datos o cobertura
3. que inteligencia minera se puede extraer de la data que ya existe

## Orden de trabajo

1. Mantenimiento
2. Sostenibilidad y HSE
3. Bodega e inventario
4. Documentos gestion
5. Legal
6. Telemetria y produccion
7. Compras y finanzas
8. Admin y permisos
9. Alertas y auditoria
10. QA final y produccion

## Auditoria modular

### 1. Mantenimiento

Estado:

- Hay OT, bitacora, planificacion, equipos, vehiculos, costos, combustible, personal, neumaticos, componentes mayores y dashboard gerencial.
- La ruta de entrada ya existe y esta operativa.
- Ya existe inteligencia derivada desde centros de costo para agrupar maquinaria por familia.
- El copy visible del panel y del resumen por centro de costo ya quedo normalizado en espanol simple.

Huecos:

- Aplicacion movil completa para abrir y cerrar OT.
- Horometros por equipo.
- Repuestos instalados, manuales y fotografias dentro de la ficha.
- Control fino de combustible por equipo.
- Control de personal con horas, especialidad y productividad.
- Planificacion a 12 meses.
- Estados completos de reparables.
- Alertas preventivas mas precisas.

Inteligencia minera posible:

- Equipos con mayor costo acumulado.
- OT atrasadas por equipo o por centro de costo.
- MTTR y disponibilidad por clase de activo.
- Consumo de combustible por tipo de equipo.
- Probabilidad de falla por historial.
- Repuestos criticos por curva de uso.

Pendientes concretos para el siguiente bloque:

1. Ficha completa de activo con historial, QR, OT, repuestos y relacion con telemetria.
2. Panel movil operativo para registrar horas, evidencia y cierre de OT en terreno.
3. Normalizar copy de vehiculos, QR, planificacion preventiva y dashboard gerencial.
4. Cerrar estados y catalogos de componentes mayores, neumáticos y reparables.
5. Completar el circuito de personal, combustible y costos por equipo con data real.
6. Revisar rutas legacy para que cada entrada termine en la pantalla canonica en espanol.

### 2. Sostenibilidad y HSE

Estado:

- Hay dashboard, indicadores, documentos, capacitaciones, inspecciones, no conformidades, acciones correctivas, calendario, comunidades, medio ambiente y EPP.
- EPP fue unificado como flujo canonico en sostenibilidad.
- HSE ahora actua como alias de entrada para compatibilidad.
- El panel HSE legado ya apunta a la lectura canonica de sostenibilidad.

Huecos:

- Unificar visualmente algunas pantallas duplicadas restantes.
- Revisar textos residuales en modales y subrutas.
- Completar algunos reportes ejecutivos con mejor resumen.

Inteligencia minera posible:

- Riesgos recurrentes por area o faena.
- Cumplimiento por tipo de documento.
- Capacitaciones pendientes por cargo.
- EPP recomendado por cargo versus EPP real cargado.
- Tendencias de no conformidades y acciones correctivas.

### 3. Bodega e inventario

Estado:

- Hay inventario, importacion, documentos, stock minimo/maximo, compras y trazabilidad.
- Ya existe carga real desde Excel.
- La normalizacion canonica ya agrupa familias y evita duplicados de categoria por labels sueltos.

Huecos:

- Consolidar categorias duplicadas.
- Separar mejor familias, subfamilias y centros de costo.
- Evitar que un import falle y vacie el estado visible.
- Mejorar la vista para stock critico y reposicion.

Inteligencia minera posible:

- Repuestos mas consumidos por familia.
- Stock critico por centro de costo o equipo.
- Tasa de rotacion por categoria.
- Proyeccion de compra por consumo historico.

### 4. Documentos gestion

Estado:

- Hay contratos, procedimientos, seguridad, reportes, eecc y vista principal.
- La estructura ya esta conectada a datos reales.
- La vista principal y el reporte ejecutivo ya quedaron sin texto roto en la carpeta canonica.
- Las rutas principales y subrutas de contratos, procedimientos y seguridad ya quedaron revisadas para seguir usando datos reales.

Huecos:

- Pulir subrutas con copy uniforme.
- Mejorar busqueda avanzada y navegacion interna.
- Cerrar textos residuales en modales compartidos.

Inteligencia minera posible:

- Documentos vencidos o proximos a vencer.
- Trazabilidad por categoria y aprobador.
- Flujo de aprobacion por estado.

### 5. Legal

Estado:

- Hay contratos, documentos legales, permisos y licencias.
- Hay dashboard con data real.
- El copy visible de Legal y de su tracker ya quedo normalizado sin texto roto.

Huecos:

- Mejorar lectura ejecutiva.
- Normalizar copy de modales y formularios.
- Cerrar rutas secundarias y estados vacios.

Inteligencia minera posible:

- Contratos por proveedor.
- Documentos proximos a vencer.
- Riesgo de continuidad por permisos criticos.

### 6. Telemetria y produccion

Estado:

- Ya existen rutas de telemetria, sensores y alerts.
- El modulo esta presente pero aun requiere madurez funcional.
- La pagina de integracion LAN ya expone contrato de ingesta, validacion y payload en texto claro.

Huecos:

- Convertir la telemetria en monitor util de produccion.
- Definir equipos, eventos y alarmas con data real.
- Evitar paneles vacios o decorativos.

Inteligencia minera posible:

- Equipos con comportamiento anomalo.
- Sensores fuera de rango.
- Alertas por patron de detencion.
- Relacion entre telemetria y mantenimiento.

### 7. Compras y finanzas

Estado:

- Hay proveedores, compras, importacion de existencias y documentos.
- La data real ya entra desde Excel.
- La importacion de existencias ya quedo con carga por bloques y barra de progreso para no parecer trabada.

Huecos:

- Mejorar consolidacion de proveedores.
- Revisar costos extremos o atipicos.
- Evitar estados vacios tras fallas de importacion.

Inteligencia minera posible:

- Gasto por proveedor y categoria.
- Compras repetitivas por equipo o centro de costo.
- Alertas de costo anomalo.

### 8. Admin y permisos

Estado:

- Hay usuarios, roles y permisos.
- El acceso por modulo ya existe.

Huecos:

- Pulir textos y estados de acceso.
- Revisar compatibilidad entre permisos y rutas unificadas.

Inteligencia minera posible:

- Quien crea, aprueba y modifica mas.
- Cobertura por rol en cada modulo.

### 9. Alertas y auditoria

Estado:

- Existen alertas y eventos de auditoria.

Huecos:

- Hacerlas mas accionables.
- Separar alertas criticas de ruido operativo.

Inteligencia minera posible:

- Patrones de riesgo.
- Alertas repetidas por area.

### 10. QA final y produccion

Checklist:

- Cero textos rotos o ingles residual visible.
- Cero mock data en pantallas principales.
- Build verde antes de cada push.
- Navegacion unificada donde aplique.
- Error vacio y loading claros en cada modulo.

## Bloque actual recomendado

1. Mantenimiento
2. Telemetria y produccion
3. Bodega e inventario
4. Documentos gestion
5. Legal

## Objetivo actual

Cerrar la cobertura real de fichas tecnicas y maquinaria tomando como base los centros de costo y el inventario real, sin introducir mock data.

En este bloque el foco es:

1. ampliar la ficha tecnica por equipo real
2. asegurar que los nombres derivados desde centros de costo apunten a modelos reales
3. dejar mantenimiento, bodega y telemetria conectados con la misma base de activos
4. mantener copy en espanol simple y estable

## Siguiente paso practico

Auditar modulo por modulo con este orden:

1. identificar pantalla principal
2. identificar fuente de datos
3. detectar vacios o fallback
4. sacar una mejora de inteligencia minera
5. cerrar textos y estados vacios

## Auditoria actual 2026-07-20

Hallazgos verificados en el codigo actual:

### Mantenimiento

- La vista principal ya usa data real, pero aun muestra estados vacios genericos en familias sin derivacion visible.
- Persisten textos como `No hay maquinaria derivada aun desde centros de costo` y `No hay ordenes registradas todavia`.
- La ficha de activo necesita seguir cerrando el circuito de `ficha`, `ficha tecnica`, `arbol` y OT solo para activos reales.
- La vista gerencial sigue teniendo lineas de resumen que pueden afinarse para que cada KPI diga exactamente de donde sale.

### Documentos gestion

- La base funcional ya esta conectada, pero las subrutas de `procedimientos`, `seguridad` y `reportes` siguen teniendo mucho copy de estado vacio.
- Hay varias frases sin tildes y con redaccion uniforme pendiente, por ejemplo en busquedas, vacios y botones secundarios.
- El siguiente ajuste claro es homogeneizar mensajes entre la vista principal y las subrutas.

### Sostenibilidad y HSE

- La pantalla de prevencion de riesgos sigue usando textos genericos como `Fuente conectada al modulo` en varios cards.
- EPP ya esta conectado a la fuente real, pero la experiencia aun necesita mejor lectura ejecutiva cuando hay cero registros o cuando se usa el flujo canonico de sostenibilidad.
- HSE y sostenibilidad siguen conviviendo como superficies cercanas; conviene mantener una unica lectura visual y un alias tecnico claro.

### Bodega e inventario

- La importacion real ya esta, pero las categorias y familias todavia requieren mas limpieza para no duplicar labels.
- Falta reforzar la vista de stock critico y reposicion para que el usuario vea antes lo que se va a quedar corto.
- El flujo de importacion ya evito vaciar data al fallar, asi que el siguiente paso es visual y de normalizacion.

### Legal

- El modulo esta usable con data real, pero tiene todavia vacios y textos secundarios que pueden quedar mas ejecutivos.
- Las pantallas de contratos y documentos legales necesitan la misma terminologia en toda la navegacion.

### Telemetria

- La integracion ya expone contrato y validacion, pero el modulo sigue siendo mas declarativo que operativo.
- Falta convertirlo en un monitor de produccion con eventos y alertas utiles sobre equipos reales.

### Compras y finanzas

- Proveedores, compras e importacion ya estan conectados, pero hay oportunidad de mejorar consolidacion y lectura de costos atipicos.
- Conviene separar mejor la vista de proveedores en finanzas para que quede como bloque propio de acciones y trazabilidad.

### Admin, permisos y alertas

- Usuarios, roles y permisos ya existen, pero aun falta pulir la experiencia de acceso y la relacion con rutas reales.
- Alertas y auditoria tienen base, pero necesitan ser mas accionables y menos ruido operativo.

## Objetivo corto de esta fase

1. Reducir estados vacios genericos.
2. Homogeneizar copy sin inventar data.
3. Separar activos reales de elementos derivados.
4. Mantener rutas y botones solo sobre IDs validos.
5. Seguir cerrando el modulo por modulo sin romper data real.

## Progreso del pase 2026-07-20

Se aplicaron mejoras visibles sin tocar data:

- Mantenimiento: copy de órdenes, equipos críticos y estados vacíos más claro.
- Legal: mensajes de vacíos y revisión más uniformes.
- Documentos gestión: títulos y búsquedas con terminología consistente.
- Telemetría: textos visibles con ortografía y acentos normalizados.
- Bodega: búsqueda y estados de criticidad con copy más limpio.
