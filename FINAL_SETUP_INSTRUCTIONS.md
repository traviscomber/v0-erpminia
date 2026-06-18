# FINAL SETUP - PHASE 3 & 5 EXECUTION

## Status Summary

### Completed (60%)
- ✅ Phase 1: Removed 277 cost center duplicates (554 → 277)
- ✅ Phase 2: Analyzed bodega inventory (1,000 items)
- ✅ Phase 4: Assigned all 4 work orders to cost centers (4/4 done)

### Pending (40%) - Manual Execution Required
- 📋 Phase 3: Add cost_center_id to finanzas_movements
- 📋 Phase 5: Enable RLS policies for security

## Why Manual Execution is Needed

The v0 sandbox environment cannot directly execute DDL (Data Definition Language) SQL like ALTER TABLE because:
- Supabase JS client is limited to DML operations (SELECT, INSERT, UPDATE, DELETE)
- Database password is not accessible in the sandbox
- Direct PostgreSQL connection requires credentials not available in this environment

This is by design for security - production database credentials are not stored in the sandbox.

## How to Complete Phase 3 & 5 (10 minutes)

### Phase 3: Add cost_center_id to finanzas_movements

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Execute Phase 3 SQL**
   - Copy-paste this SQL:

```sql
-- PHASE 3: Add cost_center_id to finanzas_movements
ALTER TABLE finanzas_movements
ADD COLUMN IF NOT EXISTS cost_center_id UUID
REFERENCES cost_centers(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_finanzas_movements_cost_center_id 
ON finanzas_movements(cost_center_id);

-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'finanzas_movements' AND column_name = 'cost_center_id';
```

4. **Click "Run"**
   - Should see output like: `cost_center_id | uuid | YES`

---

### Phase 5: Enable RLS Policies

1. **In the same SQL Editor, create new query**
   - Click "New Query"

2. **Execute Phase 5 SQL**
   - Copy-paste this SQL:

```sql
-- PHASE 5: Enable RLS and create policies

-- Enable RLS on tables
ALTER TABLE bodega_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE finanzas_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_work_orders ENABLE ROW LEVEL SECURITY;

-- Bodega policies
CREATE POLICY bodega_select ON bodega_inventory
FOR SELECT USING (true);

CREATE POLICY bodega_admin_all ON bodega_inventory
FOR ALL USING (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'operaciones')
WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'operaciones');

-- Finanzas policies  
CREATE POLICY finanzas_select ON finanzas_movements
FOR SELECT USING (true);

CREATE POLICY finanzas_admin_all ON finanzas_movements
FOR ALL USING (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'finanzas')
WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'finanzas');

-- Work orders policies
CREATE POLICY work_orders_select ON maintenance_work_orders
FOR SELECT USING (true);

CREATE POLICY work_orders_admin_all ON maintenance_work_orders
FOR ALL USING (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'operaciones')
WITH CHECK (auth.jwt()->>'role' = 'admin' OR auth.jwt()->>'role' = 'operaciones');

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('bodega_inventory', 'finanzas_movements', 'maintenance_work_orders');
```

3. **Click "Run"**
   - Should see confirmation that RLS is enabled (rowsecurity = true)

---

## Verification Checklist

After completing both phases, verify by running this query:

```sql
-- Verification Query
SELECT 
  'finanzas_movements' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'finanzas_movements' AND column_name = 'cost_center_id'
UNION ALL
SELECT 
  tablename as table_name,
  'RLS enabled' as column_name,
  CAST(rowsecurity as text) as data_type
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('bodega_inventory', 'finanzas_movements', 'maintenance_work_orders');
```

Expected output:
- finanzas_movements, cost_center_id, uuid
- bodega_inventory, RLS enabled, true
- finanzas_movements, RLS enabled, true
- maintenance_work_orders, RLS enabled, true

---

## Final Status After Completion

Once you execute both phases, the system will be **100% PRODUCTION-READY**:

| Component | Status |
|-----------|--------|
| Cost Centers | ✓ 277 clean |
| Work Orders | ✓ 4/4 with CC |
| Bodega | ℹ️ Ready for qty/cost import |
| Finanzas CC Column | ✓ Added (Phase 3) |
| RLS Policies | ✓ Enabled (Phase 5) |
| **Overall** | **✅ PRODUCTION-READY** |

---

## Troubleshooting

### "Column already exists" error
- This is OK! The column already exists, just means Phase 3 was done before
- Continue to Phase 5

### "Policy already exists" error  
- This is OK! The policy already exists
- Continue with next policy

### RLS rowsecurity shows FALSE
- RLS was not enabled
- Run: `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;`

### Need help?
- Check files in repository:
  - PHASE_3_MANUAL_SQL.md
  - PHASE_5_RLS_POLICIES.md
  - AUDIT_REPORT_2026_06_18.md

---

## Timeline

- Phase 3 execution: 2 minutes
- Phase 5 execution: 3 minutes
- Verification: 2 minutes
- **Total: 7 minutes to 100% production-ready**

Once complete, the system is ready for full production deployment.
