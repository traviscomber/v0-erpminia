# n3uralia ERP mining — Roadmap MVP 5 Meses

## Objetivo General
Construir un MVP funcional y listo para producción de n3uralia ERP mining enfocado en los 3 módulos operacionales críticos para empresas mineras medianas y contratistas en Chile:

1. **Sistema de Documentos** (Document Management & Compliance)
2. **Sistema de Mantenimiento** (Assets & Maintenance Management)
3. **Bodega/Inventario** (Inventory & Warehouse Management)

Horizonte: **5 meses** (Enero-Mayo o Julio-Noviembre)
- **Meses 1-4**: Desarrollo y features core
- **Mes 5**: Testing, QA, bugfixes y optimización

---

## Fase 0: Setup & Arquitectura (Semanas 1-2)

### Deliverables
- [ ] Infraestructura cloud (Vercel, Supabase, o similar)
- [ ] Arquitectura de base de datos relacional normalizada
- [ ] System design de autenticación y RBAC (Role-Based Access Control)
- [ ] Framework de testing (unit, integration, e2e)
- [ ] Documentación de API contracts
- [ ] Setup de CI/CD pipeline
- [ ] Estructura de monorepo (si aplica)
- [ ] Design tokens y componentes base consolidados

### Tecnología Stack
**Frontend**
- Next.js 16 / React 19 (SSR para mejor UX)
- TypeScript strict mode
- Tailwind CSS v4 (con design system consolidado)
- shadcn/ui (componentes base)
- React Hook Form + Zod (forms + validación)
- TanStack Query (data fetching)
- Zustand (state management minimalista)
- Recharts (visualización)

**Backend**
- Next.js API Routes + Middleware personalizado
- Supabase o Neon PostgreSQL (database)
- Prisma ORM (type-safe queries)
- tRPC (type-safe API)
- Next Auth (authentication)
- Bull/Queues para jobs asíncronos
- OpenAI API (para asistente IA, fase futura)

**Testing**
- Vitest (unit tests)
- Playwright (e2e tests)
- Mock Service Worker (API mocking)

**DevOps**
- GitHub Actions (CI/CD)
- Vercel (deployment)
- Sentry (error tracking)
- LogRocket (session replay)

---

## Fase 1: Maestros & Core (Semanas 3-6)

### 1.1 Tablas Maestras Fundamentales

**Entidades base:**
```
- companies (empresas)
- sites/faenas (faenas)
- contracts (contratos)
- cost_centers (centros de costo)
- departments (departamentos)
- users (usuarios + roles)
- suppliers (proveedores)
- warehouses (bodegas)
- assets (equipos/activos)
- asset_categories
- item_categories
- locations (ubicaciones en bodega)
- audit_logs (trazabilidad)
```

**Schema inicial Postgres:**
```sql
-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  rut VARCHAR(15) UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  country VARCHAR(100) DEFAULT 'Chile',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Faenas
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  location TEXT,
  manager_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Warehouses
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  name VARCHAR(255) NOT NULL,
  location TEXT,
  manager_id UUID REFERENCES users(id),
  warehouse_type VARCHAR(100), -- 'general', 'tools', 'spare_parts', 'materials'
  capacity_m3 DECIMAL(10, 2),
  current_usage_m3 DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assets/Equipment
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  asset_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES asset_categories(id),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  acquisition_date DATE,
  acquisition_cost DECIMAL(15, 2),
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  status VARCHAR(50) DEFAULT 'operational', -- 'operational', 'maintenance', 'inactive'
  location TEXT,
  responsible_user_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory Items
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  item_code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES item_categories(id),
  unit VARCHAR(50), -- 'piece', 'kg', 'liter', 'meter'
  quantity_on_hand INT DEFAULT 0,
  min_stock_level INT,
  max_stock_level INT,
  reorder_point INT,
  cost_per_unit DECIMAL(15, 2),
  supplier_id UUID REFERENCES suppliers(id),
  last_counted_date DATE,
  location_code VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(warehouse_id, item_code)
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type VARCHAR(100), -- 'contract', 'certification', 'permit', 'insurance', 'audit', 'procedure'
  reference_id UUID, -- ID de la entidad asociada (supplier, asset, etc)
  reference_type VARCHAR(100), -- 'supplier', 'asset', 'site', 'contract'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500),
  file_url VARCHAR(500),
  issue_date DATE,
  expiry_date DATE,
  responsible_user_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'archived'
  compliance_required BOOLEAN DEFAULT FALSE,
  tags VARCHAR(255)[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance Orders
CREATE TABLE maintenance_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  order_code VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  maintenance_type VARCHAR(100), -- 'preventive', 'corrective', 'inspection'
  scheduled_date DATE,
  actual_start_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  priority VARCHAR(50) DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  assigned_to_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  estimated_cost DECIMAL(15, 2),
  actual_cost DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance Parts Usage
CREATE TABLE maintenance_parts_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_order_id UUID NOT NULL REFERENCES maintenance_orders(id),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity_used INT NOT NULL,
  cost_per_unit DECIMAL(15, 2),
  total_cost DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document Attachments
CREATE TABLE document_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_kb INT,
  file_type VARCHAR(50),
  uploaded_by_id UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255), -- 'create', 'update', 'delete', 'approve', 'export'
  entity_type VARCHAR(100), -- 'inventory_item', 'maintenance_order', 'document'
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(50)
);

-- Indexes for performance
CREATE INDEX idx_sites_company ON sites(company_id);
CREATE INDEX idx_assets_site ON assets(site_id);
CREATE INDEX idx_inventory_warehouse ON inventory_items(warehouse_id);
CREATE INDEX idx_documents_reference ON documents(reference_type, reference_id);
CREATE INDEX idx_maintenance_asset ON maintenance_orders(asset_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

### 1.2 Autenticación & RBAC

**Roles base:**
- `admin_system` - control total del sistema
- `admin_company` - administrador de empresa
- `site_manager` - gerente de faena
- `warehouse_manager` - jefe de bodega
- `maintenance_technician` - técnico de mantenimiento
- `compliance_officer` - encargado de cumplimiento documental
- `operator` - operador general con lectura

**Permisos por módulo:**
- Documentos: view, create, approve, archive, export
- Mantenimiento: view, create, edit, complete, close
- Inventario: view, receive, consume, transfer, adjust_stock

### 1.3 Componentes Base Consolidados

- `DataTable` (sorting, filtering, pagination, export)
- `FormBuilder` (forms con validación)
- `Modal` (diálogos consistentes)
- `StatusBadge` (estados visuales)
- `AlertBanner` (notificaciones)
- `TabsPanel` (navegación en página)
- `SearchBar` (búsqueda global)
- `EmptyState` (sin datos)
- `ProgressIndicator` (workflows)
- `TimelineCard` (historial)

### 1.4 Documentación de API

Documentar con OpenAPI/Swagger:
- GET/POST /api/sites
- GET/POST /api/warehouses
- GET/POST /api/assets
- GET/POST /api/documents
- GET/POST /api/maintenance-orders
- GET/PUT /api/inventory-items

---

## Fase 2: Módulo 1 — Sistema de Documentos (Semanas 7-12)

### Objetivo
Crear un sistema robusto de gestión, almacenamiento, versionamiento y cumplimiento de documentos con trazabilidad completa.

### 2.1 Funcionalidades Core

**a) Ingesta y clasificación de documentos**
- Upload de archivos (PDF, DOC, XLS, JPG, PNG, ZIP)
- Clasificación automática por tipo (contrato, certificación, permiso, auditoría, procedimiento)
- Asignación a entidad (proveedor, equipo, faena, contrato)
- Versionamiento automático
- Almacenamiento seguro en Vercel Blob o S3
- OCR básico (extracción de metadatos clave)

**b) Gestión de cumplimiento**
- Rastreo de vencimientos
- Alertas anticipadas (30, 15, 7, 3 días antes)
- Dashboard de documentos por vencer
- Checklists de cumplimiento documental
- Auditoría de aprobaciones

**c) Búsqueda y recuperación**
- Búsqueda por nombre, tipo, fecha, responsable
- Filtros por estado (activo, expirado, archivado)
- Búsqueda de contenido (OCR)
- Tags y etiquetas personalizadas

**d) Trazabilidad**
- Quién subió, cuándo, desde dónde
- Cambios de estado
- Aprobaciones/rechazos
- Descarga y exportación
- Auditoría completa

### 2.2 Pantallas Principales

**A. Dashboard de Documentos**
- Encabezado con título y acciones (Subir, Generar Reporte)
- KPIs: Total, Por Vencer, Expirados, Pendientes de Aprobación
- Tabla filtrable de documentos
- Sidebar educativo con mejores prácticas

**B. Vista de Documento Individual**
- Preview del archivo
- Metadata extraída (OCR)
- Notas y comentarios
- Panel lateral con propiedades y historial
- Documentos relacionados

**C. Modal de Carga de Documento**
- Paso 1: Seleccionar archivo con validación
- Paso 2: Clasificación y asociación a entidad
- Paso 3: Metadatos (fechas, tags, notas)
- Paso 4: Confirmación

**D. Reporte de Cumplimiento**
- Resumen general de cumplimiento por proveedor
- Tabla de incumplimientos
- Timeline de vencimientos
- Gráficos de estado

### 2.3 Flujos de Trabajo

**Flujo 1: Carga y Aprobación**
- Usuario sube documento → Sistema valida y extrae metadata → Pendiente de aprobación → Responsable aprueba/rechaza → Activo o Rechazado

**Flujo 2: Alertas de Vencimiento**
- Job diario busca vencimientos (30, 15, 7, 3 días) → Crea notificaciones → Envía email

**Flujo 3: Renovación de Documento**
- Usuario ve documento por vencer → Click "Renovar" → Pre-completados con anterior → Carga nuevo archivo → Nueva versión generada

### 2.4 Especificaciones Técnicas

**Backend:**
- `POST /api/documents/upload` - upload multipart
- `GET /api/documents?filter=type,status,expiry` - list con filtros
- `GET /api/documents/{id}` - detalle
- `DELETE /api/documents/{id}` - delete/archive
- `GET /api/documents/{id}/versions` - historial de versiones
- Job diario: alertas de vencimiento

**Frontend:**
- `react-dropzone` para drag & drop
- Vercel Blob para almacenamiento
- PDF.js para preview
- Componente Timeline para historial
- Tabla filtrable

**Seguridad:**
- RBAC: solo responsable y admin_company pueden ver/descargar
- Logs de descarga y acceso
- Encriptación de archivos en reposo
- Watermark en PDFs (opcional)

### 2.5 Deliverables Fase 2
- [ ] Tablas de base de datos para documentos
- [ ] API CRUD completa
- [ ] Dashboard con KPIs
- [ ] Vista de documento individual
- [ ] Modal de carga con validación
- [ ] Reporte de cumplimiento
- [ ] Job automático de alertas
- [ ] Trazabilidad completa
- [ ] Unit + Integration tests
- [ ] API documentation

---

## Fase 3: Módulo 2 — Sistema de Mantenimiento (Semanas 13-18)

### Objetivo
Crear un sistema de planificación, ejecución y análisis de mantenimiento de activos con trazabilidad de repuestos, costos y tiempo de inactividad.

### 3.1 Funcionalidades Core

**a) Gestión de Activos**
- Registro de equipos/activos con metadata completa
- Código único por activo
- Historial completo de mantenimiento
- Documentación asociada (manuales, garantías)
- Ubicación y responsable asignado
- Estados: Operacional, En Mantenimiento, Inactivo

**b) Órdenes de Mantenimiento**
- Mantenimiento preventivo (planificado)
- Mantenimiento correctivo (reactivo)
- Inspecciones
- Asignación automática a técnicos
- Estimación de costo y tiempo
- Priorización (baja, normal, alta, crítica)
- Estados: Pendiente, En Progreso, Completado, Cancelado

**c) Consumo de Repuestos**
- Registro de partes utilizadas en mantenimiento
- Deducción automática de inventario
- Costeo de mantenimiento
- Trazabilidad de repuesto → mantenimiento → activo

**d) Análisis y Reportes**
- Costo total de mantenimiento por activo
- MTBF (Mean Time Between Failures)
- MTTR (Mean Time To Repair)
- Tendencias de falla
- Predictivo: alertas de próximo mantenimiento
- ROI de mantenimiento preventivo vs correctivo

### 3.2 Pantallas Principales

**A. Dashboard de Mantenimiento**
- KPIs: Órdenes Activas, Pendientes, En Progreso, Equipos Críticos, MTTR Promedio
- Filtros por estado, prioridad, técnico, equipo
- Tabla de órdenes abiertas
- Calendario de próximos mantenimientos
- Equipos actualmente en mantenimiento

**B. Vista de Orden (Crear/Editar)**
- Sección 1: Información del Equipo (búsqueda, historial)
- Sección 2: Detalles de la Orden (tipo, descripción, fechas, técnico)
- Sección 3: Planificación de Recursos (repuestos, costos)
- Botones: Guardar Borrador, Crear Orden, Cancelar

**C. Vista de Orden en Ejecución**
- Historial del equipo (fallas anteriores, MTTR histórico)
- Checklist de tareas
- Registro de tiempo real
- Consumo de repuestos
- Fotos/evidencia
- Notas del técnico

**D. Reporte de Mantenimiento**
- Resumen general: Total órdenes, costo acumulado, MTBF/MTTR
- Tabla: Órdenes completadas, técnico, duración, costo
- Gráfico: Distribución de tipos (preventivo vs correctivo)
- Análisis de tendencias y predicciones

### 3.3 Flujos de Trabajo

**Flujo 1: Crear Orden Preventiva**
- Planificador crea orden → Sistema asigna técnico → Notifica técnico → Técnico ejecuta → Registra tiempo y repuestos → Completado

**Flujo 2: Reportar Falla y Crear Orden Correctiva**
- Operador reporta falla → Sistema crea alerta → Gerente crea orden correctiva → Técnico atiende → Resuelve → Completado

**Flujo 3: Análisis de Historial**
- Gerente revisa historial de activo → Ve MTTR histórico, fallas recurrentes → Genera reporte para análisis de raíz

### 3.4 Especificaciones Técnicas

**Backend:**
- `POST /api/maintenance-orders` - crear orden
- `GET /api/maintenance-orders?filter=status,priority,asset` - list
- `PUT /api/maintenance-orders/{id}` - actualizar
- `POST /api/maintenance-orders/{id}/complete` - completar
- `GET /api/maintenance-orders/{id}/timeline` - historial
- `GET /api/assets/{id}/maintenance-history` - historial de activo

**Frontend:**
- Calendario de mantenimientos programados
- Picker de técnicos con filtro por especialidad
- Tabla de repuestos agregable
- Componente de checklist interactivo
- Galería de fotos
- Cronómetro de tiempo

**Seguridad:**
- RBAC: solo técnico asignado puede actualizar orden propia
- Logs de cambios
- Validación de permisos por faena

### 3.5 Deliverables Fase 3
- [ ] Tablas de activos y órdenes de mantenimiento
- [ ] API CRUD completa
- [ ] Dashboard con KPIs
- [ ] Vista de orden en ejecución
- [ ] Reporte de mantenimiento
- [ ] Job automático de próximos mantenimientos
- [ ] Historial y trazabilidad
- [ ] Unit + Integration tests
- [ ] API documentation

---

## Fase 4: Módulo 3 — Sistema de Bodega/Inventario (Semanas 19-24)

### Objetivo
Crear un sistema de control y trazabilidad de inventario con gestión de recepción, consumo, transferencias y ajustes.

### 4.1 Funcionalidades Core

**a) Gestión de Ítems**
- Catálogo de artículos con código, descripción, categoría
- Unidades de medida (piezas, kg, litros, metros)
- Costos por unidad
- Niveles mínimos, máximos y reorden
- Proveedores asociados

**b) Transacciones de Inventario**
- Recepción de compras
- Consumo/salida de materiales
- Transferencias entre bodegas
- Ajustes de inventario
- Devoluciones

**c) Localización en Bodega**
- Ubicación física (pasillo, estante, bandeja)
- QR/Barcode por ubicación
- Búsqueda por ubicación
- Mapeo visual de bodega

**d) Reportes de Inventario**
- Stock actual por ubicación
- Items por reordenar
- Consumo por período
- Rotación de inventario
- Valorización de stock

### 4.2 Pantallas Principales

**A. Dashboard de Bodega**
- KPIs: Total Ítems, Stock Bajo, Por Reordenar, Valor Total Inventario
- Tabla de ítems por reordenar (críticos primero)
- Últimas transacciones
- Filtros por categoría, bodega, estado

**B. Vista de Ítem**
- Información general: código, nombre, categoría, unidad
- Stock actual en cada bodega
- Ubicaciones físicas (con foto si aplica)
- Historial de transacciones
- Proveedor preferido
- Costo histórico

**C. Recepción de Compra**
- Búsqueda de OC
- Escaneo de artículos (QR/manual)
- Validación de cantidades
- Asignación de ubicación
- Fotos de recepción
- Confirmación

**D. Salida/Consumo**
- Búsqueda de artículo
- Selección de cantidad
- Razón de salida (mantenimiento, operación, etc)
- Ubicación origen (automática si es única)
- Confirmación

**E. Transferencia entre Bodegas**
- Seleccionar artículo y cantidad
- Bodega origen → destino
- Registro de responsables
- Transporte
- Recepción en destino

**F. Reporte de Inventario**
- Stock actual por categoría
- Ítems por reordenar (automático)
- Consumo último mes
- Rotación ABC
- Valorización

### 4.3 Flujos de Trabajo

**Flujo 1: Recepción de Compra**
- OC llega a bodega → Jefe de bodega crea recepción → Operario escanea artículos → Valida cantidades → Asigna ubicaciones → Sistema actualiza stock

**Flujo 2: Consumo en Mantenimiento**
- Técnico solicita repuesto → Jefe de bodega busca ítem → Confirma salida → Ítem se deduce de stock → Si llega a mínimo, genera alerta de reorden

**Flujo 3: Transferencia entre Bodegas**
- Bodega A solicita transferencia a Bodega B → Bodega A confirma salida → En tránsito → Bodega B recibe y confirma → Stock actualizado en ambas

**Flujo 4: Ajuste de Inventario**
- Gerente autoriza conteo físico → Operarios cuentan → Sistema compara con registro → Diferencias se ajustan → Auditoría de cambio

### 4.4 Especificaciones Técnicas

**Backend:**
- `POST /api/inventory-items` - crear ítem
- `GET /api/inventory-items?filter=category,warehouse,status` - list
- `POST /api/inventory-transactions/receive` - recepción
- `POST /api/inventory-transactions/consume` - salida
- `POST /api/inventory-transactions/transfer` - transferencia
- `POST /api/inventory-transactions/adjust` - ajuste
- `GET /api/inventory-items/{id}/history` - historial

**Frontend:**
- Barcode/QR scanner (compatible con cámara de móvil)
- Búsqueda autocomplete de artículos
- Visualización de ubicaciones
- Mapeo de bodega (si es grande)
- Fotos de transacciones
- Reportes exportables (Excel)

**Seguridad:**
- RBAC por bodega
- Logs de transacciones
- Auditoría de ajustes
- Validación de dos personas para ajustes mayores

### 4.5 Deliverables Fase 4
- [ ] Tablas de inventario e historial de transacciones
- [ ] API CRUD completa
- [ ] Dashboard con KPIs
- [ ] Recepción y salida de materiales
- [ ] Transferencias entre bodegas
- [ ] Búsqueda y localización
- [ ] Reportes de inventario
- [ ] Integración QR/Barcode
- [ ] Unit + Integration tests
- [ ] API documentation

---

## Fase 5: Testing, QA y Optimización (Semana 25-30 / Mes 5)

### Objetivo
Garantizar que el MVP es production-ready mediante testing exhaustivo, bugfixes, optimización de performance, y preparación para launch.

### 5.1 Testing Exhaustivo

**Unit Testing**
- [ ] Cobertura mínima 80% de funciones críticas (autenticación, validación, cálculos)
- [ ] Test todos los endpoints de API
- [ ] Test validaciones de formularios
- [ ] Test estados de componentes React
- [ ] Mock de servicios externos (Blob storage, email)

**Integration Testing**
- [ ] Flujo completo de carga de documento
- [ ] Flujo de creación y actualización de orden de mantenimiento
- [ ] Flujo de transacciones de inventario
- [ ] Integraciones de base de datos
- [ ] RBAC y permisos por rol
- [ ] Jobs asincronos (alertas de vencimiento, etc)

**End-to-End Testing (Playwright)**
- [ ] Login flow (múltiples roles)
- [ ] Navegación principal
- [ ] Crear/editar/completar en cada módulo
- [ ] Filtros y búsqueda
- [ ] Exportar reportes
- [ ] Upload de archivos
- [ ] Mobile responsive
- [ ] Offline behavior (si aplica)

**Performance Testing**
- [ ] Load testing: 100 usuarios concurrentes
- [ ] Time to interactive (TTI) < 3s
- [ ] Lighthouse score > 80
- [ ] Database query optimization (índices)
- [ ] CDN y caching de assets
- [ ] Bundle size < 500KB (gzip)

**Security Testing**
- [ ] OWASP Top 10 vulnerabilities
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Password hashing (bcrypt)
- [ ] Rate limiting en endpoints
- [ ] Input sanitization
- [ ] Audit logs de cambios sensibles

### 5.2 QA Manual y Casos de Prueba

**Documentos Module**
- [ ] Upload de diferentes formatos (PDF, Word, Excel, JPG)
- [ ] OCR extrae metadata correctamente
- [ ] Alertas de vencimiento salen a tiempo
- [ ] Búsqueda y filtros funcionan
- [ ] Versionamiento guarda histórico
- [ ] Permisos de acceso por rol
- [ ] Descarga de documentos
- [ ] Exportar reporte de cumplimiento

**Mantenimiento Module**
- [ ] Crear orden preventiva
- [ ] Reportar falla y crear orden correctiva
- [ ] Asignación a técnico
- [ ] Registro de tiempo real
- [ ] Consumo de repuestos deduce de inventario
- [ ] Historial de activo es correcto
- [ ] Cálculo de MTTR/MTBF
- [ ] Reporte de mantenimiento

**Inventario Module**
- [ ] Recepción de compra actualiza stock
- [ ] Salida de material deduce stock
- [ ] Transferencia entre bodegas
- [ ] QR scanner funciona en móvil
- [ ] Búsqueda de ubicación
- [ ] Alertas de stock bajo
- [ ] Reporte de inventario

### 5.3 Bugfixes y Ajustes

**Común**
- [ ] Error handling en todos los endpoints
- [ ] Mensajes de error claros al usuario
- [ ] Validación de inputs en frontend y backend
- [ ] Fallbacks para imágenes rotas
- [ ] Manejo de timeouts de API
- [ ] Offline mode graceful
- [ ] Responsive design en mobile

**Por Módulo**
- [ ] Documentos: manejo de archivos muy grandes
- [ ] Mantenimiento: conflictos de horarios
- [ ] Inventario: transacciones concurrentes

### 5.4 Optimización

**Frontend**
- [ ] Code splitting por ruta
- [ ] Lazy loading de componentes
- [ ] Optimización de imágenes
- [ ] CSS purging
- [ ] Minificación de bundles
- [ ] Caching de assets
- [ ] Preload de fontes

**Backend**
- [ ] N+1 queries fixes
- [ ] Índices de base de datos
- [ ] Query optimization
- [ ] Paginación de listados grandes
- [ ] Compression de respuestas
- [ ] Rate limiting
- [ ] Connection pooling

**DevOps**
- [ ] CI/CD pipeline optimizado
- [ ] Build times < 5 min
- [ ] Deploy rollback en caso de error
- [ ] Monitoring y alertas (Sentry)
- [ ] Log aggregation
- [ ] Database backups automatizados

### 5.5 Documentación Final

- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guide por módulo
- [ ] Video tutorials (3-5 min c/u)
- [ ] Troubleshooting guide
- [ ] Admin setup guide
- [ ] Database schema diagram
- [ ] Architecture overview

### 5.6 Preparación para Launch

- [ ] Ambiente de producción setup
- [ ] Datos demo para testing
- [ ] Plan de capacitación para usuarios
- [ ] SLA y términos de servicio
- [ ] GDPR compliance check
- [ ] Backup y disaster recovery plan
- [ ] On-call rotation para first week

### 5.7 Deliverables Fase 5

**Testing**
- [ ] Test coverage report (mínimo 80%)
- [ ] E2E test suite (Playwright)
- [ ] Performance report
- [ ] Security audit report
- [ ] Bug tracker cleaned (0 bloqueadores)

**Documentation**
- [ ] API documentation completa
- [ ] User guide por módulo
- [ ] Video tutorials
- [ ] Admin guide

**Deployment**
- [ ] Production environment ready
- [ ] CI/CD pipeline automated
- [ ] Monitoring y alerts configured
- [ ] Backup plan tested
- [ ] Rollback procedure documented

**Training**
- [ ] User training materials
- [ ] Admin training materials
- [ ] Support team documentation

---

## Timeline Resumen

| Mes | Fases | Hitos |
|-----|-------|-------|
| **Mes 1** (Semanas 1-6) | Fase 0 + Fase 1 | Infraestructura, Base de datos, RBAC, Componentes base |
| **Mes 2** (Semanas 7-12) | Fase 2 | Sistema de Documentos 100% funcional |
| **Mes 3** (Semanas 13-18) | Fase 3 | Sistema de Mantenimiento 100% funcional |
| **Mes 4** (Semanas 19-24) | Fase 4 | Sistema de Bodega/Inventario 100% funcional |
| **Mes 5** (Semanas 25-30) | Fase 5 | Testing, QA, Bugfixes, Launch Ready |

---

## Equipo Recomendado

- **1 Tech Lead** - Arquitectura, code review, decisiones técnicas
- **2 Full-Stack Devs** - Frontend + Backend simultáneamente
- **1 QA Engineer** - Testing exhaustivo y casos de prueba
- **1 UX/Design** - Ajustes de UX basados en feedback
- **1 DevOps/Infra** - CI/CD, deploy, monitoring

Total: 6 personas

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|--------|-----------|
| Retraso en integración de módulos | Media | Alto | Definir interfaces claras desde inicio |
| Performance issues en producción | Media | Alto | Load testing en mes 4 |
| Cambios de requisitos | Alta | Medio | Usar 2-week sprints, feedback frecuente |
| Bugs en producción | Baja | Muy Alto | Testing exhaustivo en Fase 5 |
| Falta de data/usuarios test | Baja | Medio | Crear fixtures desde mes 1 |

---

## Success Criteria

- ✅ MVP with all 3 modules working production-ready
- ✅ Minimum 80% test coverage on critical paths
- ✅ < 3s load time on all main screens
- ✅ Lighthouse score > 80
- ✅ Compliant with GDPR and Chilean regulations
- ✅ 5 pilot users can use without assistance
- ✅ Zero critical bugs at launch
