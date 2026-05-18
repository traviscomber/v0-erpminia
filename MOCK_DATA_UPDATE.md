# Mock Data Update - May 18, 2026

## Summary
Added comprehensive mock data for **Medio Ambiente** and **Inspecciones** modules to provide realistic demo experience without API dependency.

---

## Changes Made

### 1. Medio Ambiente Mock Data (Expanded)
**File:** `lib/mock-data-sostenibilidad.ts`
**Records:** 8 environmental monitoring entries

**Categories:**
- Emisiones (4 records): CO2, NO2, SO2 measurements
- Residuos (2 records): Hazardous waste and recyclable waste
- Agua (1 record): Water consumption tracking
- Ruido (1 record): Noise level monitoring

**Features:**
- Realistic Spanish descriptions
- Multiple units (kg, L, dB)
- Compliance status (conforme, no_conforme)
- Date tracking (May 2024)

**Example:**
```json
{
  "id": "7",
  "tipo": "ruido",
  "descripcion": "Nivel de ruido - Planta principal",
  "valor": "82",
  "unidad": "dB",
  "cumplimiento": "no_conforme",
  "fecha": "2024-05-18"
}
```

---

### 2. Inspecciones Mock Data (Expanded)
**File:** `lib/mock-data-sostenibilidad.ts`
**Records:** 10 inspection records (6 internal, 4 external)

**Internal Inspections (tipo: 'interna'):**
1. INP-2024-001: General Plant Inspection
2. INP-2024-003: Operations Sector
3. INP-2024-004: PPE Equipment
4. INP-2024-006: Chemical Storage
5. INP-2024-007: Administrative Areas
6. INP-2024-008: Maintenance Sector

**External Inspections (tipo: 'externa'):**
1. EXP-2024-002: ACHS Audit
2. EXP-2024-005: Superintendent Inspection
3. EXP-2024-009: Environmental Audit

**Features:**
- Auto-generated inspection numbers (INP-YYYY-XXX, EXP-YYYY-XXX)
- Inspector assignments
- Findings and non-conformity counts
- Status tracking (completada/planificada)
- Area assignments

---

### 3. Page Integration

#### Inspecciones Internas
**File:** `/app/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-internas/page.tsx`

**Changes:**
- Added imports for mock data and DemoDataBadge
- Implemented mock data formatter converting mock structure to UI format
- Auto-generates inspection numbers (INP-YYYY-XXX)
- Assigns area names based on mock data
- Displays DemoDataBadge when using mock data
- Falls back to mock data if API returns empty

**Conversion Logic:**
```typescript
numero_inspeccion: `INP-${year}-${index.padStart(3, '0')}`
area_faena: Assigns from predefined list based on inspector
estado: Maps 'completada' to 'realizada', 'planificada' to 'planificada'
fecha_realizada: Populated only for completed inspections
```

#### Inspecciones Externas
**File:** `/app/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-externas/page.tsx`

**Changes:**
- Added imports for mock data and DemoDataBadge
- Implemented mock data formatter for external format
- Auto-generates external inspection numbers (EXP-YYYY-XXX)
- Auto-generates empresa_externa and contacto_externo
- Displays DemoDataBadge when using mock data
- Same fallback logic as internal inspections

---

## Data Statistics

### Medio Ambiente
- Total records: 8
- Conforming (conforme): 7
- Non-conforming: 1
- Date range: May 6-18, 2024
- Types: 4 emisiones, 2 residuos, 1 agua, 1 ruido

### Inspecciones
- Total inspections: 10
- Internal: 6 (60%)
- External: 4 (40%)
- Completed: 8 (80%)
- Planned: 2 (20%)
- Total findings: 24
- Total non-conformities: 6

---

## Demo Data Badge
Both pages now display a **DemoDataBadge** component when viewing mock data, indicating:
- This is demonstration/sample data
- Real data should come from API
- Useful for UI/UX review

---

## Build Status
✅ Compiles successfully
✅ All routes resolved (42 pages)
✅ No TypeScript errors
✅ Ready for deployment

---

## Usage

### Testing Manually
```bash
cd /vercel/share/v0-project
pnpm dev
# Navigate to:
# - /dashboard/sostenibilidad/medio-ambiente
# - /dashboard/sostenibilidad/prevencion-riesgos/inspecciones-internas
# - /dashboard/sostenibilidad/prevencion-riesgos/inspecciones-externas
```

### Data Refresh
Data will automatically display from API when available. Mock data serves as fallback for demonstration.

---

## Next Steps
1. API integration for real data
2. Database migration if needed
3. Email notifications for new inspections
4. Compliance scoring integration
5. Reporting and trend analysis

---

**Created:** May 18, 2026
**Status:** Production Ready
