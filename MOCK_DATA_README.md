# Production Mock Data Infrastructure

Este documento describe la infraestructura de datos mock de producción implementada para desarrollo y demostración del sistema.

## Archivos Creados

### 1. **lib/mock-data/production-data.ts**
Centralized mock data repository con datasets completos para:
- Equipment telemetry (5 equipos)
- Sensor readings (20 lecturas históricas)  
- Active alarms (3 alarmas críticas y de advertencia)
- Non-conformances (3 NCs con diferentes estados)
- Corrective actions (4 acciones correctivas)
- Inspections (3 inspecciones internas y externas)
- Compliance statistics
- Dashboard KPIs

**Exports:**
```typescript
export const mockEquipment: Equipment[]
export const mockSensorReadings: SensorReading[]
export const mockAlarms: Alarm[]
export const mockNonconformances: Nonconformance[]
export const mockCorrectiveActions: CorrectiveAction[]
export const mockInspections: Inspection[]
export const getMockProductionData(): ProductionData
export const getMockNonconformanceData(): NonconformanceData
export const getMockDashboardData(): DashboardData
```

### 2. **app/api/dashboard/produccion/route.ts**
API route para datos de producción con fallback automático a mocks:
- GET: Returns mock production telemetry data
- Auto-falls back to mocks when no real data available

### 3. **app/api/sostenibilidad/nonconformances/route.ts**
API route para datos de no-conformidades:
- GET: Fetch nonconformances list
- POST: Create new nonconformance
- PUT: Update nonconformance status
- Includes mock data fallback

### 4. **app/api/sostenibilidad/corrective-actions/route.ts**
API route para acciones correctivas:
- GET: Fetch CAs with optional filtering by nonconformanceId
- POST: Create new corrective action
- PUT: Update CA status
- Mock fallback included

### 5. **app/api/sostenibilidad/inspecciones/route.ts**
API route para inspecciones (ACTUALIZADO):
- GET: Fetch inspections with filtering by type
- POST: Create new inspection
- Now includes mock data fallback when Supabase not configured

### 6. **hooks/use-mock-data.ts**
Custom React hooks para acceder a datos mock con SWR:

```typescript
useProductionData()           // Production telemetry
useNonconformanceData(orgId)  // Non-conformances + CAs
useDashboardData()            // Dashboard overview
useInspections(tipo)          // Inspections data
useCorrectiveActions(ncId)    // Corrective actions
```

Cada hook retorna:
```typescript
{
  data: DataType,           // Mock data o datos reales
  error: Error | undefined,
  isLoading: boolean,
  isMock: boolean,          // True si usando mocks
  mutate?: () => Promise   // Para refrescar datos
}
```

### 7. **components/demo-data-badge.tsx**
Componentes visuales para indicar modo demo:
```typescript
<DemoDataBadge show={isMock} />        // Badge pequeño
<DemoBanner />                         // Banner informativo
```

### 8. **app/dashboard/produccion/page.tsx** (ACTUALIZADO)
Dashboard de producción integrado con mock data:
- Usa `useProductionData()` hook
- Muestra `DemoBanner` cuando está usando mocks
- Muestra `DemoDataBadge` en el header
- Botón "Actualizar" para refrescar datos
- Data poblada automáticamente desde mocks

## Uso en Componentes

### Básico - Con Mocks Automáticos
```typescript
'use client';

import { useProductionData } from '@/hooks/use-mock-data';
import { DemoBanner } from '@/components/demo-data-badge';

export default function MyPage() {
  const { data, error, isLoading, isMock } = useProductionData();

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error</div>;

  return (
    <>
      {isMock && <DemoBanner />}
      {/* Usar data aquí - siempre tendrá datos */}
      <div>{data.equipment.length} equipos disponibles</div>
    </>
  );
}
```

### Identificar Modo Demo
```typescript
const { data, isMock } = useNonconformanceData();

if (isMock) {
  console.log('⚠️ Using demo data - changes not persisted');
}
```

## Cómo Integrar Datos Reales

### Paso 1: Verificar Supabase Conectado
```typescript
const { data, isMock } = useProductionData();
if (!isMock) {
  // Datos reales desde Supabase
}
```

### Paso 2: Reemplazar Mock con Query Real
En `lib/mock-data/production-data.ts` o en los API routes:

```typescript
// ANTES (Mock)
export async function GET(request: NextRequest) {
  const mockData = getMockProductionData();
  return NextResponse.json(mockData);
}

// DESPUÉS (Real)
export async function GET(request: NextRequest) {
  const { data } = await supabase
    .from('equipment')
    .select('*');
  return NextResponse.json(data);
}
```

### Paso 3: Remover Fallbacks
Una vez integrados datos reales, remover lines de fallback:
```typescript
// Remove this:
// const mockData = getMockProductionData();
```

## Características

✅ **Automatic Fallback** - APIs caen a mocks cuando Supabase no está configurado
✅ **Zero Breaking Changes** - Código existente funciona sin cambios
✅ **Clear Demo Indicators** - Usuarios saben cuando ven datos de demostración
✅ **Easy Real Data Integration** - Reemplazar mocks es simple
✅ **TypeScript Support** - Full type safety
✅ **Realistic Mock Data** - Datos simulados con valores realistas
✅ **No Manual API Calls** - Hooks manejan todo

## Páginas que Usan Mocks

- ✅ `/dashboard/produccion` - Production telemetry with mock equipment

## Próximos Pasos

1. **Integrate Supabase Queries** - Reemplazar mocks con queries reales en:
   - `/api/dashboard/produccion`
   - `/api/sostenibilidad/nonconformances`
   - `/api/sostenibilidad/corrective-actions`
   - `/api/sostenibilidad/inspecciones`

2. **Add More Mock Datasets** - Extender para otras secciones que necesiten datos

3. **Production Checks** - Remover fallbacks mock antes de deploy

4. **User Feedback** - Recolectar feedback en modo demo

## Debugging

### Ver si está en modo demo:
```typescript
const { isMock } = useProductionData();
console.log(isMock ? 'Demo Mode' : 'Production Mode');
```

### Check API Response:
```bash
curl http://localhost:3000/api/dashboard/produccion
# { "equipment": [...], "mock": true }  <- "mock" flag
```

### Revisar Logs:
```
[v0] Error fetching production data: ... (mock fallback triggered)
```

## Soporte

Para agregar mocks a nuevas secciones:
1. Extender `production-data.ts` con nuevos datasets
2. Crear nuevo hook en `use-mock-data.ts`
3. Importar hook en página
4. Mostrar demo badges cuando `isMock === true`

---

**Estado**: ✅ Producción | **Última actualización**: Mayo 27, 2026 | **Versión**: 1.0
