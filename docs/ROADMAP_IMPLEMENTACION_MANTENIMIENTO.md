# Roadmap de implementacion - Mantenimiento

## Objetivo

Cerrar el modulo de mantenimiento con datos reales, copy en espanol simple y sin romper flujos ya operativos.

## Regla base

- No usar mock data en pantallas visibles de produccion.
- No borrar data real.
- No introducir textos en ingles en nuevas pantallas.
- Si un texto no puede llevar tilde por codificacion, dejarlo sin tilde pero completo.
- Validar build antes de cada push.

## Estado actual

Hoy el modulo ya tiene base funcional para:

- crear y listar ordenes de trabajo
- ver activos y vehiculos
- revisar documentos del modulo
- agrupar ordenes por centro de costo
- conectarse con telemetria y alertas

Lo que falta es cerrar la experiencia para operacion diaria y dejar una secuencia clara de uso.

## Orden de implementacion

### 1. Flujo base de ordenes de trabajo

- estabilizar crear OT
- asegurar vista de detalle de OT
- mejorar cierre de OT con evidencia
- dejar estados y prioridades consistentes

### 2. Activos y bitacora por equipo

- consolidar historial por activo
- mostrar fallas, mantenimientos y repuestos instalados
- preparar acceso por QR por equipo
- dejar la bitacora lista para consulta rapida

### 3. Planificacion preventiva

- mostrar mantenimientos proximos
- listar atrasos y trabajos en ejecucion
- sumar disponibilidad por equipo
- preparar vista tipo calendario o Gantt

### 4. Integracion con bodega

- asociar repuestos usados a la OT
- reservar stock al planificar
- descontar stock al cerrar
- mostrar costo de repuestos y consumo

### 5. Costos e indicadores

- costo por orden
- costo por equipo
- MTTR
- disponibilidad mecanica y fisica
- resumen de atrasos y cumplimiento

### 6. Movilidad y terreno

- abrir OT desde celular
- cerrar OT desde celular
- subir fotos
- registrar repuestos usados
- firmar trabajo

### 7. Gestion documental

- manuales
- procedimientos
- informes tecnicos
- certificados
- fotografias y respaldo

### 8. Dashboard gerencial

- total equipos
- operativos
- detenidos
- OT abiertas
- OT cerradas
- OT atrasadas

## Primer bloque a ejecutar

1. Dar accesos rapidos claros desde el dashboard de mantenimiento.
2. Revisar la pantalla de OT para que el usuario siempre tenga una siguiente accion.
3. Dejar visibles vehiculos, documentos y centro de costo.

## Definition of done

- Pantallas clave en espanol
- Datos reales
- Sin textos rotos
- Sin errores de build
- Sin perdida de informacion existente
- Flujo entendible para usuario operativo

