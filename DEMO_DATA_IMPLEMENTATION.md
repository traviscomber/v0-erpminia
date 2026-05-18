# Demo Data Implementation - Sostenibilidad Module

**Date:** May 18, 2026  
**Status:** ✅ Complete

## Overview

Added comprehensive mock/demo data to all 6 sostenibilidad pages with visual indicators showing when demo data is being used. This allows users to see realistic examples of what their data will look like when they start creating records.

## What Was Added

### 1. **Mock Data Library** (`/lib/mock-data-sostenibilidad.ts`)
- `mockKPIData` - 3 months of KPI indicators (accidentabilidad, frecuencia, gravedad, días sin accidentes)
- `mockCapacitacionesData` - 2 capacity training records (ACHS, OTEC types)
- `mockEPPData` - 3 PPE items by position/role
- `mockMedioAmbienteData` - Environmental monitoring records (emissions, waste, water, noise)
- `mockComunidadesData` - 3 community interaction records (events, communications, commitments)
- `mockCalendarioData` - 3 scheduled events (inspections, trainings, audits)
- `mockFlujDocumentalData` - 2 documents in approval workflow

### 2. **Demo Badge Component** (`/components/sostenibilidad/demo-data-badge.tsx`)
- Visual indicator showing "Demo Data" with AlertCircle icon
- Styled with muted colors to be subtle but visible
- Displays when API returns empty/no data

### 3. **Pages Updated**
All 6 pages now have:
- ✅ Import of mock data library and DemoDataBadge component
- ✅ Logic to use mock data when API returns empty results
- ✅ Demo badge in header showing demo status
- ✅ Demo data automatically shows realistic examples

**Pages:**
1. **KPI Prevención** - Shows 3 months of KPI trends with chart
2. **Capacitaciones** - Shows training records with dates and instructors
3. **Artículos EPP** - Shows PPE matrix by position
4. **Medio Ambiente** - Shows environmental monitoring records
5. **Comunidades** - Shows community engagement records
6. **Calendario** - Shows scheduled events on calendar
7. **Flujo Documental** - Shows documents in approval workflow

## How It Works

1. **API Call**: Page attempts to fetch from API endpoint
2. **Empty Check**: If API returns empty array or null, mock data is used
3. **Visual Indicator**: Badge displays in header showing "Demo Data"
4. **Real Data**: Once user creates actual data via forms, real data will show and badge disappears
5. **User Experience**: Users see realistic examples before creating their own records

## Data Realism

All mock data mimics real-world scenarios:
- ✅ Spanish labels and descriptions
- ✅ Realistic company/person names
- ✅ Proper date formats
- ✅ Authentic business processes
- ✅ Expected field values and ranges
- ✅ Professional structure matching database schema

## Technical Implementation

### Mock Data Helper
```typescript
export function addMockDataIfEmpty(data: any, mockData: any) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return mockData;
  }
  return data;
}
```

### Badge Display Logic
```typescript
{isDemo && <DemoDataBadge />}
// or in filtered views:
{(!registros || (registros.data && registros.data.length === 0)) && <DemoDataBadge />}
```

## Benefits

1. **User Onboarding** - New users see realistic examples immediately
2. **Feature Discovery** - Users can explore all functionality with sample data
3. **Development Testing** - Developers can test UI without creating data
4. **Data Structure Clarity** - Users understand expected data format
5. **Professional Appearance** - Shows the system is production-ready

## Files Modified

- `/lib/mock-data-sostenibilidad.ts` - Created
- `/components/sostenibilidad/demo-data-badge.tsx` - Created
- `/app/dashboard/sostenibilidad/prevencion-riesgos/kpi/page.tsx` - Updated
- `/app/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones/page.tsx` - Updated
- `/app/dashboard/sostenibilidad/prevencion-riesgos/epp/page.tsx` - Updated
- `/app/dashboard/sostenibilidad/medio-ambiente/page.tsx` - Updated
- `/app/dashboard/sostenibilidad/comunidades/page.tsx` - Updated
- `/app/dashboard/sostenibilidad/calendario/page.tsx` - Updated
- `/app/dashboard/sostenibilidad/documentos-flujo/page.tsx` - Updated

## Next Steps (Optional)

- Add "Clear Demo Data" button to pages for users who want fresh view
- Add loading states while real data is being fetched
- Implement demo data reset functionality
- Consider caching mock data at page level for faster loading
