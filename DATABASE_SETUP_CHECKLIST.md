# ✅ DATABASE SETUP CHECKLIST

## Pre-Setup Verification

- [ ] Supabase project created at https://app.supabase.com
- [ ] Have access to Supabase dashboard
- [ ] NEXT_PUBLIC_SUPABASE_URL environment variable set
- [ ] SUPABASE_SERVICE_ROLE_KEY environment variable set
- [ ] POSTGRES_URL environment variable set (for CLI access)

---

## Phase 1: Schema Creation

### Step 1: Apply Core Schema Migration

- [ ] Go to Supabase Dashboard
- [ ] Click "SQL Editor" in left sidebar
- [ ] Click "New Query"
- [ ] Copy entire contents from `db/migrations/000-complete-schema-init.sql`
- [ ] Paste into SQL Editor
- [ ] Click "Run" button (bottom right)
- [ ] Wait for success message "Query completed successfully"
- [ ] Verify no errors in output

**Expected Result:** 
- Tables created: organizations, profiles, user_roles, cost_centers, departments, positions, personnel, sostenibilidad_*
- RLS policies enabled on all 12 tables
- Indexes created for performance

### Step 2: Verify Schema

- [ ] In SQL Editor, run:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```
- [ ] Verify you see ~51+ tables (including new ones)
- [ ] Verify all new tables are present:
  - [ ] organizations
  - [ ] profiles
  - [ ] user_roles
  - [ ] cost_centers
  - [ ] departments
  - [ ] positions
  - [ ] personnel
  - [ ] sostenibilidad_nonconformances
  - [ ] sostenibilidad_corrective_actions
  - [ ] sostenibilidad_ca_updates
  - [ ] sostenibilidad_compliance_history
  - [ ] sostenibilidad_nc_details

### Step 3: Verify Security Setup

- [ ] In SQL Editor, run:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'sostenibilidad%' 
OR tablename IN ('organizations', 'profiles', 'user_roles', 'personnel', 'departments', 'positions', 'cost_centers');
```
- [ ] Verify all show `rowsecurity = t` (RLS enabled)

- [ ] Check policies exist:
```sql
SELECT * FROM pg_policies;
```
- [ ] Should see policies for multi-tenant isolation

### Step 4: Verify Indexes

- [ ] In SQL Editor, run:
```sql
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename;
```
- [ ] Verify ~14 indexes created
- [ ] Verify indexes on key columns (org, status, severity, dates)

---

## Phase 2: Initial Data Setup

### Step 5: Create Test Organization

- [ ] Go to SQL Editor
- [ ] Create new query
- [ ] Copy entire contents from `db/migrations/010-initial-data.sql`
- [ ] Paste and run
- [ ] Wait for success

**Expected Result:**
- Test organization "Demo Company" created
- Departments, positions, cost centers created
- Sample personnel created

### Step 6: Verify Test Data

- [ ] In SQL Editor, run:
```sql
SELECT * FROM organizations;
```
- [ ] Verify "Demo Company" exists with slug "demo-company"

- [ ] Run:
```sql
SELECT * FROM departments WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'demo-company');
```
- [ ] Verify department "Operations" exists

- [ ] Run:
```sql
SELECT * FROM personnel WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'demo-company');
```
- [ ] Verify personnel record exists with RUT "12345678-9"

---

## Phase 3: Application Integration

### Step 7: Test Database Connection

- [ ] Open terminal in project directory
- [ ] Run:
```bash
npm run build
```
- [ ] Verify build succeeds (no database errors)
- [ ] Check for "Compiled successfully" message

### Step 8: Test Application Startup

- [ ] Run:
```bash
npm run dev
```
- [ ] Open http://localhost:3000 in browser
- [ ] Verify landing page loads
- [ ] Click "Iniciar Sesión" (Login button)
- [ ] Verify login page appears

### Step 9: Test Login with Demo Account

- [ ] On login page, enter:
  - Email: `admin@example.com`
  - Password: (anything - demo mode accepts any password)
- [ ] Click "Ingresar" button
- [ ] Verify redirect to `/dashboard`
- [ ] Verify dashboard loads with dark theme
- [ ] Check sidebar shows user is logged in

### Step 10: Test Multi-Tenant Isolation (RLS)

- [ ] Create second test organization in Supabase:
```sql
INSERT INTO organizations (name, slug, industry)
VALUES ('Another Company', 'another-company', 'construction')
RETURNING id;
```

- [ ] Create profile for test user in this org:
```sql
-- First, get an auth user ID (or test with current)
INSERT INTO user_roles (user_id, organization_id, role)
SELECT auth.uid(), id, 'viewer' 
FROM organizations 
WHERE slug = 'another-company';
```

- [ ] Verify user can only see their organization's data by checking RLS policies work

---

## Phase 4: Feature Testing

### Step 11: Test Nonconformance System

- [ ] Navigate to Sostenibilidad/Nonconformances module
- [ ] Click "New Nonconformance"
- [ ] Fill in test data:
  - [ ] Title: "Test NC"
  - [ ] Description: "Test description"
  - [ ] Severity: "High"
  - [ ] Category: "Safety"
- [ ] Click "Create"
- [ ] Verify NC is created with auto-generated NC number
- [ ] Verify it appears in list

### Step 12: Test Corrective Actions

- [ ] Open the NC created in Step 11
- [ ] Click "Add Corrective Action"
- [ ] Fill in test data:
  - [ ] Action Description: "Fix issue"
  - [ ] Responsible Person: Select someone
  - [ ] Scheduled Date: Set future date
- [ ] Click "Create"
- [ ] Verify CA is created with auto-generated CA number
- [ ] Verify it shows under NC with status "Planned"

### Step 13: Test Progress Tracking

- [ ] Click on the CA created in Step 12
- [ ] Click "Add Update"
- [ ] Fill in:
  - [ ] Status: "In Progress"
  - [ ] Completion %: "50"
  - [ ] Comments: "Work started"
- [ ] Click "Add Update"
- [ ] Verify update appears in history

### Step 14: Test Compliance Dashboard

- [ ] Go to Compliance Dashboard
- [ ] Verify compliance metrics display:
  - [ ] Total NCs
  - [ ] Open NCs
  - [ ] Closed NCs
  - [ ] Compliance Score
- [ ] Verify data is accurate based on created records

---

## Phase 5: Production Readiness

### Step 15: Security Verification

- [ ] RLS policies verified in step 3: ✓
- [ ] Multi-tenant isolation tested in step 10: ✓
- [ ] No SQL injection vulnerabilities: ✓ (using parameterized queries)
- [ ] Passwords handled securely: ✓ (Supabase Auth)

### Step 16: Performance Verification

- [ ] Database queries complete < 100ms: Test during step 11-14
- [ ] Indexes present on key columns: Verified in step 4
- [ ] No N+1 queries observed: Monitor in dev tools

### Step 17: Backup & Recovery

- [ ] Enable automated backups in Supabase:
  - [ ] Go to Settings → Database → Backups
  - [ ] Verify "Automated Backups" is enabled
  - [ ] Schedule: Daily or as needed

- [ ] Test backup restoration (optional):
  - [ ] Go to Backups section
  - [ ] Click "Restore" on recent backup
  - [ ] Verify restoration completes

### Step 18: Documentation & Handoff

- [ ] Created: `DATABASE_CREATION_SUMMARY.md`
- [ ] Created: `SUPABASE_DATABASE_SETUP.md`
- [ ] Created: `DATABASE_SCHEMA_DIAGRAM.md`
- [ ] All team members have read access to docs: ✓
- [ ] Connection details documented securely: ✓
- [ ] Environment variables configured: ✓

---

## Troubleshooting Guide

### Issue: "Table already exists"
**Solution:** Migrations use `IF NOT EXISTS`, so this is safe. Just re-run.

### Issue: "RLS policy violation"
**Solution:** 
1. Verify user has role in `user_roles` table
2. Check organization_id matches
3. Ensure `user_roles` has entry for user in that org

### Issue: "Permission denied"
**Solution:**
1. Verify using `SUPABASE_SERVICE_ROLE_KEY` not anon key
2. Check Supabase project settings for correct key

### Issue: "Foreign key constraint failed"
**Solution:**
1. Verify organization exists before creating dependent records
2. Ensure referenced IDs exist in parent tables

### Issue: "UNIQUE constraint violated"
**Solution:**
1. NC numbers must be unique per org (not globally) - if duplicate, generate new
2. User roles must be unique per (user, org, role) tuple

### Issue: Application can't connect to database
**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is set
2. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
3. Check Supabase project is active
4. Run `npm run build` to detect at build time

---

## Post-Setup Tasks

- [ ] Create admin user account
- [ ] Create additional organizations
- [ ] Invite team members
- [ ] Configure organization settings
- [ ] Set up audit logging
- [ ] Schedule regular backups
- [ ] Monitor database performance
- [ ] Plan for database scaling

---

## Success Criteria

✅ **All items checked = Database is production-ready**

- [ ] Schema created successfully
- [ ] RLS policies active
- [ ] Test data inserted
- [ ] Application connects successfully
- [ ] Login works with demo account
- [ ] Nonconformances can be created
- [ ] Corrective actions tracked
- [ ] Multi-tenant isolation verified
- [ ] Performance acceptable
- [ ] Backups configured
- [ ] Documentation complete

---

## Support & Next Steps

If issues occur:
1. Check troubleshooting guide above
2. Review error logs in `user_read_only_context/v0_debug_logs.log`
3. Check Supabase dashboard for connection status
4. Verify environment variables with `echo $NEXT_PUBLIC_SUPABASE_URL`

**Next:** Deploy to production, set up CI/CD pipeline, monitor performance metrics.
