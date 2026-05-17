# SOSTENIBILIDAD MODULE - DETAILED REMAINING WORK

## CURRENT STATE: 60% COMPLETE

---

## PAGES BREAKDOWN

### ✅ FULLY IMPLEMENTED (8 pages)

| # | Página | Estado | CRUD | Búsqueda | Filtros | Gráficos | API |
|---|--------|--------|------|----------|---------|----------|-----|
| 1 | Dashboard Principal | ✅ DONE | - | - | - | ✅ KPIs | ✅ |
| 2 | Capacitaciones | ✅ DONE | ✅ CREATE, READ, UPDATE, DELETE | ✅ Por nombre | ❌ | - | ✅ |
| 3 | Inspecciones Internas | ✅ DONE | ✅ CREATE, READ, UPDATE, DELETE | ✅ Por número/área | ❌ | - | ✅ |
| 4 | EPP (Inventario) | ✅ DONE | ❌ LIST ONLY | ❌ | ❌ | - | ✅ |
| 5 | KPI (Prevención) | ✅ DONE | - | - | - | ⚠️ Mock | ✅ |
| 6 | Calendario | ✅ DONE | ❌ READ ONLY | - | - | ✅ 3 vistas | ✅ |
| 7 | Documentos-Flujo | ✅ DONE | ⚠️ Aprobación 2-step | - | - | ✅ Workflow | ✅ |
| 8 | Prevención Dashboard | ✅ DONE | - | - | - | ✅ Cards | ✅ |

### ⚠️ PARTIALLY IMPLEMENTED - LANDING ONLY (3 pages)

| # | Página | Estado | Necesita |
|---|--------|--------|----------|
| 9 | Inspecciones Externas | 🟡 Landing | CRUD (duplicar Internas) + campos nuevos |
| 10 | Medio Ambiente | 🟡 Landing | Estructura + CRUD + API |
| 11 | Comunidades | 🟡 Landing | Estructura + CRUD + API |

---

## DETAILED REMAINING WORK

### 🔴 HIGH PRIORITY - DO FIRST (4-5 hours)

#### 1. INSPECCIONES EXTERNAS - CRUD Implementation [30 min]
**Current:** Landing page only  
**Needs:**
```
Components:
  - Duplicate: /components/sostenibilidad/inspeccion-modal.tsx
  - Rename to: inspeccion-externa-modal.tsx
  - Change fields: add "empresa_externa", "contacto_externo"
  - Update Zod schema for new fields

Page:
  - /app/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-externas/page.tsx
  - Use same pattern as inspecciones-internas
  - API endpoint: ?tipo=externas

API:
  - Already supports ?tipo=externas in existing route
  - No new backend needed
```

**Effort:** 30 min (copy-paste + field adjustments)  
**Files to create:** 1 new component  
**Files to update:** 1 existing page  

---

#### 2. NOTIFICATIONS (Toasts) - UX Enhancement [45 min]
**Current:** NO feedback when actions complete  
**Needs:**
```
Install:
  npm install sonner

Implementation:
  - Toast on CREATE success: "Inspección creada exitosamente"
  - Toast on UPDATE success: "Cambios guardados"
  - Toast on DELETE success: "Inspección eliminada"
  - Toast on ERROR: Show error message
  - Toast on LOADING: Optional spinner toast

Files to update:
  - inspeccion-modal.tsx (add toasts in handleSubmit)
  - confirm-delete-dialog.tsx (add toast in handleDelete)
  - inspecciones-internas/page.tsx (propagate toasts)
  - inspecciones-capacitaciones/page.tsx (same)
  
Usage:
  import { toast } from 'sonner'
  toast.success('Created!')
  toast.error('Error: ' + error.message)
```

**Effort:** 45 min  
**Affects:** All CRUD pages immediately  
**ROI:** Very high - improves UX across entire module  

---

#### 3. REUSABLE COMPONENTS [1 hour]
**Current:** Limited component library  
**Needs:**

```
Component 1: EmptyState
- Location: /components/sostenibilidad/empty-state.tsx
- Usage: When table has no data
- Props: icon, title, description, action (optional)
- Example: EmptyState icon={FileX} title="No inspecciones" description="Crea la primera" action={...}

Component 2: LoadingSkeleton  
- Location: /components/sostenibilidad/loading-skeleton.tsx
- Usage: While table/data is loading
- Props: rows (number of skeleton rows)
- Replaces: Current loading state in tables

Component 3: FilterPanel
- Location: /components/sostenibilidad/filter-panel.tsx
- Usage: Advanced filtering in inspecciones
- Props: filters, onFilter, onReset
- Filters: estado, fecha_desde, fecha_hasta, inspector

Component 4: DateRangePicker
- Location: /components/sostenibilidad/date-range-picker.tsx
- Usage: Select date ranges for filters/reports
- Props: value, onChange
- Format: YYYY-MM-DD

Files to update:
  - inspecciones-internas/page.tsx (add FilterPanel, EmptyState, LoadingSkeleton)
  - inspecciones-capacitaciones/page.tsx (same)
```

**Effort:** 1 hour  
**Reusable:** Yes - for ALL modules  
**ROI:** High - accelerates future modules  

---

#### 4. KPI CHARTS - Real Data [1 hour]
**Current:** Mock data, no real charts  
**Needs:**
```
Location: /app/dashboard/sostenibilidad/page.tsx

Current charts:
  - Total inspecciones (mock: 127)
  - Realizadas vs Planificadas (mock)
  - Hallazgos por área (mock)

Changes needed:
  - Replace mock data with SWR query to Supabase
  - Query: SELECT COUNT(*) FROM inspecciones_internas WHERE estado='realizada'
  - Chart 1: Line chart - inspecciones por día (últimos 30 días)
  - Chart 2: Bar chart - inspecciones por área
  - Chart 3: Pie chart - estado distribution

Libraries available:
  - Recharts (already installed)

Example query:
  const { data: stats } = useSWR(
    '/api/sostenibilidad/kpi',
    fetcher
  )
```

**Effort:** 1 hour  
**Requires:** /api/sostenibilidad/kpi endpoint (needs to be created)  

---

#### 5. ADVANCED FILTERS [1 hour]
**Current:** Only text search (número, área)  
**Needs:**
```
New filters for Inspecciones:
  1. Estado: [planificada, realizada, cerrada]
  2. Fecha desde - hasta (date range)
  3. Inspector: [dropdown of inspectors]
  4. Área: [existing area list]

Implementation:
  - Create FilterPanel component (above table)
  - Multiple select checkboxes
  - Date range picker
  - Apply/Reset buttons
  - Filters combine with AND logic

Files to update:
  - inspecciones-internas/page.tsx
  - inspecciones-capacitaciones/page.tsx
  - App routes stay same, just filter results client-side
```

**Effort:** 1 hour  
**Dependencies:** FilterPanel component (from #3)  

---

### 🟠 MEDIUM PRIORITY - DO NEXT (5-6 hours)

#### 6. MEDIO AMBIENTE - Complete Page [1.5 hours]
**Current:** Landing page only  
**Needs:**
```
Decide structure first - Option A (Recommended):
  - Emisiones a la atmósfera
  - Residuos (clasificación)
  - Consumo de agua
  - Ruido
  - Energía

Architecture (copy Inspecciones pattern):
  - Frontend: /app/dashboard/sostenibilidad/medio-ambiente/page.tsx
  - Component: /components/sostenibilidad/medio-ambiente-modal.tsx
  - Backend: /api/sostenibilidad/medio-ambiente/route.ts
  - DB Table: medio_ambiente (with columns: tipo, dato, fecha, etc)

Effort breakdown:
  - Create DB table: 15 min
  - Create API endpoint: 20 min
  - Create modal component: 30 min
  - Create page: 25 min
```

**Effort:** 1.5 hours  
**Dependencies:** None  

---

#### 7. COMUNIDADES - Complete Page [1.5 hours]
**Current:** Landing page only  
**Needs:**
```
Decide structure first - Option A (Recommended):
  - Eventos de relaciones comunitarias
  - Comunicaciones enviadas
  - Reportes de retroalimentación

Same architecture as Medio Ambiente

Effort breakdown:
  - Create DB table: 15 min
  - Create API endpoint: 20 min
  - Create modal component: 30 min
  - Create page: 25 min
```

**Effort:** 1.5 hours  
**Dependencies:** None  

---

#### 8. EXPORT TO PDF/EXCEL [1 hour]
**Current:** NO export functionality  
**Needs:**
```
Install:
  npm install html2pdf.js

Implementation:
  - Add "Download PDF" button to table
  - Add "Download Excel" button to table
  - Export current table data with filters applied

Files to update:
  - inspecciones-internas/page.tsx (add export buttons)
  - inspecciones-capacitaciones/page.tsx (same)

Export format:
  - PDF: Professional layout with header, table, date
  - Excel: .xlsx format with multiple sheets (data + summary)
```

**Effort:** 1 hour  
**Libraries:** html2pdf, xlsx  

---

#### 9. REPORTS BY PERIOD [1.5 hours]
**Current:** NO reports  
**Needs:**
```
New page: /app/dashboard/sostenibilidad/reportes/

Components:
  - Date range selector (mes, trimestre, año)
  - Summary cards (total, realizadas, hallazgos, etc)
  - Line chart - trend over time
  - Bar chart - by area
  - Export as PDF

Data needed:
  - Inspecciones por mes/trimestre
  - Hallazgos por tipo
  - Inspectores más activos
```

**Effort:** 1.5 hours  

---

### 🟡 LOW PRIORITY - NICE TO HAVE (4-5 hours)

#### 10. GLOBAL SEARCH [1 hour]
- Search across all sostenibilidad pages
- Autocomplete suggestions
- Jump to any result

#### 11. AUDIT LOG [1.5 hours]
- Track all changes: created_by, created_at, updated_by, updated_at
- View history of changes per inspection
- Show before/after values

#### 12. COMMENTS/NOTES [1 hour]
- Add notes/comments to inspections
- Comment history with timestamps
- @mentions support (optional)

#### 13. ASSIGN RESPONSIBLES [1.5 hours]
- Assign inspections to people
- Personal dashboard
- Email notifications

#### 14. AUTOMATED TESTING [2+ hours]
- Unit tests (React Testing Library)
- E2E tests (Playwright/Cypress)
- Test coverage reports

---

## EFFORT ESTIMATE SUMMARY

| Priority | Tasks | Hours | Cumulative |
|----------|-------|-------|-----------|
| HIGH | 5 tasks | 4.5h | 4.5h |
| MEDIUM | 4 tasks | 6h | 10.5h |
| LOW | 5 tasks | 5h+ | 15.5h+ |

**Timeline with 1 developer:**
- HIGH priority: 1 day
- HIGH + MEDIUM: 2-3 days
- ALL: 4-5 days

---

## RECOMMENDED NEXT STEPS - TOP 3 QUICK WINS

### Plan A: QUICK (2 hours) - Maximum velocity
1. Inspecciones Externas (30 min) → +1 page done
2. Notifications (45 min) → Better UX everywhere
3. Reusable Components (45 min) → Accelerate future modules

**Result:** 3 tasks done, solid foundation for scaling

### Plan B: BALANCED (4.5 hours) - All HIGH priority
Do all 5 HIGH priority items in sequence

**Result:** Module reaches 85% completion

### Plan C: COMPLETE (10.5 hours) - Full module
Do all HIGH + MEDIUM priorities

**Result:** Module reaches 100% completion

---

## NEXT STEP: CHOOSE ONE

Which would you like to implement first?

A) **Plan A: Quick wins** (2h) - Inspecciones Externas + Notifications + Components
B) **Plan B: Balanced** (4.5h) - All HIGH priority tasks  
C) **Plan C: Complete** (10.5h) - All HIGH + MEDIUM tasks
D) **Custom** - Pick specific tasks

Choose and let's build it!

