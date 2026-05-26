# 🗺️ DATABASE SCHEMA DIAGRAM

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     ORGANIZATIONS (ROOT)                         │
│         [id, name, slug, industry, country, timezone]           │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    ┌────────────┐   ┌─────────────┐      ┌──────────────┐
    │ PROFILES   │   │  USER_ROLES │      │ COST_CENTERS │
    ├────────────┤   ├─────────────┤      ├──────────────┤
    │ id (FK)    │   │ id          │      │ id           │
    │ org_id(FK) │   │ user_id(FK) │      │ org_id(FK)   │
    │ first_name │   │ org_id(FK)  │      │ code (unique)│
    │ last_name  │   │ role        │      │ name         │
    │ avatar_url │   │ created_at  │      │ manager_id   │
    └────────────┘   └─────────────┘      │ budget_annual│
                                           └──────────────┘
        │
        │ (Multi-level hierarchy)
        │
        ▼
    ┌──────────────────────────────────────────┐
    │           DEPARTMENTS                     │
    │  [id, org_id(FK), name, code, manager]   │
    └──────────────────┬───────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
    ┌──────────────┐         ┌─────────────────┐
    │ POSITIONS    │         │    PERSONNEL    │
    ├──────────────┤         ├─────────────────┤
    │ id           │         │ id              │
    │ org_id(FK)   │◄───────►│ org_id(FK)      │
    │ dept_id(FK)  │         │ dept_id(FK)     │
    │ name         │         │ position_id(FK) │
    │ code (unique)│         │ rut (unique)    │
    │ salary_level │         │ email           │
    └──────────────┘         │ hire_date       │
                             │ user_id(FK)     │
                             └─────────────────┘


                    ┌─────────────────────────────┐
                    │  SUSTAINABILITY SYSTEM      │
                    └─────────────────────────────┘

        ┌───────────────────────────────────────────┐
        │                                           │
        ▼                                           ▼
┌────────────────────────────────────┐    ┌─────────────────────┐
│ SOSTENIBILIDAD_NONCONFORMANCES     │    │ SOSTENIBILIDAD_     │
│                                    │    │ COMPLIANCE_HISTORY  │
│ id                                 │    │                     │
│ organization_id(FK)                │    │ id                  │
│ nc_number (unique)                 │    │ organization_id(FK) │
│ title                              │    │ report_period       │
│ description                        │    │ total_ncs           │
│ category                           │    │ open_ncs            │
│ severity (critical/high/med/low)   │    │ closed_ncs          │
│ source                             │    │ compliance_score    │
│ discovered_date                    │    │ trend               │
│ status (open/in_progress/closed)   │    │ created_at          │
│ reported_by (FK users)             │    │                     │
│ assigned_to (FK users)             │    └─────────────────────┘
│ root_cause                         │
│ impact_description                 │
│ target_closure_date                │
│ actual_closure_date                │
│ created_at, updated_at             │
└────────────────────┬───────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌────────────────────┐   ┌──────────────────────────┐
│ SOSTENIBILIDAD_    │   │ SOSTENIBILIDAD_          │
│ NC_DETAILS         │   │ CORRECTIVE_ACTIONS       │
│                    │   │                          │
│ id                 │   │ id                       │
│ nc_id(FK)          │   │ nc_id(FK)                │
│ detail_type        │   │ ca_number (unique/nc)    │
│ file_url           │   │ action_description       │
│ description        │   │ responsible_person(FK)   │
│ uploaded_by(FK)    │   │ scheduled_completion_date│
│ uploaded_at        │   │ actual_completion_date   │
└────────────────────┘   │ status                   │
                         │ verification_method      │
                         │ estimated_cost           │
                         │ actual_cost              │
                         │ created_at, updated_at   │
                         └───────────┬──────────────┘
                                     │
                                     ▼
                         ┌──────────────────────────┐
                         │ SOSTENIBILIDAD_          │
                         │ CA_UPDATES               │
                         │                          │
                         │ id                       │
                         │ ca_id(FK)                │
                         │ update_type              │
                         │ status                   │
                         │ comments                 │
                         │ percentage_complete      │
                         │ updated_by(FK)           │
                         │ created_at               │
                         │ attachment_url           │
                         └──────────────────────────┘
```

---

## Table Relationships

### One-to-Many
- `organizations` → `profiles` (1:M)
- `organizations` → `user_roles` (1:M)
- `organizations` → `cost_centers` (1:M)
- `organizations` → `departments` (1:M)
- `organizations` → `positions` (1:M)
- `organizations` → `personnel` (1:M)
- `organizations` → `sostenibilidad_nonconformances` (1:M)
- `organizations` → `sostenibilidad_compliance_history` (1:M)
- `departments` → `positions` (1:M)
- `departments` → `personnel` (1:M)
- `positions` → `personnel` (1:M)
- `sostenibilidad_nonconformances` → `sostenibilidad_nc_details` (1:M)
- `sostenibilidad_nonconformances` → `sostenibilidad_corrective_actions` (1:M)
- `sostenibilidad_corrective_actions` → `sostenibilidad_ca_updates` (1:M)

### Many-to-One (Lookups)
- `profiles.id` → `auth.users.id` (cascade on delete)
- `user_roles.user_id` → `auth.users.id` (cascade on delete)
- `personnel.user_id` → `auth.users.id` (set null on delete)
- `sostenibilidad_nonconformances.reported_by` → `auth.users.id`
- `sostenibilidad_nonconformances.assigned_to` → `auth.users.id`
- `sostenibilidad_corrective_actions.responsible_person` → `auth.users.id`
- `sostenibilidad_ca_updates.updated_by` → `auth.users.id`

---

## Data Flow

### Sustainability Module Flow

```
New Safety Issue Found
        ↓
Create Nonconformance (NC)
├─ Set severity, category
├─ Assign to person
├─ Set target closure date
        ↓
Attach Evidence (NC_DETAILS)
├─ Upload photos
├─ Attach reports
├─ Document measurements
        ↓
Analyze Root Cause
├─ Store root_cause analysis
├─ Document impact
        ↓
Create Corrective Actions (CA)
├─ Create action plan
├─ Set completion date
├─ Assign responsible person
        ↓
Track Progress (CA_UPDATES)
├─ Update status
├─ Track completion %
├─ Attach completion evidence
        ↓
Verify Completion
├─ Mark CA as verified
├─ Close nonconformance
        ↓
Report Compliance
└─ Generate compliance history
  ├─ Total NCs
  ├─ Open NCs
  ├─ Closed NCs
  ├─ Overdue CAs
  └─ Compliance Score
```

---

## Access Control Flow (RLS)

```
User Authenticates
        ↓
Supabase Auth creates JWT with user.id
        ↓
User queries table (e.g., SELECT * FROM personnel)
        ↓
RLS Policy Triggers:
├─ Check if user has role in organization
│  └─ SELECT * FROM user_roles 
│     WHERE user_id = auth.uid() 
│     AND organization_id = table.organization_id
        ↓
Policy Passes or Fails
├─ If Pass: Return data
└─ If Fail: Return empty set (no error, secure)
```

---

## Key Design Patterns

### Multi-Tenant Isolation
```sql
-- Every table has organization_id (except user_roles which has explicit org)
-- RLS enforces: user can only query if they have role in that org
SELECT * FROM personnel 
WHERE organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
```

### Unique Constraints
```sql
-- Ensure unique identifiers within org, not globally
UNIQUE(organization_id, code)    -- cost centers, depts, positions, nc_number
UNIQUE(user_id, organization_id, role)  -- user_roles
```

### Cascading Deletes
```sql
-- Delete organization → all data deleted
-- Delete NC → all CA, NC_DETAILS deleted
-- Delete CA → all CA_UPDATES deleted
```

### Soft Deletes Ready
```sql
-- Tables have 'status' field (active, inactive)
-- Can implement soft delete without schema change
-- Suggested: Add is_deleted BOOLEAN, update RLS policies
```

---

## Performance Tuning

### Current Indexes
- Organization lookups: ~O(1)
- Status filters: O(log n)
- User role checks: O(log n)
- Date range queries: O(log n)

### Suggested Future Indexes
```sql
-- Conditional indexes for common filters
CREATE INDEX idx_ncs_open ON sostenibilidad_nonconformances(organization_id, discovered_date) 
WHERE status != 'closed';

-- Partial indexes for performance
CREATE INDEX idx_ca_in_progress ON sostenibilidad_corrective_actions(status)
WHERE status IN ('planned', 'in_progress');

-- Foreign key indexes (usually auto-created)
-- But explicit creation helps query planner
```

---

## Scalability Notes

### Current Design Supports
- ✅ Multi-tenant (infinite orgs)
- ✅ Large personnel databases (1M+ records per org)
- ✅ Historical compliance tracking (years of data)
- ✅ Distributed access control (1000+ users per org)

### Future Enhancements
- Partitioning by organization_id for very large tables
- Archive tables for historical data
- Read replicas for reporting
- Caching layer for reference data (maestros)
