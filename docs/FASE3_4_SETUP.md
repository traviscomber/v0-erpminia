# FASE 3-4 Database Setup Instructions

## Overview

FASE 3 and FASE 4 require new database tables for tire tracking and analytics. These tables are NOT automatically created by the Next.js app - they must be manually created in Supabase.

## Tables to Create

### FASE 3: Tire Tracking (4 tables)
- `tire_master` - Tire inventory
- `tire_events` - Event timeline
- `tire_photos` - Photo evidence
- `tire_work_order_actions` - Play/Pause/Terminate actions

### FASE 4: Analytics (4 tables)
- `maintenance_analytics_daily` - Daily metrics aggregation
- `equipment_fault_analytics` - Equipment risk scoring
- `technician_performance_analytics` - Technician efficiency
- `tire_lifecycle_analytics` - Tire lifecycle metrics

## Setup Steps

### Step 1: Copy the SQL

The SQL for FASE 3 and FASE 4 tables is in:
- `migrations/20260724_tire_tracking_schema.sql` (FASE 3)
- `migrations/20260724_maintenance_analytics_schema.sql` (FASE 4)

### Step 2: Execute in Supabase SQL Editor

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to SQL Editor (left sidebar)
3. Click "New query"
4. Paste the SQL from the migration files
5. Click "Run"

### Step 3: Verify Tables

After running the SQL, verify tables were created:

```bash
node --env-file-if-exists=/vercel/share/.env.project -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const tables = ['tire_master', 'tire_events', 'tire_photos', 'equipment_fault_analytics'];
  for (const table of tables) {
    const { error } = await sb.from(table).select('*').limit(1);
    console.log(table, ':', error?.code === 'PGRST116' ? '❌ NOT FOUND' : '✅ EXISTS');
  }
})();
"
```

## Testing the Dashboards

### After tables are created, you can test with sample data:

1. **Register a test tire:**
   ```bash
   curl -X POST http://localhost:3000/api/maintenance/tires/register \
     -H "Content-Type: application/json" \
     -b "auth_token=your-token" \
     -d '{
       "tire_code": "TEST-001",
       "tire_name": "Goodyear 11R24.5",
       "brand": "Goodyear",
       "size": "11R24.5",
       "supplier": "Goodyear",
       "purchase_price": 150.00
     }'
   ```

2. **Report a damage:**
   - Go to `/dashboard/mantenimiento/neumaticos/reportar-daño`
   - Fill the form and submit

3. **View analytics:**
   - Go to `/dashboard/mantenimiento/reportes/general` (live data)
   - Go to `/dashboard/mantenimiento/reportes/equipos-criticos`
   - Go to `/dashboard/mantenimiento/reportes/tecnicos`
   - Go to `/dashboard/mantenimiento/reportes/neumaticos`

## Troubleshooting

### Tables still not showing in dashboard

1. Verify tables exist: Run the verification command above
2. Check RLS policies: In Supabase, go to Authentication → Policies → verify tire_* tables have policies
3. Clear browser cache and reload
4. Check browser console for API errors (F12 → Console)

### API returns "Failed to fetch tire data"

1. Verify organization_id matches your user's organization
2. Check that at least one tire has been registered in `tire_master`
3. Check API response in browser Network tab (F12 → Network)

## Data Flow

```
Warehouse → Register Tire (API)
  ↓
Faena → Report Damage (Dashboard Form)
  ↓
Create Work Order (Auto)
  ↓
Play/Pause/Terminate Timer (Dashboard)
  ↓
Events logged in tire_events + tire_photos
  ↓
Analytics calculated in real-time (API)
  ↓
Dashboards show live metrics
```

## Notes

- All data is **100% real** - no mock data
- APIs calculate metrics on-the-fly (no pre-aggregation needed unless dataset is huge)
- RLS policies use organization_id isolation (same as existing tables)
- FASE 4 dashboards work perfectly as long as FASE 3 tables exist (even if empty)
