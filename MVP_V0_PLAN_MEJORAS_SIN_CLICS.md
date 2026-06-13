# Motil MVP v0 - Plan de mejoras sin clics

Version: 1.0
Fecha: 2026-06-13
Estado: Guia de ejecucion
Horizonte: 4 meses

## Objetivo

Este documento define el plan de mejoras del MVP v0 con una meta simple:

- reducir al minimo las acciones repetitivas
- reemplazar navegacion innecesaria por flujos guiados
- convertir trabajo manual en defaults, plantillas y automatizaciones
- mantener el sistema operable en dev sin depender de botones para todo

La regla base es esta:

- si una tarea se repite 3 veces por semana, debe transformarse en plantilla, accion masiva, automatizacion o default inteligente

## Principios de producto

1. Menos pantallas, mas contexto.
2. Menos botones visibles, mas acciones utiles.
3. Menos formularios largos, mas pasos cortos.
4. Menos memoria humana, mas sugerencias del sistema.
5. Menos trabajo manual repetido, mas flujos automaticos.
6. Menos mock, mas datos reales y respuestas claras.
7. Menos navegacion lateral, mas bandejas de trabajo por modulo.

## Lo que queremos mejorar

Los puntos de dolor actuales suelen ser:

- abrir muchas pantallas para completar una sola tarea
- repetir los mismos campos en varios modulos
- confirmar acciones varias veces cuando el sistema ya conoce el contexto
- buscar registros en listas largas sin filtros persistentes
- crear el mismo tipo de registro desde cero una y otra vez
- depender de botones manuales donde podria haber sugerencias o automatizacion

## Experiencia objetivo

Queremos que Motil se sienta asi:

- entro a un modulo y veo pendientes, alertas y acciones rapidas
- no tengo que buscar donde crear algo si el sistema ya sabe lo que necesito
- si ya existe una plantilla, la uso
- si ya cargue datos antes, el sistema los reutiliza
- si una tarea tiene mas de una accion posible, el sistema prioriza la correcta
- si hay varios registros iguales, puedo trabajar en lote

## Patrón de diseño para todos los modulos

Cada modulo debe tener siempre:

1. Resumen arriba
2. Pendientes al medio
3. Acciones rapidas al lado o en dropdown
4. Lista o tabla debajo
5. Detalle lateral o modal para no perder contexto

## Flujo general de mejoras

### Fase 1. Reducir clics

Objetivo:

- hacer que las tareas mas comunes requieran 1 o 2 interacciones maximo

Acciones:

- agregar acciones masivas
- agregar duplicar registro
- agregar crear desde plantilla
- agregar autosave en formularios largos
- agregar filtros persistentes
- mover acciones raras a menus secundarios
- usar side panel en vez de abrir paginas nuevas

### Fase 2. Automatizar lo repetido

Objetivo:

- eliminar pasos manuales que el sistema ya puede inferir

Acciones:

- crear registros derivados automaticamente
- disparar notificaciones por evento
- sugerir responsables por historial o rol
- autocompletar campos frecuentes
- crear tareas desde alertas, hallazgos y vencimientos
- generar recordatorios y resumos diarios/semanales

### Fase 3. Consolidar la operacion

Objetivo:

- que el usuario vea todo lo que necesita hacer en una sola bandeja

Acciones:

- command palette global
- inbox de trabajo por usuario/rol
- panel de pendientes por modulo
- vistas guardadas por tipo de trabajo
- estados y KPIs visibles sin entrar a detalle

### Fase 4. Madurez del producto

Objetivo:

- pasar de un MVP funcional a una plataforma operacional realmente agil

Acciones:

- analitica de uso
- sugerencias inteligentes
- reglas por rol
- aprobaciones asistidas
- versionado documental
- firma digital donde aporte valor

## Mejoras transversales

### 1. Busqueda global

- una sola busqueda para documentos, contratos, OT, alertas, inspecciones y KPIs
- filtros por modulo, estado, fecha, responsable y criticidad
- resultados con vista previa y accion directa

### 2. Acciones masivas

Casos ideales:

- aprobar varios documentos
- cambiar estado de varias OT
- mover varios materiales de bodega
- cerrar varias alertas
- asignar varias acciones correctivas

### 3. Plantillas

Debe existir "crear desde plantilla" para:

- documentos
- contratos
- inspecciones
- acciones correctivas
- capacitaciones
- carpetas de arranque
- OT repetitivas

### 4. Duplicar y reutilizar

Todo registro que tenga alta recurrencia debe poder:

- duplicarse
- reutilizar campos anteriores
- arrastrar adjuntos o plantillas
- guardar como favorito

### 5. Autosave

Aplicar en:

- formularios largos
- ediciones de documentos
- registros de inspecciones
- flujos de aprobacion con observaciones largas

### 6. Estados inteligentes

El sistema debe mostrar:

- que ya esta listo
- que requiere accion
- que vence pronto
- que esta bloqueado
- que necesita aprobacion

## Plan por modulo

### Documentos

Objetivo:

- que cargar, revisar y aprobar documentos sea rapido y trazable

Mejoras:

- carga multiple drag and drop
- validacion de archivos antes de subir
- versionado al reemplazar archivo
- aprobacion en lote
- comentarios reutilizables
- plantillas por tipo documental
- filtros guardados
- recordatorios de vencimiento
- estado visible en la tabla sin abrir detalle

### Legal

Objetivo:

- que contratos y documentos legales se gestionen como una sola operacion, no como 3 o 4 pantallas separadas

Mejoras:

- crear contrato desde plantilla
- duplicar contrato similar
- precargar contratista, fechas y tipo
- vincular respaldo documental automaticamente
- resumen de cumplimiento arriba de la tabla
- upload de respaldo con validacion
- reportes automaticos de vencimiento
- contratos como subflujo dentro de documentos cuando corresponda

### Sostenibilidad

Objetivo:

- que el flujo sea continuo: evento, hallazgo, accion, evidencia, cierre

Mejoras:

- calendario con acciones inline
- inspecciones con checklist reutilizable
- NC que generen acciones correctivas sugeridas
- aprobaciones con contexto
- evidencia por lote
- filtros persistentes por estado, tipo y responsable
- resumen ejecutivo sin abrir submodulos
- trayectorias de tarea: hallazgo -> accion -> cierre

### HSE

Objetivo:

- registrar menos, decidir mejor

Mejoras:

- plantillas por puesto de trabajo
- entrega de EPP por lote
- sugerencia de incidentes frecuentes
- formularios cortos para reportes
- tablero de incidentes con CTA claros
- indicadores visibles sin drill-down constante

### Mantenimiento

Objetivo:

- crear y cerrar OT sin friccion

Mejoras:

- crear OT desde alerta o activo
- clonar OT similar
- sugerir repuestos por historial
- autocompletar campos recurrentes
- cierre guiado con evidencia
- resumen por criticidad y vencimiento

### Bodega

Objetivo:

- registrar movimientos y disponibilidad sin navegacion extra

Mejoras:

- escaneo QR como flujo principal
- entrada y salida rapidas
- sugerencias de reposicion
- ajustes masivos
- movimiento desde contexto de OT o compra
- alertas de stock bajo automaticas

### Produccion

Objetivo:

- ver la operacion, no solo mirar tarjetas

Mejoras:

- vista de alertas y estados en una sola pagina
- cierre rapido de alarmas
- timeline de eventos recientes
- sugerencias por umbral
- detalle lateral de equipo

### Compras

Objetivo:

- convertir compras en un flujo corto, no en burocracia

Mejoras:

- crear OC desde repuesto faltante
- copiar proveedores y lineas frecuentes
- aprobacion simple
- resumen de estado antes del formulario

### Finanzas

Objetivo:

- leer la salud financiera sin abrir diez pestañas

Mejoras:

- KPIs arriba
- acciones rapidas para documentos financieros
- filtros persistentes
- exportacion con una sola accion

### IA Operacional

Objetivo:

- que la IA resuma, sugiera y clasifique, no que obligue a navegar mas

Mejoras:

- resumos automaticos
- sugerencias accionables
- clasificacion de alertas
- respuestas ligadas a registros reales

## Prioridad de desarrollo

### Prioridad 1

- Legal
- Documentos
- Sostenibilidad

### Prioridad 2

- Mantenimiento
- Ordenes de Trabajo
- Bodega
- Produccion

### Prioridad 3

- Compras
- Finanzas
- Reportes
- IA Operacional
- Dashboard KPI

### Prioridad 4

- UX polish
- versionado
- firma digital
- mejoras visuales no bloqueantes

## Reglas de implementacion

1. No crear una pantalla nueva si una accion lateral resuelve mejor el problema.
2. No dejar un modulo con mock en su camino principal.
3. No repetir formularios manualmente si se puede usar plantilla o duplicado.
4. No pedir un dato dos veces si ya existe en otra parte del sistema.
5. No sacar al usuario del contexto salvo que sea absolutamente necesario.
6. No agregar dependencies nuevas si el problema se resuelve con el stack actual.

## Definition of Done por mejora

Una mejora se considera terminada si:

1. reduce pasos visibles
2. mantiene trazabilidad
3. tiene estado de error claro
4. no rompe permisos
5. usa datos reales cuando el modulo ya los tiene
6. se puede explicar en una sola frase al usuario

## KPIs para saber si esto funciono

- tiempo promedio para completar una tarea
- numero de clics por flujo
- numero de formularios completados por lote
- porcentaje de acciones iniciadas desde contexto
- cantidad de registros creados desde plantilla
- porcentaje de flujos con autosave o defaults inteligentes
- cantidad de tareas resueltas sin cambiar de modulo

## Primeros 10 movimientos recomendados

1. Legal y Documentos con tablas reales, upload y aprobaciones.
2. Sostenibilidad completa con datos reales y flujos end to end.
3. Actions masivas para documentos, OT y sostenibilidad.
4. Templates para formularios recurrentes.
5. Duplicar registros en Legal, Documentos y mantenimiento.
6. Autosave en formularios largos.
7. Busqueda global transversal.
8. Notificaciones automáticas por evento.
9. Command palette global.
10. Vistas guardadas por usuario y por rol.

## Cierre

El MVP no deberia sentirse como una suma de botones.
Deberia sentirse como una plataforma operacional minera que guia el trabajo.

Si una persona puede completar su tarea sin pensar donde hacer clic, vamos por el camino correcto.
