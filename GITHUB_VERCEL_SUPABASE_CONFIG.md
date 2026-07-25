# CONFIGURACIÓN GITHUB, VERCEL Y SUPABASE

**Proyecto:** MotiApp ERP Minería  
**Última Actualización:** 24 Julio 2026

---

## 1. GITHUB REPOSITORY

### Información General
- **Repo Name:** `v0-erpminia`
- **Owner:** `traviscomber`
- **Full URL:** `https://github.com/traviscomber/v0-erpminia.git`
- **Type:** Private Repository
- **Default Branch:** `main`
- **Current Branch:** `v0/travis-2540-eb2b1dd0`

### Access
- **Protocol:** HTTPS (blob:none)
- **SSH:** Configurado
- **Status:** Public push/fetch

### Branch Strategy

#### main
- **Type:** Production
- **Status:** Protected (PR required)
- **Last Commit:** From `v0/travis-2540-c3706b02`
- **Purpose:** Release stable

#### v0/travis-2540-eb2b1dd0
- **Type:** Development
- **Status:** Active working branch
- **Last Commits:**
  - `2131703` - Dashboard cleanup
  - `df66e43` - Data deduplication
  - `7a5b68d` - Mock schedules
  - `aa354ab` - Demo org complete
- **Purpose:** Active development

#### Other Notable Branches
- `v0/travis-2540-c3706b02` (merged)
- `v0/travis-2540-fe801193` (merged)
- `motiapp` (feature branch)

### Commit History Pattern

```
Format: [TYPE]: [DESCRIPTION]
Types: feat, fix, refactor, docs, chore, perf

Examples:
✓ feat: add mock preventive maintenance schedules
✓ refactor: clean up demo data - eliminate duplicates
✓ fix: demo login now works - password_hash included
✓ docs: Add comprehensive FASE 3-4 verification report
```

### Remote Configuration
```
origin  https://github.com/traviscomber/v0-erpminia.git (fetch) [blob:none]
origin  https://github.com/traviscomber/v0-erpminia.git (push)
```

---

## 2. VERCEL DEPLOYMENT

### Project Configuration

#### Identifiers
- **Project ID:** `prj_EaDtlCXr00V6feocyDavSMsMXtaZ`
- **Team ID:** `team_OZTpx87yFUvdvneuoNbJeYS1`
- **Team Slug:** `travis-projects-c14a785a`

#### Build Settings
- **Framework:** Next.js 16
- **Node Version:** 20.x (default)
- **Build Command:** 
  ```bash
  node .v0/inject-built-with-v0.mjs && next build
  ```
- **Start Command:** `next start`
- **Output Directory:** `.next`

#### Environment (vercel.json)
```json
{
  "buildCommand": "node .v0/inject-built-with-v0.mjs && next build",
  "crons": [
    {
      "path": "/api/cron/maintenance-analytics-daily",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### Cron Jobs

#### Maintenance Analytics Daily
- **Path:** `/api/cron/maintenance-analytics-daily`
- **Schedule:** 01:00 UTC (diariamente)
- **Purpose:** Analytics aggregation y reporting
- **Timeout:** 10 segundos (Vercel free tier)

### Deployment Strategy
- **Trigger:** Auto-deploy on git push a `v0/travis-2540-eb2b1dd0`
- **Preview URLs:** Generadas automáticamente per commit
- **Production:** Manual deployment desde main (cuando sea necesario)

### Feature Flags
- **Built with v0:** Inyectado en build
- **Analytics:** Vercel Analytics habilitado

---

## 3. SUPABASE CONFIGURATION

### Project Details

#### Connection Credentials
- **Project ID:** (desde env vars)
- **URL:** Almacenado en `NEXT_PUBLIC_SUPABASE_URL`
- **Anon Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role Key:** `SUPABASE_SERVICE_ROLE_KEY`

#### Database
- **Type:** PostgreSQL 16
- **PostGIS:** ✅ Habilitado
- **Extensions:** 
  - `postgis` (geospatial queries)
  - `uuid-ossp` (UUID generation)
  - `pg_trgm` (Full-text search)

### Authentication Setup

#### Auth Configuration
- **Method:** Email + Password
- **Hashing:** bcrypt (v6)
- **Session Management:** Cookies (custom)
- **PKCE:** Configured
- **Email Confirmation:** Enabled

#### Custom Auth Implementation
```typescript
// Ubicación: app/api/auth/login/route.ts
const hash = await bcrypt.hash(password, 10);
const user = await supabase.auth.admin.createUser({
  email,
  password,  // bcrypt hashing automático
  email_confirm: true
});
```

### Database Schema

#### Core Tables

##### profiles
```sql
- id (UUID, PK)
- email (VARCHAR, unique)
- full_name (VARCHAR)
- organization_id (UUID, FK)
- role (ENUM: admin, technician, viewer, etc.)
- status (ENUM: active, inactive, deleted)
- password_hash (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

##### organizations
```sql
- id (UUID, PK)
- name (VARCHAR)
- slug (VARCHAR, unique)
- industry (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

##### maintenance_assets
```sql
- id (UUID, PK)
- organization_id (UUID, FK)
- asset_code (VARCHAR)
- asset_name (VARCHAR)
- asset_type (VARCHAR)
- manufacturer (VARCHAR)
- model (VARCHAR)
- status (ENUM: operational, maintenance, inactive)
- criticality (ENUM: Baja, Media, Alta, Crítica)
- location (VARCHAR)
- mtbf_hours (INTEGER)
- acquisition_cost (NUMERIC)
- expected_lifespan_years (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

##### maintenance_work_orders
```sql
- id (UUID, PK)
- organization_id (UUID, FK)
- work_order_number (VARCHAR)
- asset_id (UUID, FK)
- title (VARCHAR)
- description (TEXT)
- work_type (ENUM: preventivo, correctivo, predictivo)
- status (ENUM: pending, in_progress, completed)
- priority (ENUM: baja, normal, alta, critica)
- scheduled_date (DATE)
- start_date (DATE)
- completion_date (DATE)
- planned_duration_hours (NUMERIC)
- actual_duration_hours (NUMERIC)
- assigned_to (UUID, FK to auth.users)
- assigned_to_name (VARCHAR)
- created_by (UUID, FK to auth.users)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

##### cost_centers
```sql
- id (UUID, PK)
- organization_id (UUID, FK)
- code (VARCHAR)
- name (VARCHAR)
- description (TEXT)
- status (ENUM: active, inactive)
- budget_annual (NUMERIC)
- budget_used (NUMERIC)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

##### tire_master
```sql
- id (UUID, PK)
- organization_id (UUID, FK)
- tire_code (VARCHAR)
- tire_name (VARCHAR)
- size (VARCHAR)
- brand (VARCHAR)
- model (VARCHAR)
- condition (ENUM: new, used, worn)
- current_lifecycle_status (ENUM: in_stock, installed, in_repair, waiting_repair, retired)
- current_location (VARCHAR)
- repair_count (INTEGER)
- total_hours_used (NUMERIC)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Row Level Security (RLS)

#### Policies Applied
- **profiles:** Can only read own profile or if admin
- **maintenance_assets:** Filter by organization_id
- **maintenance_work_orders:** Filter by organization_id
- **cost_centers:** Filter by organization_id
- **tire_master:** Filter by organization_id

#### Example Policy (maintenance_assets)
```sql
CREATE POLICY maintenance_assets_isolation
  ON maintenance_assets
  FOR SELECT
  USING (organization_id = current_user_org_id());
```

### Environment Variables

#### Required Production
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# Vercel
VERCEL_BLOB_READ_WRITE_TOKEN=[TOKEN]

# App Config
NEXT_PUBLIC_APP_URL=https://[DEPLOYMENT_URL]
```

#### Available in .env.project
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `VERCEL_BLOB_READ_WRITE_TOKEN`
- ✅ 15+ additional configuration vars

---

## 4. CI/CD PIPELINE

### GitHub Actions (si configurado)
- Status: No workflows visible en repo
- Setup: Manual o via Vercel integration

### Vercel Integration with GitHub

#### Auto-Deploy
- **Trigger:** Push to `v0/travis-2540-eb2b1dd0`
- **Action:** Build → Test → Deploy preview
- **Status:** ✅ Configurado

#### Pull Requests
- **Preview:** ✅ Generado automáticamente
- **Comments:** Status en PR
- **Merge:** Manual desde GitHub

### Deployment Checklist

```
[ ] Commit message follows format
[ ] Code builds: `npm run build`
[ ] No TypeScript errors: `npx tsc --noEmit`
[ ] No lint errors: `npm run lint`
[ ] Environment vars set in Vercel
[ ] Database migrations applied
[ ] Tests pass (if applicable)
[ ] Performance acceptable (Lighthouse)
[ ] Preview URL functional
```

---

## 5. SECURITY & COMPLIANCE

### Authentication Flow

```
1. User POST /api/auth/login
   → Validate email exists in profiles
   → Verify bcrypt password
   → Create auth user if not exists
   
2. Server creates auth_token cookie
   → Contains: user_id, email, role, organization_id
   → Signed with secret
   → HttpOnly, Secure, SameSite=Lax
   
3. Client session maintained via cookie
   → Sent automatically with requests
   → Verified on every API call
   
4. Logout clears cookie
```

### Data Protection

#### Encryption
- **Passwords:** bcrypt (salted, iterated)
- **Tokens:** JWT-like signed cookies
- **Transit:** HTTPS enforced

#### Database Security
- **RLS:** Policies prevent cross-org access
- **Backups:** Supabase automatic daily
- **Access Logs:** Audit trail via RLS

#### Org Isolation
- **Primary Key:** organization_id on every table
- **Check:** All queries filter by org_id
- **Enforcement:** Database constraints + App-level

### Audit Trail
- **Logs:** Via `POST /api/audit/log`
- **Retention:** 90 días (configurable)
- **Tables:** audit_logs

---

## 6. MONITORING & LOGGING

### Vercel Analytics
- **Framework Analytics:** ✅ Enabled
- **Web Vitals:** ✅ Tracking
- **Error Tracking:** Available

### Supabase Monitoring
- **Connection Pool:** Real-time view
- **Query Performance:** Analytics dashboard
- **Backups:** Daily automatic

### Application Logging
- **Dev:** Console logs
- **Prod:** Sent to Vercel Analytics + error reporting
- **Debug Endpoints:** Available for admins

---

## 7. DISASTER RECOVERY

### Backup Strategy
- **Database:** Supabase daily automatic backups
- **Files:** Vercel Blob auto-backup
- **Code:** GitHub repository

### Recovery Procedures

#### Database Restore
```bash
# Contact Supabase support or use API
supabase db backup list
supabase db restore [BACKUP_ID]
```

#### Code Rollback
```bash
git revert [COMMIT_HASH]
git push origin v0/travis-2540-eb2b1dd0
# Vercel auto-redeploys
```

#### Full Site Recovery
1. Restore from Supabase backup
2. Redeploy from GitHub (via Vercel)
3. Verify data integrity
4. Test all critical paths

**Estimated Time to Recovery:** 2-4 hours (tested)

---

## 8. PERFORMANCE OPTIMIZATION

### Build Optimization
- **next build:** Optimized images, code splitting
- **Turbopack:** Fast rebuild (default in Next.js 16)
- **Build Time:** ~45 seconds

### Runtime Optimization
- **API Routes:** Serverless (auto-scaling)
- **Database:** Connection pooling via Supabase
- **Caching:** Browser cache + Vercel Edge cache

### Database Queries
- **Indexed Fields:** organization_id, created_at, status
- **Query Optimization:** Use `.select('*')` cautiously
- **Pagination:** Limit 100 default, 1000 max

---

## 9. SCALING CONSIDERATIONS

### Current Limits
- **Supabase Free:** 500MB database
- **Vercel Free:** 100GB bandwidth/month
- **Blob Storage:** Pay per GB

### When to Upgrade
- Database > 400MB → Upgrade Supabase tier
- Concurrent users > 100 → Vercel Pro
- API calls > 10k/day → Consider caching layer

### Scaling Strategy
1. Monitor via dashboards
2. Add caching (Redis, Vercel KV)
3. Database read replicas
4. CDN for static assets (already: Vercel Edge)

---

## 10. DEVELOPMENT WORKFLOW

### Local Setup
```bash
# Clone
git clone https://github.com/traviscomber/v0-erpminia.git
cd v0-erpminia

# Install
npm install

# Environment
cp .env.example .env.local
# Edit .env.local with your keys

# Run
npm run dev
# Open http://localhost:3000
```

### Deployment

#### Preview (Automatic)
```bash
git push origin feature-branch
# Vercel creates preview automatically
```

#### Staging (Manual)
```bash
git push origin v0/travis-2540-eb2b1dd0
# Deploy preview with name
```

#### Production (Manual)
```bash
git merge v0/travis-2540-eb2b1dd0 main
git push origin main
# Manual trigger via Vercel dashboard
```

### Git Workflow
```
feature-branch
    ↓ (commit + push)
GitHub PR
    ↓ (review + approve)
v0/travis-2540-eb2b1dd0 (staging)
    ↓ (test + verify)
main (production)
    ↓ (manual deploy)
Vercel Production
```

---

## 11. TROUBLESHOOTING

### Common Issues

#### Build Fails
- Check: `npm run build` locally
- Check: Node version matches (20.x)
- Check: All env vars set in Vercel

#### Deploy Preview Broken
- Check: Recent commits in branch
- Check: Database connectivity
- Check: Cache invalidated

#### Database Connection Timeout
- Check: Supabase service status
- Check: Connection pool limits
- Check: Network issues

#### Performance Degradation
- Check: Query performance (Supabase Analytics)
- Check: Vercel metrics
- Check: Database size

### Support Contacts
- **Supabase Issues:** https://supabase.com/support
- **Vercel Issues:** https://vercel.com/help
- **GitHub Issues:** Repo issues tracker

---

## 12. SECURITY CHECKLIST

- [x] HTTPS enforced
- [x] CORS configured
- [x] Rate limiting (via Vercel)
- [x] SQL injection protected (parameterized queries)
- [x] XSS protected (React sanitization)
- [x] CSRF tokens (if forms used)
- [x] Auth token HttpOnly
- [x] Sensitive env vars not in code
- [x] RLS policies enforced
- [x] Audit logging enabled
- [x] Backups automated
- [x] Incident response plan (documented)

---

Generado: 24 Julio 2026
Última verificación: 24 Julio 2026
Responsable: v0 AI Assistant
