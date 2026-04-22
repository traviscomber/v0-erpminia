# n3uralia ERP - Guía de Usuario

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Módulo Producción](#módulo-producción)
3. [Módulo Mantención](#módulo-mantención)
4. [Módulo Bodega](#módulo-bodega)
5. [Módulo HSE](#módulo-hse)
6. [Módulo Documentos](#módulo-documentos)
7. [FAQ](#faq)
8. [Soporte](#soporte)

## Introducción

n3uralia ERP es una plataforma integral de gestión para empresas mineras y contratistas. Diseñada para optimizar operaciones, mejorar seguridad y cumplir normas regulatorias.

### Acceso al Sistema
1. Dirígete a https://n3uralia.com/erp
2. Ingresa tu correo electrónico y contraseña
3. Se abrirá el dashboard principal

### Navegación Principal
- **Dashboard**: Vista general de KPIs y alertas
- **Módulos**: Acceso a los 5 módulos según tu rol
- **Alertas**: Centro de notificaciones en tiempo real
- **Roles**: Matriz de permisos y gestión de usuarios
- **Configuración**: Preferencias y opciones de cuenta

---

## Módulo Producción

### Vista General
Monitorea en tiempo real la telemetría de tus equipos, sensores y líneas de producción.

### Funciones Principales
- **Dashboard en Vivo**: Gráficos de sensores con actualización en tiempo real
- **Alarmas Activas**: Alertas críticas con historial
- **Estado de Equipos**: Disponibilidad y uptime de activos
- **Reportes**: Análisis histórico de producción

### Paso a Paso: Interpretar Datos en Vivo
1. Abre el módulo Producción desde el sidebar
2. Observa el dashboard con 4 gráficas:
   - Temperatura (°C)
   - Presión (bar)
   - Velocidad (rpm)
   - Vibraciones (mm/s)
3. Las líneas rojas indican valores críticos
4. Las alarmas aparecen en el panel de la derecha

### Tips
- Revisa las alarmas cada 2 horas
- Configura notificaciones push en preferencias
- Descarga reportes semanales para análisis

---

## Módulo Mantención

### Vista General
Gestiona órdenes de trabajo, programación preventiva y activos.

### Funciones Principales
- **Crear Orden de Trabajo**: Asigna tareas a técnicos
- **Seguimiento en Vivo**: Rastrea progreso de OT
- **Gestión de Activos**: Historial de mantenimiento por equipo
- **Mantenimiento Preventivo**: Programa tareas recurrentes

### Paso a Paso: Crear una Orden de Trabajo
1. Click en "Nueva Orden"
2. Completa los campos:
   - **Equipо**: Selecciona de la lista
   - **Tipo**: Preventiva / Correctiva / Predictiva
   - **Prioridad**: Baja / Media / Alta / Crítica
   - **Descripción**: Detalle de la tarea
   - **Técnico Asignado**: Busca por nombre
   - **Fecha Programada**: Cuándo debe realizarse
3. Adjunta documentos relevantes
4. Click en "Crear Orden"
5. La OT es notificada automáticamente al técnico

### Estados de OT
- **Pendiente**: Aguardando inicio
- **En Progreso**: El técnico está trabajando
- **Completada**: Finalizada y supervisada
- **Cancelada**: Descontinuada

### Tips
- Crea OT preventivas el lunes de cada semana
- Revisa MTTR (Mean Time To Repair) en reportes
- Adjunta fotos de antes y después

---

## Módulo Bodega

### Vista General
Control de inventario, movimientos de stock y reórdenes automáticas.

### Funciones Principales
- **Stock en Vivo**: Cantidad actual de cada item
- **Movimientos**: Entrada/Salida de piezas
- **Alertas de Stock**: Notificaciones automáticas
- **Trazabilidad FIFO**: Control de lotes y vencimiento
- **Reórdenes**: Sugerencias automáticas

### Paso a Paso: Registrar Movimiento
1. Click en "Registrar Movimiento"
2. Selecciona el tipo:
   - **Entrada**: Recepción de materiales
   - **Salida**: Consumo o entrega
3. Busca el item por código o nombre
4. Ingresa cantidad
5. Escanea QR (opcional)
6. Añade observaciones
7. Click en "Registrar"
8. El stock se actualiza en tiempo real

### Alertas de Stock
- **Crítico (Rojo)**: Por debajo del mínimo
- **Bajo (Amarillo)**: Próximo a reorden
- **Normal (Verde)**: Stock adecuado
- **Exceso (Gris)**: Por encima del máximo

### Tips
- Usa códigos QR para evitar errores
- Revisa alertas críticas cada mañana
- Planifica compras con 2 semanas de anticipación

---

## Módulo HSE

### Vista General
Reporta incidentes, gestiona cumplimiento normativo y auditorías.

### Funciones Principales
- **Reportar Incidente**: Documenta eventos de seguridad
- **Cumplimiento SERNAGEOMIN**: Auditoría automatizada
- **Flujo de Aprobaciones**: Validación multinivel
- **Índice de Compliance**: Métrica agregada

### Paso a Paso: Reportar un Incidente
1. Click en "Reportar Incidente"
2. Completa la información:
   - **Tipo**: Accidente / Incidente / Cerca de accidente
   - **Severidad**: Bajo / Medio / Alto / Crítico
   - **Área**: Selecciona ubicación
   - **Descripción**: Detalles de qué pasó
   - **Causa Raíz**: Por qué sucedió
   - **Acción Correctiva**: Qué se hará
3. Adjunta fotos/evidencia
4. Asigna responsable de seguimiento
5. Click en "Enviar"
6. Se escala a supervisión automáticamente

### Compliance
El sistema valida automáticamente:
- Documentación completa
- Certificados vigentes
- Auditorías programadas
- Requisitos SERNAGEOMIN

### Tips
- Reporta INMEDIATAMENTE cualquier incidente
- Toma fotos del área y equipos afectados
- Asigna follow-up dentro de 24 horas

---

## Módulo Documentos

### Vista General
Gestión centralizada de documentos, versiones y aprobaciones.

### Funciones Principales
- **Carga de Documentos**: Sube PDFs, Word, Excel
- **Versionado**: Historial completo de cambios
- **Aprobaciones**: Flujo multinivel (Manager → Director → Compliance)
- **Categorización**: Contratos, Adquisiciones, Procedimientos, Seguridad, Reportes
- **Notificaciones**: Vencimientos y pendientes

### Paso a Paso: Cargar un Documento
1. Click en "Nuevo Documento"
2. Selecciona categoría
3. Ingresa nombre y descripción
4. Carga el archivo
5. Especifica:
   - **Propietario**: Quién es responsable
   - **Vencimiento**: Cuándo expira (si aplica)
   - **Aprobadores**: Quién debe aprobar
6. Click en "Subir"
7. El documento entra en flujo de aprobación

### Flujo de Aprobación
1. **Manager**: Revisa contenido técnico
2. **Director**: Aprueba decisiones comerciales
3. **Compliance**: Valida cumplimiento normativo

Cada nivel puede aprobar, solicitar cambios o rechazar.

### Versionado
Cada vez que subes una nueva versión:
- Se mantiene el historial completo
- Se registra quién cambió qué
- Se puede comparar versiones
- Se puede restaurar versiones anteriores

### Tips
- Nombra archivos con formato: [Tipo]_[Fecha]_v1.pdf
- Carga documentos 1 semana antes de aprobación
- Revisa vencimientos en el dashboard

---

## FAQ

### ¿Cómo recupero mi contraseña?
1. Click en "¿Olvidaste tu contraseña?"
2. Ingresa tu correo
3. Abre el email recibido
4. Click en el link de recuperación
5. Establece nueva contraseña

### ¿Quién tiene acceso a mis datos?
Según tu rol:
- **Operador**: Solo sus propios registros
- **Técnico**: Sus OT asignadas
- **Responsable Bodega**: Todo el inventario
- **Oficial HSE**: Todos los incidentes
- **Supervisor**: Vista completa del sistema

### ¿Qué pasa si pierdo conexión a internet?
El módulo Técnico de Campo está preparado para offline:
- Continúa registrando datos localmente
- Se sincroniza automáticamente cuando vuelve la conexión
- No pierdes información

### ¿Cómo puedo exportar reportes?
1. Abre el módulo deseado
2. Click en "Descargar Reporte"
3. Selecciona período y formato (PDF/Excel)
4. Click en "Generar"
5. El archivo se descarga automáticamente

### ¿Cuál es el horario de mantenimiento?
El sistema tiene mantenimiento programado:
- **Domingos 2am - 4am (Hora Chile)**
- Duración típica: 1 hora
- Se notifica con 48 horas de anticipación

---

## Soporte

### Contacto
- **Email**: support@n3uralia.com
- **Teléfono**: +56 2 XXXX-XXXX
- **Chat en Vivo**: Disponible en interfaz (de lunes a viernes)
- **Centro de Ayuda**: help.n3uralia.com

### Reportar un Problema
1. Click en tu avatar (esquina superior derecha)
2. Click en "Reportar Problema"
3. Selecciona categoría
4. Describe el problema detalladamente
5. Incluye captura de pantalla si es posible
6. Click en "Enviar"
7. Recibirás ticket number por email

### Nivel de Soporte por Rol
- **Tier 1**: Email dentro 24 horas
- **Tier 2**: Chat en vivo, máx 30 min
- **Tier 3**: Phone support, crítico máx 2 horas

---

## Glosario

- **OT**: Orden de Trabajo
- **MTTR**: Mean Time To Repair (Tiempo promedio de reparación)
- **FIFO**: First In First Out (Entrada/Salida por orden de llegada)
- **HSE**: Health, Safety & Environment
- **SERNAGEOMIN**: Servicio Nacional de Geología y Minería
- **RLS**: Row Level Security (Seguridad a nivel de fila)
- **API**: Application Programming Interface

---

**Última actualización**: 2026-04-22
**Versión**: 1.0
**Contacto**: support@n3uralia.com
