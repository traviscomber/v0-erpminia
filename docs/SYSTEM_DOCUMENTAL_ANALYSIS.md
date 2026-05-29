# Análisis Completo del Sistema Documental - MOTIL

**Fecha:** Mayo 29, 2026  
**Estado:** En Evaluación  
**Propósito:** Identificar capacidades actuales, brechas y rutas de mejora

---

## 1. ESTADO ACTUAL DEL SISTEMA

### 1.1 Módulos Implementados

#### ✅ Gestión General de Documentos (`/dashboard/documentos`)
- **Ubicación:** `/app/dashboard/documentos/page.tsx`
- **Capacidades:**
  - Upload de documentos
  - Visualización de documentos
  - Tabs: Todos, Pendientes, Aprobados, Mis Aprobaciones
  - Stats: Total, Aprobados, Pendientes, Vencidos
  - Flujo de aprobación de 2 niveles
  
**Estado:** PARCIAL - UI implementada, API incompleta
**Problemas:**
- Las funciones de aprobación retornan `// Implementar`
- No hay persistencia de datos real
- Búsqueda y filtrado solo en UI

#### ✅ Gestión HSE de Documentos (`/dashboard/hse/documentos`)
- **Ubicación:** `/app/dashboard/hse/documentos/page.tsx`
- **Capacidades:**
  - Listado de documentos HSE Master
  - Búsqueda y filtrado por tipo
  - Estados: vigente, en revisión, obsoleto
  - Control de vigencia (360+ días = vencido)
  - Download de documentos
  - Estadísticas de documentos

**Estado:** FUNCIONAL - Conectado a BD, datos reales
**Detalles:**
- Conecta a tabla `hse_master_documents`
- Tipos: política, programa, reglamento, procedimiento, instructivo, plan
- Mostrar documentos vencidos (alert)

#### ✅ Flujo Documental Sostenibilidad (`/dashboard/sostenibilidad/documentos-flujo`)
- **Ubicación:** `/app/dashboard/sostenibilidad/documentos-flujo/page.tsx`
- **Capacidades:**
  - Visualización de flujo de aprobación (5 pasos)
  - Documentos por estado: Borradores, Pendiente V1, Aprobado V1, etc.
  - Tarjetas de documentos con info básica

**Estado:** PARCIAL - UI lista, lógica incompleta
**Problemas:**
- No hay datos reales cargándose
- Mock data hardcoded
- Aprobaciones no funcionales
- No hay historial de cambios

### 1.2 API Endpoints

**`/api/documentos` (GET/POST)**
- Maneja múltiples tipos de documentos
- Parámetros: `tipo`, `estado`, `limit`, `offset`
- Tipos soportados:
  - `hse_master` → tabla `hse_master_documents`
  - `flujo_sostenibilidad` → tabla `flujo_aprobacion_documentos_sostenibilidad`
  - `audit` → tabla `document_audit_log`
  - `auditoria_sos` → tabla `auditoria_documentos_sostenibilidad`

**Status:** BÁSICO - Funcional pero con limitaciones
**Problemas:**
- No hay endpoints para aprobación
- No hay endpoint para búsqueda avanzada
- No hay endpoint para versionado
- Error handling genérico

### 1.3 Componentes Reutilizables

1. **DocumentList** - Listado de documentos
2. **DocumentUploadModal** - Modal de carga
3. **DocumentViewer** - Visualizador
4. **DocumentVersionHistory** - Historial de versiones
5. **ApprovalWorkflowCard** - Tarjeta de flujo (no implementada)
6. **HSEDocumentosCard** - Card específica HSE

---

## 2. QUÉ FALTA (Brechas Críticas)

### 2.1 Funcionalidad de Aprobación (CRÍTICO)

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| Aprobación por Jefe Sostenibilidad | ❌ | CRÍTICA |
| Aprobación por Gerente General | ❌ | CRÍTICA |
| Rechazos con comentarios | ❌ | ALTA |
| Firma digital en aprobación | ❌ | MEDIA |
| Historial de aprobaciones | ❌ | ALTA |
| Notificaciones de aprobación | ❌ | MEDIA |

### 2.2 Búsqueda y Filtrado (ALTA)

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| Búsqueda full-text | ❌ | ALTA |
| Filtros por categoría | ⚠️ | ALTA |
| Filtros por fecha | ❌ | MEDIA |
| Filtros por estado | ⚠️ | MEDIA |
| Búsqueda facetada | ❌ | MEDIA |

### 2.3 Versionado de Documentos (MEDIA)

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| Control de versiones | ⚠️ | MEDIA |
| Comparación versiones | ❌ | BAJA |
| Restaurar versión anterior | ❌ | BAJA |
| Changelog automático | ❌ | BAJA |

### 2.4 Metadata y Trazabilidad (ALTA)

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| Quién creó el documento | ⚠️ | MEDIA |
| Quién lo modificó | ❌ | MEDIA |
| Cuándo se aprobó | ❌ | ALTA |
| Audit log completo | ⚠️ | ALTA |
| Firma digital persistente | ❌ | MEDIA |

### 2.5 Categorización y Organización (MEDIA)

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| Carpetas/Categorías | ⚠️ | MEDIA |
| Tags/Etiquetas | ❌ | BAJA |
| Relaciones entre documentos | ❌ | MEDIA |
| Referencias cruzadas | ❌ | BAJA |

### 2.6 Reportería (MEDIA)

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| Reporte de documentos vencidos | ⚠️ | ALTA |
| Reporte de aprobaciones pendientes | ❌ | ALTA |
| Reporte de cumplimiento | ❌ | MEDIA |
| Matriz de vigencia | ❌ | MEDIA |
| Estadísticas por tipo | ⚠️ | BAJA |

### 2.7 Integración con Otros Módulos (MEDIA)

| Feature | Estado | Prioridad |
|---------|--------|-----------|
| Relación con inspecciones | ❌ | MEDIA |
| Relación con capacitaciones | ❌ | BAJA |
| Relación con procedimientos HSE | ⚠️ | MEDIA |
| Relación con incidentes | ❌ | BAJA |

---

## 3. CÓMO MEJORARLO - Plan de Acción

### Fase 1: CRÍTICAS (1-2 semanas)

#### 1.1 Implementar Flujo de Aprobación Real
```
OBJETIVO: Que la aprobación de 2 niveles funcione end-to-end

Tareas:
1. Crear endpoint POST /api/documentos/approve
   - Input: documentId, level (1=Jefe, 2=Gerente), action (approve/reject)
   - Output: approval record con timestamp + user
   
2. Crear endpoint POST /api/documentos/reject
   - Input: documentId, level, reason, comments
   - Output: rejection con historial
   
3. Actualizar componente ApprovalWorkflowCard
   - Conectar a endpoints
   - Mostrar estado de aprobación en tiempo real
   - Permitir comentarios por aprobador
   
4. Crear tabla en BD: document_approvals
   - document_id, approval_level, status, user_id, timestamp, comments
   - Unique constraint (document_id, approval_level)
```

#### 1.2 Conectar Dashboard General con Datos Reales
```
OBJETIVO: Que /dashboard/documentos muestre datos reales

Tareas:
1. Crear endpoint GET /api/documentos/stats
   - Retornar counts reales por estado
   
2. Crear endpoint GET /api/documentos/pending-approvals
   - Retornar documentos pendientes de aprobación actual
   
3. Actualizar tabs para usar datos reales
   - "Mis Aprobaciones" debe mostrar solo documentos que esperen mi firma
   - Verficar rol del usuario
```

### Fase 2: ALTA PRIORIDAD (2-3 semanas)

#### 2.1 Búsqueda Full-Text
```
OBJETIVO: Búsqueda eficiente en todos los documentos

Tareas:
1. Agregar columna search_vector a tablas documentales
   - Usar FULLTEXT en Supabase
   
2. Crear endpoint GET /api/documentos/search
   - Query parameter: q (búsqueda)
   - Filters: tipo, estado, fecha_inicio, fecha_fin
   
3. UI: Buscador en todas las vistas
```

#### 2.2 Audit Log Completo
```
OBJETIVO: Rastrear todos los cambios de documentos

Tareas:
1. Crear tabla: document_audit
   - doc_id, action, user_id, timestamp, old_values, new_values
   
2. Crear triggers para llenar audit automáticamente
   - En creación, modificación, aprobación, rechazo
   
3. UI: Mostrar "Historial" en cada documento
```

#### 2.3 Reportería de Vencidos
```
OBJETIVO: Alertas de documentos próximos a vencer

Tareas:
1. Crear endpoint GET /api/documentos/due-soon
   - Parámetro: days=30 (próximos 30 días)
   
2. UI: Dashboard widget con documentos próximos a vencer
   
3. Agregar frecuencia de vigencia a tabla hse_master_documents
   - Cada 1 año, 2 años, según reglamento
```

### Fase 3: MEDIA PRIORIDAD (3-4 semanas)

#### 3.1 Categorización y Organizac ión
```
OBJETIVO: Mejor estructura de documentos

Tareas:
1. Crear tabla: document_categories
   - parent_id, name, description
   
2. Agregar category_id a document tables
   
3. UI: Tree de categorías en sidebar
```

#### 3.2 Versionado Mejorado
```
OBJETIVO: Control completo de versiones

Tareas:
1. Mejorar document_versions
   - Agregar: change_description, change_type (minor/major)
   
2. Crear endpoint: GET /api/documentos/{id}/versions/{version}
   
3. UI: Comparador visual de versiones
```

#### 3.3 Integración con Módulos
```
OBJETIVO: Vincular documentos con otras entidades

Tareas:
1. Crear tabla: document_relationships
   - source_doc_id, target_doc_id, relationship_type
   
2. Agregar: documento_id a tablas de inspecciones, capacitaciones, etc
   
3. UI: "Documentos relacionados" en cada inspección
```

---

## 4. PRIORIZACIÓN RECOMENDADA

**SEMANA 1-2 (CRÍTICAS):**
- [ ] Implementar flujo de aprobación (endpoint + UI)
- [ ] Conectar dashboard con datos reales
- [ ] Crear audit log basic

**SEMANA 3-4 (ALTA):**
- [ ] Búsqueda full-text
- [ ] Reporte de documentos vencidos
- [ ] Notificaciones de aprobación pendiente

**SEMANA 5-6 (MEDIA):**
- [ ] Categorización mejorada
- [ ] Versionado avanzado
- [ ] Integración con inspecciones

---

## 5. ESTRUCTURA BD ACTUAL vs NECESARIA

### Tablas Existentes
- `hse_master_documents` - Documentos HSE
- `flujo_aprobacion_documentos_sostenibilidad` - Flujo Sos
- `document_audit_log` - Audit básico
- `auditoria_documentos_sostenibilidad` - Audit Sos

### Tablas Necesarias
- `document_approvals` - Aprobaciones (CRÍTICA)
- `document_versions` - Mejora (MEDIA)
- `document_audit` - Mejora (ALTA)
- `document_categories` - Organización (MEDIA)
- `document_relationships` - Integraciones (MEDIA)

---

## 6. RECOMENDACIONES FINALES

1. **Enfoque MVP:** Hacer funcional el flujo de aprobación primero
2. **Testing:** Crear tests para aprobación antes de deployar
3. **Notificaciones:** Agregar email/in-app cuando documento espera mi firma
4. **UI/UX:** Mejorar indicadores visuales de estado
5. **Documentación:** Crear guía de usuario para el sistema documental

---

**Próximo Paso:** Iniciar Fase 1 - Implementación de Flujo de Aprobación Real
