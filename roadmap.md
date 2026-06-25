# Roadmap MVP

Estado base del MVP calculado desde el codigo actual: **74%**.

## Objetivo

Cerrar el producto para produccion dejando:

- datos reales en todas las secciones visibles
- copy 100% en espanol simple
- cero textos rotos, ingles residual o caracteres extranos
- flujos principales completos y estables
- build verde antes de cada push

## Fases

### 1. Bloqueo tecnico y estabilidad

- Limpiar textos rotos, acentos mal codificados y labels en ingles restantes.
- Revisar errores de build, warnings criticos y rutas caidas.
- Confirmar que no haya mock data visible en produccion.
- Unificar estilos basicos de copy en modales y pantallas principales.

### 2. Bodega e inventario

- Cerrar importacion y visualizacion de stock real.
- Unificar familias, categorias y centros de costo.
- Evitar duplicados de categorias y normalizar nombres.
- Agregar estados de error y vacio claros.
- Revisar dashboard, filtros y listado para que no se vacie si falla un import.

### 3. Documentos gestion

- Completar contratos, procedimientos, seguridad y reportes.
- Pulir modales compartidos y flujos de aprobacion.
- Cerrar busqueda avanzada y filtros por categoria.
- Revisar subrutas para que todas carguen bien.
- Dejar copy uniforme en todas las pantallas del modulo.

### 4. Legal

- Terminar documentos legales y tracker de contratos.
- Corregir copy visible y uniformar toda la interfaz.
- Validar vencimientos, respaldos y estados.
- Dejar el flujo de revision completo.
- Revisar documentos, contratos y vistas resumen.

### 5. Mantenimiento

- Estado actual:
  - Ordenes de trabajo reales con cierre, detalle y consumo de repuestos.
  - Bitacora historica y planificacion preventiva.
  - Costo por equipo, indicadores, neumaticos y componentes mayores.
  - Vehiculos, arbol de fallas, documentos y centro de costo.
  - Trazabilidad de repuestos reservados y movimiento de partes.
  - QR por equipo con ficha completa, historial y accesos directos.
  - Dashboard gerencial de mantenimiento con KPIs reales.
  - Panel movil de mantencion para terreno y atajos operativos.
- Falta para cerrar el modulo:
  - Aplicacion movil para abrir y cerrar OT, adjuntar fotos, registrar repuestos y firmar trabajos.
  - Horometros por equipo con captura real y trazabilidad por activo.
  - Repuestos instalados, manuales y fotografias por equipo dentro de la ficha.
  - Control de combustible por equipo con cargas, consumo, rendimiento y costo.
  - Control de personal con mecanico responsable, horas, especialidad y productividad.
  - Planificacion a largo plazo de 12 meses con grandes reparaciones, overhaul, cambios y proyeccion de repuestos, presupuesto y personal.
  - Estados completos de repuestos reparables: disponible, instalado, en reparacion, esperando reparacion y baja definitiva.
  - Alertas preventivas mas finas por vencimiento, kilometraje, inspecciones y bajo stock critico.
  - Reportes por equipo con disponibilidad, costos, fallas, repuestos y estado general.
  - Limpieza final de copy, acentos, modales y mensajes residuales de mantenimiento.

### 6. Sostenibilidad

- Cerrar prevencion de riesgos, no conformidades y acciones correctivas.
- Terminar medio ambiente, comunidades y documentos-flujo.
- Revisar calendario, reportes y modales compartidos.
- Unificar copy y dejar todo en espanol simple.
- Validar que los indicadores visibles usen datos reales.

### 7. Telemetria y produccion

- Construir monitor de sensores de produccion.
- Definir entrada real de datos y alertas.
- Conectar equipo, eventos y estados.
- Evitar pantallas vacias o mock.
- Preparar visualizaciones para uso operacional.

### 8. Compras y finanzas

- Cerrar documentos de compras, presupuestos y reportes.
- Revisar ordenes y estados financieros visibles.
- Validar que los totales y resúmenes sean reales.
- Dejar filtros y exportaciones listos.
- Revisar que los modulos secundarios no rompan la navegacion.

### 9. Admin y permisos

- Terminar roles, permisos y restricciones por modulo.
- Revisar usuarios y flujo de administracion.
- Confirmar acceso por perfil en produccion.
- Cerrar pantallas de setup o dejarlas fuera del MVP si no son necesarias.
- Validar accesos basicos de lectura y escritura.

### 10. Alertas y auditoria

- Completar alertas operativas y notificaciones.
- Revisar trazabilidad de cambios y eventos.
- Asegurar que los estados pendientes se reflejen bien.
- Dejar un historial minimo util para soporte.
- Confirmar que las alertas criticas no se pierdan.

### 11. QA funcional

- Probar cada pantalla principal y subruta.
- Verificar que no haya errores al crear, editar o revisar.
- Revisar que todo use datos reales.
- Validar que el sitio completo quede en espanol.
- Confirmar responsive y contraste suficiente.

### 12. Cierre de produccion

- Hacer repaso final visual.
- Revisar contrastes, textos largos y responsividad.
- Confirmar build verde y despliegue estable.
- Dejar checklist de salida a produccion.
- Publicar solo cambios validados.

## Prioridad recomendada

1. Bloqueo tecnico y estabilidad
2. Bodega e inventario
3. Documentos gestion
4. Legal
5. Mantenimiento
6. Sostenibilidad
7. Telemetria y produccion
8. Compras y finanzas
9. Admin y permisos
10. Alertas y auditoria
11. QA funcional
12. Cierre de produccion

## Regla de trabajo

- No introducir mock data en pantallas de produccion.
- No borrar data real cargada.
- No cambiar flujos que ya funcionan sin validar build.
- Mantener todo el copy en espanol simple.
- Si un texto no puede llevar tilde por codificacion, dejarlo sin tilde pero completo.
