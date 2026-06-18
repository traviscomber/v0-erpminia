-- MOTIL DATA CLEANUP SCRIPTS
-- Date: June 18, 2026
-- These scripts fix the issues identified in the audit report

-- ============================================================================
-- PHASE 1: REMOVE DUPLICATE COST CENTERS
-- ============================================================================
-- This removes 277 duplicate cost_center records
-- Keep the older ones, remove the newer duplicates

BEGIN TRANSACTION;

-- Step 1: Identify duplicates (for review before deletion)
SELECT code, COUNT(*) as count, 
       MIN(created_at) as oldest,
       MAX(created_at) as newest
FROM cost_centers
GROUP BY code
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 2: Create a CTE to identify which rows to delete
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

-- ============================================================================
-- PHASE 2: CLEAN BODEGA ITEMS WITH INCOMPLETE DATA
-- ============================================================================
-- Options: Mark as draft OR delete completely
-- Choose ONE of the following approaches:

-- OPTION 2A: Mark as draft (SAFE - keeps data for auditing)
BEGIN TRANSACTION;

UPDATE bodega_inventory 
SET status = 'draft', 
    updated_at = NOW()
WHERE (quantity = 0 OR quantity IS NULL) 
  AND (unit_cost = 0 OR unit_cost IS NULL);

-- Verification
SELECT COUNT(*) as items_marked_draft 
FROM bodega_inventory 
WHERE (quantity = 0 OR quantity IS NULL) 
  AND (unit_cost = 0 OR unit_cost IS NULL);

COMMIT;

-- OPTION 2B: DELETE INCOMPLETE ITEMS (DESTRUCTIVE - requires backup first)
-- BEGIN TRANSACTION;
-- DELETE FROM bodega_inventory
-- WHERE (quantity = 0 OR quantity IS NULL) 
--   AND (unit_cost = 0 OR unit_cost IS NULL);
-- 
-- SELECT COUNT(*) as remaining_items FROM bodega_inventory;
-- COMMIT;

-- ============================================================================
-- PHASE 3: ADD cost_center_id TO FINANZAS_MOVEMENTS
-- ============================================================================
-- Add the missing column to finanzas_movements table

ALTER TABLE finanzas_movements
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_finanzas_movements_cost_center 
ON finanzas_movements(cost_center_id);

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'finanzas_movements'
  AND column_name = 'cost_center_id';

-- ============================================================================
-- PHASE 4: MIGRATE EXISTING WORK ORDERS (OPTIONAL AUTO-ASSIGN)
-- ============================================================================
-- If work orders need to be assigned a default cost center
-- This is a manual process - administrator should assign appropriate CC

-- To manually update: 
-- UPDATE maintenance_work_orders
-- SET cost_center_id = 'uuid-of-appropriate-center'
-- WHERE cost_center_id IS NULL
--   AND work_order_number = 'WO-2026-XXXX';

-- Or get summary of unassigned work orders
SELECT work_order_number, title, asset_id, cost_center_id
FROM maintenance_work_orders
WHERE cost_center_id IS NULL
ORDER BY created_at DESC;

-- ============================================================================
-- FINAL VALIDATION QUERIES
-- ============================================================================

-- 1. Cost Centers: Should be exactly 277
SELECT 'Cost Centers' as check_name, COUNT(*) as count,
       CASE WHEN COUNT(*) = 277 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM cost_centers;

-- 2. Bodega Items: All have quantity and cost (or marked as draft)
SELECT 'Bodega Valid Items' as check_name, 
       COUNT(*) as count,
       CASE WHEN COUNT(*) >= 4104 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM bodega_inventory
WHERE (quantity > 0 OR status = 'draft');

-- 3. Finanzas has cost_center_id column
SELECT 'Finanzas CC Column' as check_name,
       CASE WHEN EXISTS(
         SELECT 1 FROM information_schema.columns
         WHERE table_name='finanzas_movements' 
         AND column_name='cost_center_id'
       ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status;

-- 4. Work Orders: Summary by CC assignment
SELECT 'Work Orders' as check_name,
       COUNT(*) as total,
       SUM(CASE WHEN cost_center_id IS NOT NULL THEN 1 ELSE 0 END) as with_cc,
       SUM(CASE WHEN cost_center_id IS NULL THEN 1 ELSE 0 END) as without_cc
FROM maintenance_work_orders;
