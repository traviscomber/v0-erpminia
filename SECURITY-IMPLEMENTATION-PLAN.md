# Document Management System - Security Implementation

**Objective**: Ensure users can ONLY see documents from their authorized modules

---

## Problem Statement

Current implementation has security gap:
- API routes use `service_role_key` (bypasses RLS)
- RLS policies don't filter by user module access
- Users from one module could potentially see documents from other modules
- No validation of module access in API layer

---

## Solution: Multi-Layer Security

### Layer 1: Database - User Module Access Control

**New Table**: `user_module_access`

```sql
CREATE TABLE user_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  module_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'viewer', 'uploader', 'reviewer', 'admin'
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, module_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_user_module_access_user ON user_module_access(user_id);
CREATE INDEX idx_user_module_access_module ON user_module_access(module_id);
```

**Module IDs**: `prevencion`, `mantenimiento`, `finanzas`, `hse`, `bodega`, `legal`

**Roles**:
- `viewer` - Can only see approved documents
- `uploader` - Can upload documents
- `reviewer` - Can review documents (L1 or L2)
- `admin` - Full access (all modules)

---

### Layer 2: Database RLS Policies

**Updated RLS on `module_documents`**:

```sql
-- Everyone can see active, approved documents from their authorized modules
CREATE POLICY "view_approved_documents"
  ON module_documents FOR SELECT
  USING (
    is_active = TRUE 
    AND status = 'active'
    AND EXISTS (
      SELECT 1 FROM user_module_access
      WHERE user_id = auth.uid()
      AND module_id = module_documents.module
      AND status = 'active'
    )
  );

-- Viewers can only see approved documents
CREATE POLICY "viewer_access"
  ON module_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_module_access
      WHERE user_id = auth.uid()
      AND module_id = module_documents.module
      AND role = 'viewer'
      AND status = 'active'
    )
    AND module_documents.status = 'active'
  );

-- Uploaders can see approved + their own draft documents
CREATE POLICY "uploader_access"
  ON module_documents FOR SELECT
  USING (
    (
      EXISTS (
        SELECT 1 FROM user_module_access
        WHERE user_id = auth.uid()
        AND module_id = module_documents.module
        AND role IN ('uploader', 'admin')
        AND status = 'active'
      )
    )
    AND (module_documents.status = 'active' OR module_documents.uploaded_by = auth.uid())
  );

-- Reviewers can see all documents in their modules, all statuses
CREATE POLICY "reviewer_access"
  ON module_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_module_access
      WHERE user_id = auth.uid()
      AND module_id = module_documents.module
      AND role IN ('reviewer', 'admin')
      AND status = 'active'
    )
  );

-- Only uploaders can insert
CREATE POLICY "insert_documents"
  ON module_documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_module_access
      WHERE user_id = auth.uid()
      AND module_id = module_documents.module
      AND role IN ('uploader', 'admin')
      AND status = 'active'
    )
  );

-- Only reviewers or uploaders can update
CREATE POLICY "update_documents"
  ON module_documents FOR UPDATE
  USING (
    (uploaded_by = auth.uid() OR reviewed_by_l1 = auth.uid() OR reviewed_by_l2 = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_module_access
      WHERE user_id = auth.uid()
      AND module_id = module_documents.module
      AND role IN ('uploader', 'reviewer', 'admin')
      AND status = 'active'
    )
  );
```

---

### Layer 3: API Route Validation

**All API routes MUST**:

1. Get authenticated user: `auth.getUser()`
2. Verify module access before querying:
   ```typescript
   const { data: access } = await supabase
     .from('user_module_access')
     .select('role')
     .eq('user_id', user.id)
     .eq('module_id', module)
     .single();
   
   if (!access) {
     return Response.json({ error: 'Unauthorized' }, { status: 403 });
   }
   ```

3. Use **user's own client** (not service_role_key):
   ```typescript
   // ❌ WRONG - bypasses RLS
   const supabase = createClient(url, SERVICE_ROLE_KEY);
   
   // ✅ RIGHT - respects RLS
   const supabase = createClient(url, PUBLIC_KEY);
   const { data: { user } } = await supabase.auth.getUser();
   // Then query as authenticated user
   ```

---

### Layer 4: Component Level Validation

**DocumentUpload Component**:
```typescript
// Only show upload if user has 'uploader' role in this module
if (userRole !== 'uploader' && userRole !== 'admin') {
  return <Unauthorized />;
}
```

**DocumentReviewModal Component**:
```typescript
// Only show review buttons if user has 'reviewer' role
if (userRole !== 'reviewer' && userRole !== 'admin') {
  return <Unauthorized />;
}
```

---

## Implementation Roadmap

### Step 1: Create `user_module_access` Table
- Run migration to create table
- Add sample data (test users)

### Step 2: Update RLS Policies
- Delete old policies
- Create new policies with module access validation

### Step 3: Update API Routes
- Use authenticated client instead of service_role
- Add module access validation
- Return 403 if unauthorized

### Step 4: Update Components
- Add role-based conditional rendering
- Show "Unauthorized" message if no access
- Disable buttons for read-only users

### Step 5: Testing
- Test user can ONLY see their module's documents
- Test user cannot see other modules' documents
- Test reviewer can see all statuses
- Test uploader can only see their drafts
- Test viewer can only see approved

---

## Security Checklist

- [ ] `user_module_access` table created
- [ ] RLS policies updated and tested
- [ ] API routes using authenticated client
- [ ] API routes validating module access
- [ ] Components checking user role
- [ ] Unauthorized state handled
- [ ] All tests passing
- [ ] No service_role_key used in queries
- [ ] Module filter applied on all API calls
- [ ] User cannot bypass filters via query params

---

## Testing Commands

```bash
# Get all documents (should only see my module's approved docs)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/documents/list?module=prevencion"

# Upload document (should fail if not uploader role)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  "http://localhost:3000/api/documents/upload?module=prevencion"

# Review document (should fail if not reviewer role)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentId": "...", "action": "approve"}' \
  "http://localhost:3000/api/documents/review"
```

---

## Architecture Diagram

```
User Login
    ↓
Get User ID from auth.getUser()
    ↓
Query user_module_access table
    ↓
Get user's modules and roles
    ↓
On API request:
  1. Validate module access (403 if denied)
  2. Use authenticated client (respects RLS)
  3. RLS policies filter by:
     - User module access
     - User role
     - Document status
  ↓
Return only authorized documents
```

---

## Result

✅ Users can ONLY see documents from modules they're authorized to access
✅ RLS enforced at database level (cannot be bypassed)
✅ API layer validates and double-checks
✅ Components respect user permissions
✅ Full audit trail of all access
✅ No data leakage between modules

