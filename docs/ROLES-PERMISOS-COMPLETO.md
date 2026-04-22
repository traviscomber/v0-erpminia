# Gestión de Roles y Permisos - Sistema Completo

## Descripción General

El sistema implementa un modelo RBAC (Role-Based Access Control) con 6 roles específicos para operaciones mineras. Cada rol tiene acceso a módulos, funciones y widgets específicos según sus necesidades operacionales.

---

## Roles del Sistema

### 1. Operador de Producción ⚙️

**Objetivo:** Monitoreo en tiempo real de equipos y detección de anomalías

**Módulos Accesibles:**
- `/dashboard` - Dashboard principal
- `/dashboard/produccion` - Monitoreo de sensores
- `/dashboard/alertas` - Ver alertas críticas
- `/dashboard/hse` - Solo lectura de alertas HSE

**Funciones Disponibles:**
- ✅ Monitorear sensores en vivo
- ✅ Detectar anomalías automáticamente
- ✅ Reportar fallas
- ✅ Ver KPIs de equipos en tiempo real
- ✅ Recibir notificaciones de alertas críticas
- ✅ Acceso a documentación de procedimientos básicos

**Dashboard Widgets:**
- `sensores_vivos` - Telemetría en vivo
- `alarmas_activas` - Alertas criticas
- `kpis_produccion` - Rendimiento de equipos
- `equipos_estado` - Estado general de flota
- `alertas_criticas` - Notificaciones prioritarias

**Limitaciones:**
- No puede crear OT
- No puede modificar configuración
- Solo lectura en HSE
- No acceso a finanzas

---

### 2. Jefe de Mantención 👷

**Objetivo:** Gestión completa de órdenes de trabajo y coordinación de técnicos

**Módulos Accesibles:**
- `/dashboard` - Dashboard ejecutivo
- `/dashboard/mantenimiento` - Gestión de OT
- `/dashboard/work-orders` - Creación y asignación
- `/dashboard/produccion` - Para contexto
- `/dashboard/bodega` - Consultar disponibilidad
- `/dashboard/alertas` - Alertas del sistema
- `/dashboard/hse` - Ver requisitos
- `/dashboard/reportes` - MTTR y análisis
- `/dashboard/documentos-gestion/contratos` - Contratos proveedores

**Funciones Disponibles:**
- ✅ Crear órdenes de trabajo
- ✅ Asignar OT a técnicos
- ✅ Ver progreso en vivo
- ✅ Resolver bloqueos de técnicos
- ✅ Analizar MTTR (Mean Time To Repair)
- ✅ Ver árbol de fallas
- ✅ Cerrar OT
- ✅ Consultar disponibilidad de piezas
- ✅ Revisar histórico de equipos

**Dashboard Widgets:**
- `ot_pendientes` - OT sin iniciar
- `ot_progreso` - OT en ejecución
- `mttr_metrics` - Tiempo medio de reparación
- `tecnico_asignaciones` - Carga de trabajo
- `inventario_critico` - Piezas en riesgo
- `fallos_recurrentes` - Equipos problemáticos

**Limitaciones:**
- No puede consumir inventario directamente
- No puede generar reportes de HSE
- No acceso a finanzas

---

### 3. Técnico de Campo 🔧

**Objetivo:** Ejecución de mantenimiento con checklist y trazabilidad

**Módulos Accesibles:**
- `/dashboard` - Dashboard básico
- `/dashboard/work-orders` - Ver OT asignadas
- `/dashboard/bodega` - Consumir piezas
- `/dashboard/alertas` - Alertas personales

**Funciones Disponibles:**
- ✅ Recibir OT asignadas
- ✅ Completar checklist en móvil
- ✅ Consumir piezas mediante QR
- ✅ Adjuntar evidencia (fotos, firmas)
- ✅ Reportar progreso en tiempo real
- ✅ Cerrar tareas completadas
- ✅ Ver árbol de fallas para diagnosticar

**Dashboard Widgets:**
- `mis_ot_activas` - OT personales
- `checklist_pendiente` - Checklist sin completar
- `piezas_consumidas` - Historial de piezas
- `evidencia_subida` - Documentación completada

**Limitaciones:**
- No puede crear OT
- No puede ver todas las OT del sistema
- No acceso a HSE, finanzas o documentos
- Solo lectura en bodega

---

### 4. Responsable Bodega 📦

**Objetivo:** Gestión de inventario con trazabilidad FIFO

**Módulos Accesibles:**
- `/dashboard` - Dashboard bodega
- `/dashboard/bodega` - Gestión de stock
- `/dashboard/mantenimiento` - Ver consumo OT
- `/dashboard/documentos-gestion/adquisiciones` - Gestionar órdenes
- `/dashboard/alertas` - Alertas de stock

**Funciones Disponibles:**
- ✅ Recibir materiales
- ✅ Gestionar stock y disponibilidad
- ✅ Escanear movimientos con QR
- ✅ Generar alertas de stock bajo
- ✅ Crear reórdenes automáticas
- ✅ Ver reservas de piezas por OT
- ✅ Auditar consumo de técnicos

**Dashboard Widgets:**
- `stock_actual` - Inventario en vivo
- `alertas_stock` - Items bajo mínimo
- `movimientos_qr` - Trazabilidad QR
- `reservas_pendientes` - Piezas reservadas
- `reordenes_generadas` - Nuevas compras

**Limitaciones:**
- No puede crear OT
- No acceso a HSE o finanzas
- Solo lectura en Mantenimiento
- No puede modificar precios

---

### 5. Oficial HSE/Compliance ✅

**Objetivo:** Cumplimiento normativo, auditoría e investigación

**Módulos Accesibles:**
- `/dashboard` - Dashboard HSE
- `/dashboard/hse` - Centro HSE completo
- `/dashboard/mantenimiento` - Auditar OT
- `/dashboard/documentos-gestion` - Documentos completos
- `/dashboard/documentos-gestion/contratos` - Contratos
- `/dashboard/documentos-gestion/procedimientos` - Procedimientos
- `/dashboard/documentos-gestion/seguridad` - MSDS y protocolos
- `/dashboard/documentos-gestion/reportes` - Reportes HSE
- `/dashboard/alertas` - Alertas de riesgo
- `/dashboard/reportes` - Reportes de cumplimiento

**Funciones Disponibles:**
- ✅ Auditar órdenes de trabajo
- ✅ Acceder a documentos versionados
- ✅ Revisar checklists firmados
- ✅ Generar reportes de cumplimiento
- ✅ Gestionar matriz de riesgos
- ✅ Ver requisitos normativos
- ✅ Investigar incidentes
- ✅ Generar reportes de auditoría

**Dashboard Widgets:**
- `auditorias_pendientes` - Auditorías sin completar
- `incidentes_registrados` - Incidentes reportados
- `requisitos_vencimiento` - Requisitos vencidos
- `checklists_firmados` - Evidencia de compliance
- `cumplimiento_normativo` - % cumplimiento
- `matriz_riesgos` - Riesgos identificados

**Limitaciones:**
- No puede crear OT
- No acceso a finanzas
- No puede consumir inventario
- Solo lectura en Producción

---

### 6. Supervisor/Gerencia 📊

**Objetivo:** Visión completa del sistema y toma de decisiones

**Módulos Accesibles:**
- `/dashboard` - Dashboard principal
- `/dashboard/produccion` - Producción completa
- `/dashboard/mantenimiento` - Mantenimiento completo
- `/dashboard/bodega` - Bodega completa
- `/dashboard/hse` - HSE completo
- `/dashboard/documentos-gestion` - Documentos completos
- `/dashboard/alertas` - Todas las alertas
- `/dashboard/reportes` - Reportes avanzados
- `/dashboard/integracion-completa` - Vista integrada
- `/dashboard/integracion-arquitectura` - Arquitectura
- `/dashboard/work-orders` - Órdenes completas
- `/dashboard/finanzas` - Análisis financiero
- `/dashboard/compras` - Gestión de compras

**Funciones Disponibles:**
- ✅ Dashboard con KPIs globales
- ✅ Análisis de costos por activo
- ✅ Identificar tendencias de fallas
- ✅ Calcular ROI preventivo
- ✅ Ver rendimiento integral
- ✅ Reportes ejecutivos
- ✅ Análisis de disponibilidad
- ✅ Comparativas por período
- ✅ Exportar reportes

**Dashboard Widgets:**
- `kpis_globales` - KPIs del negocio
- `costos_total` - Inversión en mantención
- `mttr_promedio` - Tiempo promedio reparación
- `roi_preventivo` - ROI de mantenimiento
- `fallos_tendencia` - Patrones de falla
- `disponibilidad_equipos` - Uptime de flota
- `costo_por_activo` - Análisis de equipos
- `cumplimiento_hse` - Compliance general

**Limitaciones:**
- Acceso a TODO el sistema (sin limitaciones)

---

## Matriz de Acceso por Módulo

| Módulo | Operador | Jefe MT | Técnico | Bodega | Oficial HSE | Gerencia |
|--------|----------|---------|---------|--------|-------------|----------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Producción | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Mantención | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Bodega | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| HSE | 👁️ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Documentos | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Finanzas | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reportes | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |

**Leyenda:**
- ✅ = Acceso completo (lectura y escritura)
- 👁️ = Solo lectura
- ❌ = Sin acceso

---

## Flujos de Trabajo por Rol

### Flujo 1: De Anomalía a Cierre

**1. Operador de Producción**
1. Monitorea sensores en vivo
2. Detecta anomalía (alerta automática)
3. Reporta falla al Jefe de Mantención

**2. Jefe de Mantención**
1. Recibe alerta de Operador
2. Crea OT con árbol de fallas
3. Asigna técnicos específicos
4. Reserva piezas en Bodega

**3. Responsable Bodega**
1. Recibe reserva de piezas
2. Confirma disponibilidad
3. Si falta, genera reorden
4. Despacha piezas a técnico

**4. Técnico de Campo**
1. Recibe OT
2. Completa checklist
3. Consume piezas (QR)
4. Adjunta evidencia
5. Reporta cierre

**5. Oficial HSE**
1. Audita OT cerrada
2. Verifica checklists
3. Confirma compliance
4. Registra en matriz de riesgos

**6. Supervisor/Gerencia**
1. Ve resumen en dashboard
2. Analiza MTTR, costos
3. Identifica tendencias
4. Toma decisiones sobre preventiva

---

## Cómo Acceder a Gestión de Roles

1. Ve a `/dashboard/roles`
2. Selecciona un rol
3. Visualiza:
   - Módulos accesibles
   - Funciones disponibles
   - Widgets del dashboard
   - Matriz de acceso

---

## Implementación Técnica

### Archivo de Configuración
`/lib/roles-config.ts` - Define todos los roles, permisos y módulos accesibles

### Helpers Disponibles
- `getAccessibleModules(role)` - Obtiene módulos para un rol
- `canAccessModule(role, modulePath)` - Verifica acceso
- `getRoleName(role)` - Nombre del rol
- `getRoleColor(role)` - Color para UI

### Integración en Componentes
```typescript
import { ROLE_PERMISSIONS, canAccessModule } from '@/lib/roles-config';

if (canAccessModule(userRole, '/dashboard/finanzas')) {
  // Mostrar módulo
}
```

---

## Próximos Pasos

1. **Autenticación:** Conectar con sistema de login para asignar rol a usuario
2. **Middleware:** Proteger rutas basadas en rol del usuario
3. **UI Dinámica:** Mostrar solo opciones del rol en sidebar
4. **Auditoría:** Registrar acciones por usuario y rol
5. **Base de Datos:** Persistir permisos en BD

---

## Preguntas Frecuentes

**P: ¿Puede un Técnico crear OT?**
R: No, solo el Jefe de Mantención. El técnico recibe OT asignadas.

**P: ¿Puede Bodega ver Finanzas?**
R: No, solo Gerencia tiene acceso a Finanzas.

**P: ¿Puede Operador consumir piezas?**
R: No, solo Técnico de Campo mediante QR. Operador solo reporta fallas.

**P: ¿Cuántos accesos tiene HSE?**
R: Máximo 10 módulos: HSE, Mantenimiento (auditar), Documentos (todos), Alertas, Reportes.

**P: ¿Puede Técnico ver histórico?**
R: Solo su OT actual, no histórico del equipo. El Jefe de Mantención sí ve histórico completo.
