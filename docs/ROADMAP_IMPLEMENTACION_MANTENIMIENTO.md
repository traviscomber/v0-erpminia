# Roadmap de implementacion - Mantenimiento y estabilizacion

## Objetivo

Cerrar el modulo de mantenimiento con datos reales, copy en espanol simple y sin romper flujos ya operativos.
Mantener una base comun para que todos los modulos acepten datos reales, importacion Excel y actualizacion segura del sistema.

## Regla base

- No usar mock data en pantallas visibles de produccion.
- No borrar data real.
- No introducir textos en ingles en nuevas pantallas.
- Si un texto no puede llevar tilde por codificacion, dejarlo sin tilde pero completo.
- Validar build antes de cada push.

## Estado actual

Hoy el producto esta en una fase intermedia de consolidacion. La estimacion real de completitud es de ~60% del alcance total. El sistema ya tiene base funcional para:

- crear y listar ordenes de trabajo
- ver activos y vehiculos
- revisar documentos del modulo
- agrupar ordenes por centro de costo
- conectarse con telemetria y alertas

Lo que falta es cerrar la experiencia para operacion diaria, normalizar cargas Excel, consolidar sostenibilidad como modulo primero y dejar una secuencia clara de uso.

## Orden de implementacion

### Fase 1. Estabilidad y sostenibilidad

- estabilizar crear OT
- asegurar vista de detalle de OT
- mejorar cierre de OT con evidencia
- dejar estados y prioridades consistentes
- completar sostenibilidad como modulo operativo principal
- unificar importacion Excel en capacitaciones, EPP, maquinaria, equipos e inspecciones
- dejar validaciones y templates de carga consistentes en todas las pantallas de importacion

### Fase 2. Activos, maquinaria y bitacora por equipo

- consolidar historial por activo
- mostrar fallas, mantenimientos y repuestos instalados
- preparar acceso por QR por equipo
- dejar la bitacora lista para consulta rapida
- cerrar maquinaria y equipos como fuentes reales de datos
- agregar importacion masiva para activos y equipos
- dejar EPP con catalogo util para mineria
- preparar telemetria LAN para recibir datos desde una maquina local de la Patagua

### Fase 3. Planificacion preventiva y bodega

- mostrar mantenimientos proximos
- listar atrasos y trabajos en ejecucion
- sumar disponibilidad por equipo
- preparar vista tipo calendario o Gantt
- asociar repuestos usados a la OT
- reservar stock al planificar
- descontar stock al cerrar
- mostrar costo de repuestos y consumo
- dejar importacion Excel estandar para bodega y capacitaciones

### Fase 4. Costos e indicadores

- costo por orden
- costo por equipo
- MTTR
- disponibilidad mecanica y fisica
- resumen de atrasos y cumplimiento
- tablero gerencial con datos consolidados y confiables

### Fase 5. Movilidad y terreno

- abrir OT desde celular
- cerrar OT desde celular
- subir fotos
- registrar repuestos usados
- firmar trabajo
- flujos livianos para operacion en terreno

### Fase 6. Gestion documental y aprobaciones

- manuales
- procedimientos
- informes tecnicos
- certificados
- fotografias y respaldo
- cerrar trazabilidad documental por modulo
- mantener aprobaciones sin errores de build y sin estados inconsistentes

### Fase 7. Dashboard gerencial y cierre del MVP

- total equipos
- operativos
- detenidos
- OT abiertas
- OT cerradas
- OT atrasadas
- resumen ejecutivo por modulo
- vista de avance contra roadmap
- alertas de brechas funcionales pendientes

## Proximos 4 meses

### Mes 1
- estabilizar sostenibilidad
- estandarizar importacion Excel
- cerrar maquinaria, equipos y EPP

### Mes 2
- mejorar mantenimiento y bitacoras
- conectar telemetria LAN sin romper CSP ni runtime
- reforzar bodega e inventario con cargas reales

### Mes 3
- indicadores, costos y tablero gerencial
- movilidad de terreno
- documentacion y aprobaciones

### Mes 4
- hardening final
- pruebas de flujo completo
- ajuste de datos reales
- cierre del MVP con roadmap de evolucion

## Primer bloque a ejecutar

1. Dar accesos rapidos claros desde el dashboard de mantenimiento.
2. Revisar la pantalla de OT para que el usuario siempre tenga una siguiente accion.
3. Dejar visibles vehiculos, documentos y centro de costo.
4. Normalizar importacion Excel en todos los modulos que actualizan data.
5. Cerrar sostenibilidad antes de expandir funcionalidad nueva.

## Definition of done

- Pantallas clave en espanol
- Datos reales
- Sin textos rotos
- Sin errores de build
- Sin perdida de informacion existente
- Flujo entendible para usuario operativo
- Roadmap de 4 meses alineado con el estado real del proyecto

