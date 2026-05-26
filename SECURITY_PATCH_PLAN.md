# Security Patch Plan - P0/P1/P2

## Executive Summary
**7 findings identified (2 Critical, 2 High, 2 Medium, 1 Low)**

Critical issues expose APIs to unauthenticated access, bypass RLS with service-role key, and allow unverified webhooks.

---

## P0 - CRITICAL (Fix Immediately)

### P0.1: Unauthenticated API Access
**Status:** ❌ All admin/sostenibilidad APIs publicly accessible
**Risk:** Anyone can create/delete users, read/modify sustainability data
**Fix:** Add auth checks to ALL API routes

**Affected files:**
- `/api/admin/users/route.ts` - No auth check
- `/api/sostenibilidad/no-conformidades/route.ts` - No auth check
- `/api/sostenibilidad/acciones-correctivas/route.ts` - No auth check
- `/api/sostenibilidad/alerts/overdue/route.ts` - No auth check

**Implementation:**
```typescript
// Add to every API route
import { createServerClient } from '@supabase/ssr';

async function authenticateRequest(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => request.cookies.get(n)?.value } }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    // ... rest of handler
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

---

### P0.2: Service-Role Key Bypasses RLS + Missing Tenant Scoping
**Status:** ❌ All queries lack organization/tenant filter
**Risk:** Cross-tenant data access when multi-org mode enabled
**Fix:** Use anon key + add org_id to WHERE clauses

**Affected files:**
- `/api/sostenibilidad/compliance/calculate-score/route.ts` - No org filter
- `/api/sostenibilidad/dashboard/overview/route.ts` - No org filter
- `/api/sostenibilidad/inspecciones/route.ts` - No org filter

**Implementation:**
```typescript
// Replace service-role with anon key + add org scoping
const { data } = await supabase
  .from('no_conformidades')
  .select('*')
  .eq('org_id', user.organization_id)  // ← ADD THIS
  .match(filters);
```

---

### P0.3: Webhook Endpoint No Signature Verification
**Status:** ❌ `/api/sostenibilidad/webhooks/event-listener` has no auth
**Risk:** Anyone can trigger write workflows (NC/CA creation)
**Fix:** Validate HMAC signature on webhook POST

**File:** `/api/sostenibilidad/webhooks/event-listener/route.ts`

**Implementation:**
```typescript
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature');
  const body = await request.text();
  
  const hash = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
    
  if (signature !== hash) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Process webhook
}
```

---

## P1 - HIGH (Fix This Week)

### P1.1: RBAC SQL Policy Too Permissive
**Status:** ❌ `USING (true)` - allows all access
**Risk:** Row-level security nullified
**File:** `/db/migrations/003-user-permissions-rbac.sql` (line 44)

**Fix:**
```sql
-- Current (WRONG):
CREATE POLICY "user_permissions_select" ON user_permissions
  FOR SELECT USING (true);

-- Fixed:
CREATE POLICY "user_permissions_select" ON user_permissions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );
```

---

### P1.2: Setup Routes Publicly Exposed + APIs Don't Exist
**Status:** ❌ `/setup` and `/setup/initialize-db` callable without auth
**Risk:** Anyone can trigger setup flows
**Broken APIs:** Code calls routes that don't exist

**Affected files:**
- `/app/setup/page.tsx` - Calls missing APIs
- `/app/setup/initialize-db/page.tsx` - Calls missing APIs

**Fix:**
1. Add auth check to middleware for `/setup/*`
2. Either create missing APIs or remove setup flows from UI
3. For now: Protect `/setup` with admin-only middleware

---

## P2 - MEDIUM (Fix Next Sprint)

### P2.1: Production Endpoints Failing
**Status:** ❌ Table name mismatch (`sostenibilidad_no_conformidades` vs `sostenibilidad_nonconformances`)
**Affected endpoints:**
- `POST /api/sostenibilidad/compliance/calculate-score`
- `GET /api/sostenibilidad/intelligence/insights`

**Fix:**
- Audit all table references
- Standardize naming (choose one: `no_conformidades` or `nonconformances`)
- Update all queries to match schema

---

### P2.2: TypeScript Build Errors Ignored in Production
**Status:** ❌ `next.config.mjs` ignores TypeScript errors
**Risk:** Runtime errors slip through
**File:** `/next.config.mjs`

**Fix:**
```javascript
// Remove or change:
typescript: {
  ignoreBuildErrors: true, // ← REMOVE THIS
},
```

---

### P2.3: UI Bug - onClick Duplicated
**Status:** ❌ Duplicate onClick handler
**File:** `/components/admin/users-list.tsx` (line 202)

**Fix:**
- Remove duplicate `onClick` attribute
- Keep only one handler

---

## Rollout Order

### Week 1 (Days 1-2)
1. **Add auth middleware for /api** routes
2. **Fix webhook signature validation**
3. **Protect /setup routes**

### Week 1 (Days 3-5)
1. **Replace service-role with anon key**
2. **Add org_id scoping to queries**
3. **Fix RBAC SQL policies**

### Week 2
1. **Fix table name mismatches**
2. **Re-enable TypeScript build errors**
3. **Fix UI bugs**

---

## Testing Checklist

- [ ] Unauthenticated API calls return 401
- [ ] Webhook without valid signature rejected
- [ ] Setup routes redirect to login if not authenticated
- [ ] Service-role key removed from codebase
- [ ] All queries include org scoping
- [ ] RBAC policies test in Supabase
- [ ] Endpoints return correct status codes
- [ ] Build fails on TypeScript errors

---

**Total Impact:** 7 findings, ~50 lines of code changes
**Estimated Time:** 6-8 hours
**Risk Level:** Critical → High (after P0 fixes)
