# Módulo de Gestión Documental - Documentación Completa

## Descripción General

El módulo de **Gestión Documental** centraliza y organiza todos los documentos de la operación minera en una plataforma única, incluyendo contratos, procedimientos, reportes y documentación de seguridad.

## Subcategorías Implementadas

### 1. **Contratos & Subcontratos** ✅ COMPLETADO
**Descripción:** Gestión centralizada de contratos principales con contratistas y subcontratos.

**Características:**
- Registro de contratos por número, contratista, monto y fechas
- Clasificación: Contratos Principales vs Subcontratos
- Estados: Activo, Pendiente, Vencido, Suspendido
- Seguimiento de aprobaciones
- Historial de enmiendas (Amendments)
- Control de documentos adjuntos
- KPIs: Total activos, pendientes, vencidos, pendiente aprobación

**Tabla Base:** `contracts`, `subcontracts`, `amendments`

**Ubicación en Sidebar:**
- Documentos → Gestión Documental (dashboard principal)
- Documentos → Contratos & Subcontratos (gestión específica)

### 2. Documentos de Procuración
**Descripción:** Órdenes de compra, requisiciones y documentos de procuración.
- Enlace automático con módulo de Bodega/Inventario
- Trazabilidad de compras
- Estados de aprobación

### 3. Procedimientos Operacionales
**Descripción:** POS, SOPs y procedimientos estándar de operación.
- Control de versiones
- Historial de cambios
- Aprobaciones requeridas

### 4. Documentos de Seguridad
**Descripción:** Procedimientos HSE, alertas y documentación de seguridad.
- Integración con módulo HSE & Compliance
- Procedimientos críticos de seguridad
- Alertas y actualizaciones

### 5. Reportes & Análisis
**Descripción:** Reportes operacionales, análisis y documentos ejecutivos.
- Reportes diarios, semanales, mensuales
- Análisis operacionales
- Documentos de decisión

## Estructura de Base de Datos

### Tablas Creadas

```sql
-- Contratistas
contractors
├── id (uuid, PK)
├── legal_name (text)
├── business_type (enum: constructor, supplier, service_provider)
├── rut (text, unique)
├── email, phone
├── created_at, updated_at

-- Contratos Principales
contracts
├── id (uuid, PK)
├── contract_number (text, unique)
├── contractor_id (FK → contractors)
├── title, description
├── amount, currency
├── start_date, end_date
├── status (enum: active, pending, expired, suspended)
├── approval_status (enum: approved, pending, rejected)
├── created_at, updated_at

-- Subcontratos
subcontracts
├── id (uuid, PK)
├── parent_contract_id (FK → contracts)
├── contractor_id (FK → contractors)
├── amount, terms
├── percentage_of_parent
├── created_at, updated_at

-- Enmiendas
amendments
├── id (uuid, PK)
├── contract_id (FK → contracts)
├── amendment_number
├── description, impact
├── approved_date, effective_date
├── created_at, updated_at

-- Documentos de Procuración
procurement_documents
├── id (uuid, PK)
├── document_number (text, unique)
├── type (enum: purchase_order, requisition, quote, invoice)
├── related_contract_id (FK → contracts)
├── amount, status
├── created_at, updated_at

-- Aprobaciones
document_approvals
├── id (uuid, PK)
├── document_id (FK → contratos o procuracion)
├── approver_id (FK → auth.users)
├── approval_status (enum: pending, approved, rejected)
├── feedback (text)
├── approved_at, created_at

-- Auditoría
document_audit_log
├── id (uuid, PK)
├── document_id
├── action (enum: created, updated, approved, archived)
├── changed_by (FK → auth.users)
├── changes (jsonb)
├── timestamp
```

## URLs y Rutas

```
Dashboard Principal
├── /dashboard → Tarjeta de "Gestión Documental"

Módulo Gestión Documental
├── /dashboard/documentos-gestion → Dashboard principal
├── /dashboard/documentos-gestion/contratos → Contratos & Subcontratos ✅
├── /dashboard/documentos-gestion/procuracion → Documentos de Procuración
├── /dashboard/documentos-gestion/procedimientos → Procedimientos Operacionales
├── /dashboard/documentos-gestion/seguridad → Documentos de Seguridad
└── /dashboard/documentos-gestion/reportes → Reportes & Análisis

Sidebar Navigation
└── Documentos (Grupo)
    ├── Gestión Documental (dashboard principal)
    ├── Contratos & Subcontratos (subcategoría 1) ✅
    └── Procedimientos (actual /documentos-v2)
```

## Características Principales

### Dashboard Principal (`/dashboard/documentos-gestion`)
- **KPIs:**
  - Total Documentos: suma de todos los documentos
  - Pendiente Aprobación: documentos que requieren revisión
  - Categorías Activas: 5 subcategorías

- **Búsqueda y Filtros:**
  - Búsqueda por nombre o descripción de categoría
  - Tarjetas por categoría con contador de documentos y pendientes

### Contratos & Subcontratos (`/dashboard/documentos-gestion/contratos`)
- **KPIs:**
  - Activos: contratos en vigencia
  - Pendientes: esperando inicio
  - Vencidos: contratos terminados
  - Pendiente Aprobación: requieren firma

- **Filtros:**
  - Por número de contrato
  - Por contratista
  - Por tipo (Principal / Subcontrato)
  - Por estado (Activos, Pendientes, Vencidos, Todos)

- **Card de Contrato:**
  - Número de contrato y badges
  - Nombre del contratista
  - Monto en millones
  - Fechas de inicio y termino
  - Cantidad de documentos adjuntos
  - Botones: Ver Detalles, Descargar, Enmiendas

## Integraciones

### Con Módulos Existentes
- **Bodega/Inventario:** Los OC se vinculan automáticamente
- **Finanzas:** Los montos de contratos se registran
- **HSE & Compliance:** Procedimientos de seguridad vinculados
- **Mantenimiento:** Procedimientos de mantenimiento archivados

### Con Producción y HSE
- Documentos de emergencia disponibles en alertas
- Procedimientos críticos accesibles desde la faena

## Próximos Pasos

### Fase 2: Completar Subcategorías Restantes
1. Documentos de Procuración
2. Procedimientos Operacionales
3. Documentos de Seguridad
4. Reportes & Análisis

### Fase 3: Características Avanzadas
- Versionado de documentos
- Control de cambios (Change Log)
- Workflow de aprobación personalizado
- Búsqueda full-text en documentos
- OCR para escaneo de contratos físicos
- Firma digital electrónica
- Generación automática de reportes

## Permisos y Seguridad

### Row Level Security (RLS)
```sql
-- Solo usuarios autenticados pueden ver documentos
-- Managers pueden aprobar
-- Admins pueden eliminar
-- Auditoría completa de accesos
```

### Roles
- **Viewer:** Puede leer documentos
- **Editor:** Puede crear y editar documentos
- **Approver:** Puede aprobar/rechazar documentos
- **Admin:** Acceso total

## Datos Mockup Incluidos

Se incluyen 5 contratos de ejemplo:
1. CONT-2024-001: Servicios de Perforación (Activo, Aprobado)
2. SUBCONT-2024-001: Transporte de Material (Activo, Aprobado)
3. CONT-2024-002: Mantenimiento de Equipos (Activo, Pendiente)
4. SUBCONT-2024-002: Análisis Químico (Pendiente, Pendiente)
5. CONT-2023-015: Consultoría Ambiental (Vencido, Aprobado)

## Estadísticas Iniciales

- Total Documentos: 437
- Pendiente Aprobación: 23
- Categorías: 5
- Contratos Activos: 3
- Subcontratos: 2
