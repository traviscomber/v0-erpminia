# 🗄️ SUPABASE DATABASE SETUP GUIDE

## Overview

This document describes all the database tables and schema that have been created for the application.

---

## ✅ CREATED TABLES

### Core/Foundation Tables

1. **organizations** - Multi-tenant organization management
   - Columns: id, name, slug, industry, country, timezone, logo_url, status, created_at, updated_at, created_by
   - Purpose: Tenant isolation, holds one organization per row

2. **profiles** - Extended user information
   - Columns: id, organization_id, first_name, last_name, phone, avatar_url, role, status, created_at, updated_at
   - Purpose: User profile data linked to auth.users

3. **user_roles** - Role-based access control (RBAC)
   - Columns: id, user_id, organization_id, role, created_at
   - Purpose: Multi-level role assignments per user per organization

### Reference Data (Maestros) Tables

4. **cost_centers** - Cost center/cost allocation
   - Columns: id, organization_id, code, name, description, manager_id, budget_annual, budget_used, status, created_at, updated_at

5. **departments** - Departmental organization
   - Columns: id, organization_id, name, code, description, manager_id, status, created_at

6. **positions** - Job positions/roles
   - Columns: id, organization_id, name, code, description, department_id, salary_level, status, created_at

7. **personnel** - Employees/staff
   - Columns: id, organization_id, rut, first_name, last_name, email, phone, position_id, department_id, hire_date, status, user_id, created_at, updated_at

### Sustainability/Nonconformance Tables

8. **sostenibilidad_nonconformances** - Non-conformance records
   - Columns: id, organization_id, nc_number, title, description, category, severity, source, discovered_date, reported_by, assigned_to, status, root_cause, impact_description, target_closure_date, actual_closure_date, created_at, updated_at
   - Purpose: Track safety/sustainability violations

9. **sostenibilidad_nc_details** - Attachments & evidence
   - Columns: id, nc_id, detail_type, file_url, description, uploaded_by, uploaded_at
   - Purpose: Store photos, documents, measurements related to NCs

10. **sostenibilidad_corrective_actions** - Corrective Action Plans (CAPA)
    - Columns: id, nc_id, ca_number, action_description, responsible_person, scheduled_completion_date, actual_completion_date, status, verification_method, estimated_cost, actual_cost, created_at, updated_at
    - Purpose: Track remediation actions

11. **sostenibilidad_ca_updates** - Progress tracking
    - Columns: id, ca_id, update_type, status, comments, percentage_complete, updated_by, created_at, attachment_url
    - Purpose: Track CA implementation progress

12. **sostenibilidad_compliance_history** - Compliance reporting
    - Columns: id, organization_id, report_period, total_ncs, open_ncs, closed_ncs, overdue_cas, compliance_score, trend, created_at
    - Purpose: Historical compliance metrics

---

## 🔒 SECURITY FEATURES

### Row Level Security (RLS)

All tables have RLS enabled to ensure multi-tenant data isolation:

- **organizations**: Users can only read their own organization
- **profiles**: Users can read their own profile + organization members
- **cost_centers**: Read if user is in organization
- **departments**: Read if user is in organization
- **positions**: Read if user is in organization
- **personnel**: Read if user is in organization
- **nonconformances**: Read if user is in organization
- **corrective_actions**: Read if NC belongs to user's organization

### RBAC System

User roles determine access level:
- `super_admin` - Full system access
- `admin` - Organization admin
- `manager` - Team lead
- `viewer` - Read-only access
- Custom roles as needed

---

## 📈 PERFORMANCE INDEXES

Created indexes for fast queries:

```
idx_profiles_org
idx_user_roles_user
idx_user_roles_org
idx_cost_centers_org
idx_departments_org
idx_positions_org
idx_personnel_org
idx_personnel_rut
idx_nc_org
idx_nc_status
idx_nc_severity
idx_nc_number
idx_ca_status
idx_ca_date
```

---

## 🚀 SETUP INSTRUCTIONS

### Option 1: Use Supabase Dashboard SQL Editor

1. Go to https://app.supabase.com
2. Select your project
3. Go to SQL Editor
4. Create a new query
5. Copy contents of `db/migrations/000-complete-schema-init.sql`
6. Run the query
7. Repeat for any additional migrations needed

### Option 2: Use psql Command Line

```bash
export POSTGRES_URL="postgresql://user:password@db.projectid.supabase.co:5432/postgres"

# Apply migration
psql $POSTGRES_URL -f db/migrations/000-complete-schema-init.sql
```

### Option 3: Use Node.js Script

```bash
# Ensure env vars are set
export NEXT_PUBLIC_SUPABASE_URL="https://yourproject.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run initialization (requires implementation of exec_sql RPC)
node --env-file /vercel/share/.env.project scripts/init-db.ts
```

---

## 📋 INITIAL DATA SETUP

### Step 1: Create Organization

```sql
INSERT INTO organizations (name, slug, industry, country)
VALUES ('My Company', 'my-company', 'mining', 'CL')
RETURNING id;
```

### Step 2: Create First User

```sql
-- User is created via Supabase Auth
-- Then create profile:
INSERT INTO profiles (id, organization_id, first_name, last_name, role)
VALUES ('user-uuid-here', 'org-uuid-here', 'John', 'Doe', 'admin');

-- And assign role:
INSERT INTO user_roles (user_id, organization_id, role)
VALUES ('user-uuid-here', 'org-uuid-here', 'admin');
```

### Step 3: Create Reference Data

```sql
-- Add departments
INSERT INTO departments (organization_id, name, code)
VALUES ('org-uuid', 'Operations', 'OPS');

-- Add positions
INSERT INTO positions (organization_id, name, code, department_id)
VALUES ('org-uuid', 'Technician', 'TECH', 'dept-uuid');

-- Add personnel
INSERT INTO personnel (organization_id, rut, first_name, last_name, position_id)
VALUES ('org-uuid', '12345678-9', 'Carlos', 'García', 'pos-uuid');
```

---

## 🔗 TABLE RELATIONSHIPS

```
organizations (root)
├── profiles
├── user_roles
├── cost_centers
├── departments
│   ├── positions
│   │   └── personnel
│   └── personnel
├── sostenibilidad_nonconformances
│   ├── sostenibilidad_nc_details
│   └── sostenibilidad_corrective_actions
│       └── sostenibilidad_ca_updates
└── sostenibilidad_compliance_history
```

---

## ✨ FEATURES ENABLED

- ✅ Multi-tenant data isolation
- ✅ Row-level security (RLS)
- ✅ Role-based access control (RBAC)
- ✅ Nonconformance management system
- ✅ Corrective action tracking
- ✅ Personnel management
- ✅ Reference data (departments, positions, cost centers)
- ✅ Compliance history & reporting
- ✅ Audit trail ready (via event_log tables from other migrations)
- ✅ Performance indexes for common queries

---

## 📞 TROUBLESHOOTING

### Tables Already Exist
The migrations use `CREATE TABLE IF NOT EXISTS`, so they won't fail if tables already exist.

### RLS Conflicts
If you get RLS errors, check that:
1. User has proper role in `user_roles` table
2. `organization_id` matches their organization
3. RLS policies are correctly scoped

### Permission Errors
Ensure you're using `SUPABASE_SERVICE_ROLE_KEY` for admin operations, not the anon key.

---

## 🎯 NEXT STEPS

1. Verify all tables exist in Supabase dashboard
2. Create test organization
3. Create test user and assign roles
4. Test login in the application
5. Verify data isolation (try querying other org's data - should fail)
6. Create test nonconformances
7. Begin sustainability module testing

---

## 📚 RELATED FILES

- Migration files: `db/migrations/*.sql`
- Initialization scripts: `scripts/init-supabase-db.sh`, `scripts/init-db.ts`
- Supabase client: `lib/supabase/client.ts`
- Database utilities: `lib/db/init.ts`
