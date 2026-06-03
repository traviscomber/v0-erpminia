# Estado Actual MVP

Fecha de corte: 2026-06-03

## Resumen Ejecutivo

- Estado general estimado del MVP: 58%
- Base técnica fortalecida en:
  - Auth para APIs
  - Documentos
  - Legal / Contratos
  - Compliance score y compliance events
- Principal brecha actual:
  - Hay varias páginas visibles del dashboard que todavía dependen de APIs faltantes o mock data.

## Lo Que Ya Está Más Avanzado

### 1. Documentos

- API principal implementada:
  - `/api/documents`
  - `/api/documents/pending`
  - `/api/documents/stats`
  - `/api/documents/[id]/approve`
  - `/api/documents/[id]/reject`
- UI conectada a flujo real:
  - `app/dashboard/documentos/page.tsx`
- Upload con validación:
  - `components/documents/document-upload-modal.tsx`

### 2. Legal / Contratos

- APIs implementadas:
  - `/api/contracts`
  - `/api/contratos/nuevo`
  - `/api/contratos/reportes`
  - `/api/legal/documentos`
  - `/api/legal/contratos`
  - `/api/legal/compliance`
- Vista principal conectada:
  - `app/dashboard/documentos-gestion/contratos/page.tsx`
- Migración de reconciliación creada:
  - `db/migrations/010-legal-contracts-schema.sql`

### 3. Sostenibilidad Base

- APIs ya reales o parcialmente reales:
  - `/api/sostenibilidad/compliance-events`
  - `/api/sostenibilidad/compliance/calculate-score`
  - `/api/sostenibilidad/dashboard/overview`
  - `/api/sostenibilidad/inspecciones`
  - `/api/sostenibilidad/nonconformances`
  - `/api/sostenibilidad/corrective-actions`
- Componente conectado:
  - `components/sostenibilidad/compliance-calendar.tsx`

## Brechas Actuales Del MVP

### 1. APIs faltantes con páginas activas

Todavía hay páginas del dashboard consumiendo rutas que no existen en `app/api`.

Bloque principal pendiente:

- `/api/warehouse/stock`
- `/api/warehouse/reorder`
- `/api/warehouse/qr`
- `/api/dashboard/compras`
- `/api/dashboard/finanzas`
- `/api/dashboard/reportes`
- `/api/dashboard/ia-operacional`
- `/api/dashboard/kpi-dashboard`
- `/api/hse/capacitaciones`
- `/api/hse/epp`
- `/api/hse/kpis`
- `/api/sostenibilidad/calendario`
- `/api/sostenibilidad/capacitaciones`
- `/api/sostenibilidad/compliance-report`
- `/api/sostenibilidad/comunidades`
- `/api/sostenibilidad/corrective-actions/stats`
- `/api/sostenibilidad/documentos-flujo`
- `/api/sostenibilidad/epp`
- `/api/sostenibilidad/kpi`
- `/api/sostenibilidad/medio-ambiente`
- `/api/sostenibilidad/nonconformances/stats`

### 2. Mocks aún presentes

Persisten mocks en módulos funcionalmente importantes:

- `app/api/admin/users/route.ts`
- `app/api/sostenibilidad/nonconformances/route.ts`
- `app/api/sostenibilidad/corrective-actions/route.ts`
- `app/api/sostenibilidad/inspecciones/route.ts`
- `app/api/dashboard/produccion/route.ts`
- `app/dashboard/produccion/page.tsx`
- `app/dashboard/inventario/page.tsx`
- `app/dashboard/work-orders/create/page.tsx`
- `app/dashboard/work-orders/%5Bid%5D/page.tsx`

### 3. Rutas dinámicas mal resueltas

Hay carpetas codificadas como texto en vez de rutas dinámicas reales:

- `app/dashboard/work-orders/%5Bid%5D/page.tsx`
- `app/dashboard/mantenimiento/vehiculos/%5Bid%5D/arbol/page.tsx`

Estas deben migrarse a:

- `app/dashboard/work-orders/[id]/page.tsx`
- `app/dashboard/mantenimiento/vehiculos/[id]/arbol/page.tsx`

## Estado Por Módulo

### Documentos

- Estado: 85%
- Comentario: ya usable como slice MVP.

### Legal / Contratos

- Estado: 80%
- Comentario: backend principal ya está; falta consolidar reportería, validación y pruebas end-to-end.

### Sostenibilidad

- Estado: 55%
- Comentario: la base está, pero varios submódulos siguen con fallback mock o APIs faltantes.

### Mantención / Órdenes de Trabajo

- Estado: 45%
- Comentario: existe base de mantenimiento real, pero OT todavía mezcla formularios y vistas mock.

### Producción

- Estado: 35%
- Comentario: sigue muy apoyado en mock data.

### Bodega / Inventario

- Estado: 25%
- Comentario: hay UI, pero faltan endpoints principales.

### Compras / Finanzas / Reportes

- Estado: 20%
- Comentario: páginas visibles, pero sin backend correspondiente.

### HSE

- Estado: 35%
- Comentario: hay pantallas, pero faltan APIs clave para KPIs, capacitaciones y EPP.

### Administración

- Estado: 45%
- Comentario: usuarios existe en mock; permisos aún no tiene API real.

### IA / KPI Dashboard

- Estado: 15%
- Comentario: el frente está, pero falta backend real.

## Prioridad Recomendada

### Fase 1

- Cerrar Sostenibilidad operativa:
  - calendario
  - capacitaciones
  - epp
  - kpi
  - medio ambiente
  - comunidades
  - documentos flujo
  - compliance report
  - stats de NC y corrective actions

### Fase 2

- Cerrar Bodega + Mantención / OT:
  - stock
  - reorder
  - qr
  - OT detail real
  - create OT real

### Fase 3

- Cerrar Gestión Empresarial:
  - compras
  - finanzas
  - reportes

### Fase 4

- Cerrar HSE + IA/KPI:
  - hse kpis
  - hse epp
  - hse capacitaciones
  - ia operacional
  - dashboard kpi

## Siguiente Sprint Recomendado

Sprint siguiente enfocado en Sostenibilidad:

1. Crear APIs faltantes de sostenibilidad.
2. Reemplazar fallback mock por datos reales en las páginas activas.
3. Agregar endpoints `stats` para NC y acciones correctivas.
4. Dejar operativo el bloque:
   - capacitaciones
   - epp
   - kpi
   - calendario
   - medio ambiente
   - comunidades
   - flujo documental

## Meta de Cierre MVP

El MVP puede considerarse funcionalmente completo cuando:

- no queden páginas del sidebar apuntando a APIs inexistentes
- no queden flujos principales con mock data
- OT, Bodega, Sostenibilidad y Documentos funcionen end-to-end
- las rutas dinámicas estén corregidas
- exista una capa mínima de pruebas para login, documentos, contratos y sostenibilidad
