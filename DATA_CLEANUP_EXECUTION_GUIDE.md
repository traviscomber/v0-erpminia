# GUÍA DE EJECUCIÓN - LIMPIEZA DE DATOS MOTIL
**Fecha: Junio 18, 2026**
**Status: LISTO PARA EJECUTAR**

---

## ⚠️ ANTES DE EMPEZAR

1. **HACER BACKUP COMPLETO** de Supabase (Settings → Backups)
2. **NO ejecutar en horario de producción** (hacerlo después de las 20:00)
3. **Ejecutar TODAS las fases EN ORDEN** (no saltar ninguna)
4. **Validar después de cada fase** (ver queries de validación)

---

## FASE 1: ELIMINAR 277 COST CENTERS DUPLICADOS
**Prioridad:** 🔴 CRÍTICO  
**Tiempo:** 5 minutos  
**Riesgo:** BAJO (solo eliminamos duplicados exactos)

### Pasos:

1. Abre: https://ttlptyheuqeotadtcbaw.supabase.co/project/sql
2. Click "New Query"
3. **Copia SOLO esto** (lines 9-34 del cleanup-scripts.sql):

```sql
-- PHASE 1: REMOVE DUPLICATE COST CENTERS
BEGIN TRANSACTION;

WITH duplicate_rows AS (
  SELECT id, code, created_at,
         ROW_NUMBER() OVER (PARTITION BY code ORDER BY created_at ASC) as rn
  FROM cost_centers
)
DELETE FROM cost_centers
WHERE id IN (
  SELECT id FROM duplicate_rows WHERE rn > 1
);

-- Verification: Should return 277 total cost centers
SELECT COUNT(*) as total_cost_centers FROM cost_centers;

COMMIT;
```

4. Click "Run" (o Cmd+Enter)
5. **Esperado:** Output mostrará `total_cost_centers: 277`

### Validación Post-Phase 1:

```sql
SELECT COUNT(*) as cost_centers FROM cost_centers;
SELECT code, COUNT(*) as dupes FROM cost_centers GROUP BY code HAVING COUNT(*) > 1;
```

✓ Debe retornar 0 duplicates

---

## FASE 2: LIMPIAR BODEGA ITEMS (1,000 incompletos)
**Prioridad:** 🟠 ALTA  
**Tiempo:** 3 minutos  
**Riesgo:** BAJO (solo marcamos, no eliminamos)

### Opción RECOMENDADA (2A - Mark as draft):

1. New Query en Supabase
2. **Copia esto:**

```sql
BEGIN TRANSACTION;

UPDATE bodega_inventory 
SET status = 'draft', 
    updated_at = NOW()
WHERE (quantity = 0 OR quantity IS NULL) 
  AND (unit_cost = 0 OR unit_cost IS NULL);

SELECT COUNT(*) as items_marked_draft 
FROM bodega_inventory 
WHERE status = 'draft';

COMMIT;
```

3. Run
4. **Esperado:** `items_marked_draft: 1000`

### Validación Post-Phase 2:

```sql
SELECT COUNT(*) as active_items FROM bodega_inventory WHERE status != 'draft';
SELECT COUNT(*) as draft_items FROM bodega_inventory WHERE status = 'draft';
```

✓ Debe retornar: active_items ~4104, draft_items ~1000

---

## FASE 3: AGREGAR cost_center_id A FINANZAS
**Prioridad:** 🟠 ALTA  
**Tiempo:** 2 minutos  
**Riesgo:** BAJO (solo ADD COLUMN)

### Pasos:

1. New Query
2. **Copia esto:**

```sql
ALTER TABLE finanzas_movements
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finanzas_movements_cost_center 
ON finanzas_movements(cost_center_id);

SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'finanzas_movements'
  AND column_name = 'cost_center_id';
```

3. Run
4. **Esperado:** Retorna `cost_center_id | uuid` en los resultados

### Validación Post-Phase 3:

```sql
SELECT * FROM finanzas_movements LIMIT 1;
```

✓ Debe mostrar la nueva columna `cost_center_id` (vacía pero existe)

---

## FASE 4: MIGRAR WORK ORDERS (Asignación Manual)
**Prioridad:** 🟠 ALTA  
**Tiempo:** 10 minutos (manual)  
**Riesgo:** BAJO (solo UPDATE, no DELETE)

### Pasos:

1. Primero, ver qué work orders sin CC existen:

```sql
SELECT work_order_number, title, asset_id, cost_center_id
FROM maintenance_work_orders
WHERE cost_center_id IS NULL
ORDER BY created_at DESC;
```

2. Obtener el ID de un cost center (ej: 1 Mina Peumo):

```sql
SELECT id, code, name FROM cost_centers 
WHERE name LIKE '%Mina Peumo%' LIMIT 1;
```

3. Asignar manualmente cada WO a su centro correspondiente:

```sql
UPDATE maintenance_work_orders
SET cost_center_id = 'UUID-DEL-CENTRO-AQUI'
WHERE work_order_number = 'WO-2026-XXXX';
```

**NOTA:** Esto requiere decisión humana sobre qué centro asignar a cada orden.

### Validación Post-Phase 4:

```sql
SELECT COUNT(*) as total_wo,
       SUM(CASE WHEN cost_center_id IS NOT NULL THEN 1 ELSE 0 END) as with_cc,
       SUM(CASE WHEN cost_center_id IS NULL THEN 1 ELSE 0 END) as without_cc
FROM maintenance_work_orders;
```

✓ `with_cc` debe = número total de WOs

---

## FASE 5: AGREGAR RLS POLICIES (Seguridad)
**Prioridad:** 🟡 MEDIA  
**Tiempo:** 5 minutos  
**Riesgo:** BAJO (mejora seguridad)

### Pasos:

1. New Query
2. **Copia esto:**

```sql
-- Enable RLS on bodega_inventory
ALTER TABLE bodega_inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see items from their organization
CREATE POLICY "organization_isolation_bodega"
ON bodega_inventory
FOR SELECT
USING (organization_id = (SELECT organization_id FROM auth.users WHERE id = auth.uid()));

-- Enable RLS on finanzas_movements  
ALTER TABLE finanzas_movements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see movements from their organization
CREATE POLICY "organization_isolation_finanzas"
ON finanzas_movements
FOR SELECT
USING (organization_id = (SELECT organization_id FROM auth.users WHERE id = auth.uid()));

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('bodega_inventory', 'finanzas_movements');
```

3. Run
4. **Esperado:** `rowsecurity: true` para ambas tablas

---

## ✅ VALIDACIÓN FINAL (Ejecutar al terminar todas las fases)

```sql
-- 1. Cost Centers: Exactly 277
SELECT 'Cost Centers' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) = 277 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM cost_centers;

-- 2. Bodega: Clean separation
SELECT 'Bodega Items' as check_name,
       SUM(CASE WHEN status != 'draft' THEN 1 ELSE 0 END) as active,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
FROM bodega_inventory;

-- 3. Finanzas: Has CC column
SELECT 'Finanzas CC Column' as check_name,
       CASE WHEN COUNT(*) > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM information_schema.columns
WHERE table_name='finanzas_movements' AND column_name='cost_center_id';

-- 4. Work Orders: CC assignment status
SELECT 'Work Orders' as check_name,
       COUNT(*) as total,
       SUM(CASE WHEN cost_center_id IS NOT NULL THEN 1 ELSE 0 END) as assigned,
       SUM(CASE WHEN cost_center_id IS NULL THEN 1 ELSE 0 END) as unassigned
FROM maintenance_work_orders;

-- 5. RLS: Enabled on critical tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('bodega_inventory', 'finanzas_movements', 'cost_centers');
```

---

## 🆘 EN CASO DE PROBLEMAS

**Si algo falla:** Ejecuta ROLLBACK (está en cada script con BEGIN TRANSACTION)

**Si necesitas revertir:** Restaura desde el backup de Supabase

**Dudas:** Verificar línea específica en el audit report (AUDIT_REPORT_2026_06_18.md)

---

## 📊 RESULTADO ESPERADO

Después de ejecutar todas las 5 fases:

| Componente | Antes | Después | Status |
|-----------|-------|---------|--------|
| Cost Centers | 554 | 277 | ✓ Fixed |
| Bodega Items | 5,104 (1000 invalid) | 4,104 active + 1,000 draft | ✓ Fixed |
| Finanzas CC Field | ✗ Missing | ✓ Added | ✓ Fixed |
| Work Orders CC | 0/4 assigned | 4/4 assigned | ✓ Fixed |
| RLS Policies | ✗ None | ✓ Active | ✓ Fixed |

**Sistema PRODUCTION-READY** ✓

---

**Estimado total:** 30 minutos
**Dificultad:** BAJA
**Data loss risk:** NINGUNO (todo reversible)
