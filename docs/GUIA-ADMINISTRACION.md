# n3uralia ERP - Guía de Administración

## Tabla de Contenidos
1. [Panel Administrativo](#panel-administrativo)
2. [Gestión de Usuarios](#gestión-de-usuarios)
3. [Gestión de Roles](#gestión-de-roles)
4. [Configuración de Sistema](#configuración-de-sistema)
5. [Monitoreo y Analytics](#monitoreo-y-analytics)
6. [Backups y Recuperación](#backups-y-recuperación)
7. [Troubleshooting](#troubleshooting)

## Panel Administrativo

### Acceso
Solo usuarios con rol "Supervisor/Gerencia" pueden acceder al panel administrativo.

**Ruta**: /dashboard/admin

### Secciones Principales
- Usuarios y Roles
- Configuración General
- Auditoría y Logs
- Monitoreo de Sistema
- Integraciones

---

## Gestión de Usuarios

### Crear Nuevo Usuario
1. Navega a Administración → Usuarios
2. Click en "Nuevo Usuario"
3. Completa el formulario:
   - Nombre completo
   - Email corporativo
   - Área/Departamento
   - Rol (selecciona de lista predefinida)
   - Permisos adicionales (si aplica)
4. Click en "Crear"
5. El usuario recibe email con link de bienvenida
6. Usuario establece su contraseña en primer login

### Editar Usuario
1. En la tabla de usuarios, click en el usuario
2. Modifica los campos deseados
3. Click en "Guardar Cambios"
4. Se registra el cambio en auditoría

### Desactivar Usuario
1. Click en el usuario → Menú de opciones (...)
2. Click en "Desactivar"
3. Confirma la acción
4. El usuario pierde acceso inmediatamente
5. Sus datos quedan intactos (no se eliminan)

### Resetear Contraseña de Usuario
1. Click en el usuario → Menú de opciones (...)
2. Click en "Resetear Contraseña"
3. Se envía email al usuario con link de recuperación
4. El usuario establece nueva contraseña

### Cambiar Rol de Usuario
1. Click en el usuario
2. En "Rol", click en desplegable
3. Selecciona nuevo rol
4. Click en "Guardar"
5. **IMPORTANTE**: El cambio toma efecto en el próximo login

---

## Gestión de Roles

### Roles Predefinidos

**1. Operador de Producción**
- Acceso: Producción, Alertas
- Permisos: Lectura de KPIs, ver alarmas

**2. Jefe de Mantención**
- Acceso: Mantención, Work Orders, Bodega, Dashboards
- Permisos: CRUD completo de OT, asignar técnicos, ver MTTR

**3. Técnico de Campo**
- Acceso: Mantención (móvil), Work Orders, Bodega
- Permisos: Ver OT asignadas, actualizar estado, consumir piezas

**4. Responsable Bodega**
- Acceso: Bodega, Inventario, Compras, Alertas
- Permisos: Gestionar stock, crear movimientos, reórdenes

**5. Oficial HSE/Compliance**
- Acceso: HSE, Documentos, Mantención, Alertas, Reportes
- Permisos: Auditar OT, verificar cumplimiento, generar reportes

**6. Supervisor/Gerencia**
- Acceso: TODOS los módulos
- Permisos: Control total, crear usuarios, ver analytics

### Crear Rol Personalizado
1. Navega a Administración → Roles
2. Click en "Nuevo Rol"
3. Completa la información:
   - Nombre del rol
   - Descripción
4. En "Permisos", selecciona los módulos a los que accede
5. Para cada módulo, elige permisos:
   - Lectura (Read)
   - Crear (Create)
   - Editar (Update)
   - Eliminar (Delete)
6. Click en "Crear Rol"

### Matriz de Permisos
Toda modificación de permisos se registra:
- Usuario: quién hizo el cambio
- Timestamp: cuándo se hizo
- Cambio específico: qué se modificó
- Razón: por qué se hizo (opcional)

---

## Configuración de Sistema

### Parámetros Generales
**Ruta**: Administración → Configuración → General

- **Nombre de Empresa**: Para reportes
- **Logo**: Sube imagen PNG/SVG (max 1MB)
- **Zona Horaria**: Afecta todos los timestamps
- **Formato de Fecha**: DD/MM/YYYY, MM/DD/YYYY, etc.
- **Moneda**: CLP, USD, EUR
- **Idioma por Defecto**: ES, EN

### Configuración de Email
- **Email de Soporte**: Para notificaciones
- **SMTP Server**: Servidor de correo
- **Plantillas**: Personaliza emails de notificación

### Seguridad
- **MFA (Autenticación Multifactor)**: Requerida/Opcional/Deshabilitada
- **Política de Contraseña**: Longitud mínima, complejidad
- **Sesión Timeout**: Inactividad máxima permitida
- **IP Whitelist**: Restringir acceso a IPs específicas

### Auditoría
- **Registrar Todas las Acciones**: Todos cambios se guardan
- **Retención de Logs**: Por cuánto tiempo guardar (máx 7 años)
- **Alertas de Actividad Sospechosa**: Notificaciones en tiempo real

---

## Monitoreo y Analytics

### Dashboard Ejecutivo
Vista de alto nivel del sistema:
- Usuarios activos en tiempo real
- Órdenes de trabajo en progreso
- Stock crítico
- Índice de cumplimiento HSE
- Uptime del sistema

### Reportes Pre-construidos
1. **Reporte de Producción**: KPIs mensuales
2. **Reporte de Mantención**: MTTR, disponibilidad
3. **Reporte de Bodega**: Inventario, costos
4. **Reporte de Compliance**: Auditorías, incidentes
5. **Reporte de Usuarios**: Actividad, acceso

### Crear Reporte Personalizado
1. Click en "Crear Reporte"
2. Selecciona fuente de datos (módulo)
3. Define período y filtros
4. Elige visualización (tabla, gráfico, etc.)
5. Click en "Generar"
6. Opción para programar reportes automáticos

### Monitoreo en Tiempo Real
- **Usuarios Conectados**: Quién está en el sistema ahora
- **Últimas Acciones**: Feed de actividades
- **Alertas de Sistema**: CPU, memoria, conectividad
- **Health Check**: Estado de APIs y bases de datos

---

## Backups y Recuperación

### Backups Automáticos
- **Frecuencia**: Cada 24 horas (3am, zona del cliente)
- **Duración de Retención**: 90 días (configurable)
- **Almacenamiento**: Redundante en Supabase + S3 AWS

### Backups Manuales
1. Navega a Administración → Backups
2. Click en "Crear Backup Ahora"
3. El proceso toma 5-10 minutos
4. Se descarga un archivo SQL
5. Se guarda en nube automáticamente

### Restaurar desde Backup
**⚠️ OPERACIÓN CRÍTICA - Requiere confirmación**

1. Navega a Administración → Backups → Restaurar
2. Selecciona la fecha del backup
3. Revisa qué datos se perderán (posteriores a esa fecha)
4. Escribe "CONFIRMAR" para proceder
5. Click en "Restaurar"
6. El sistema se reinicia (2-5 minutos de downtime)

### Plan de Recuperación ante Desastres
**RTO** (Recovery Time Objective): < 4 horas
**RPO** (Recovery Point Objective): < 1 hora

---

## Troubleshooting

### Problema: Usuario no puede acceder
**Soluciones**:
1. Verifica que el usuario esté activo
2. Verifica que tenga un rol asignado
3. Revisa que no esté vencido su acceso
4. Resetea la contraseña
5. Revisa logs de login en Auditoría

### Problema: Pantalla en blanco
**Soluciones**:
1. Limpia caché del navegador (Ctrl+Shift+Delete)
2. Intenta en navegador incógnito
3. Verifica conexión a internet
4. Revisa status en status.n3uralia.com
5. Contacta a soporte si persiste

### Problema: Módulos lentos
**Soluciones**:
1. Revisa tu conexión a internet (>5 Mbps recomendado)
2. Cierra otras pestañas/aplicaciones que usen ancho de banda
3. Revisa si hay mantenimiento programado
4. Revisa en Analytics si hay carga alta del sistema
5. Considera actualizar navegador

### Problema: Datos no se guardan
**Soluciones**:
1. Verifica conexión a internet (debe estar continua)
2. Revisa que no esté en "Sesión Expirada"
3. Intenta guardar de nuevo
4. Si persiste, contacta a soporte con timestamp exacto

### Revizar Logs del Sistema
1. Navega a Administración → Auditoría → Logs
2. Filtra por:
   - Usuario
   - Módulo
   - Tipo de acción
   - Rango de fechas
3. Click en cada log para ver detalles
4. Exporta si necesitas enviar a soporte

---

## Políticas Recomendadas

### Password Policy
- Mínimo 12 caracteres
- Mayúsculas, minúsculas, números y símbolos
- No reutilizar últimas 5 contraseñas
- Cambio obligatorio cada 90 días

### Access Control
- Revisar accesos cada 3 meses
- Desactivar usuarios inactivos por 60+ días
- Requerir MFA para roles críticos
- Restringir acceso administrativo a oficina

### Data Protection
- Encriptación en tránsito (TLS 1.2+)
- Encriptación en reposo (AES-256)
- No permitir descargas de datos masivos
- Auditoría de todas las exportaciones

### Compliance
- Auditorías internas cada 6 meses
- Evaluación de seguridad externa anualmente
- Documentar decisiones de acceso/cambios
- Mantener logs de auditoría mínimo 7 años

---

## Contacto de Soporte Técnico

**Para Administradores**:
- Email: admin-support@n3uralia.com
- Phone: +56 2 XXXX-XXXX ext. 100
- Chat: 24/7 en admin panel

**Información a incluir en reportes**:
- Timestamp exacto del problema
- Nombre de usuario afectado
- Módulo involucrado
- Captura de pantalla
- Pasos para reproducir

---

**Última actualización**: 2026-04-22
**Versión**: 1.0
**Contacto**: admin-support@n3uralia.com
