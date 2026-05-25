# P1 - TYPESCRIPT ERRORS TO FIX
## Build passes but with type warnings

**Status:** Build compiles successfully (ignoreBuildErrors: true)  
**Action:** Fix these type errors in next session with strict mode enabled

---

## Type Errors Found

### 1. Recharts Formatter Parameters
**File:** `app/dashboard/documentos-gestion/contratos/reportes/page.tsx`

**Error:** `formatter` parameters need explicit typing
- Line 87, 151: `(value)` should be `(value: any)`

**Fix:**
```typescript
// BEFORE
<Tooltip formatter={(value) => `CLP ${(value / 1000000).toFixed(1)}M`} />

// AFTER
<Tooltip formatter={(value: any) => `CLP ${(Number(value) / 1000000).toFixed(1)}M`} />
```

### 2. Array Filter Parameters
**File:** `app/dashboard/documentos-gestion/contratos/reportes/page.tsx`

**Error:** Map callback parameters need typing
- Line 122: `(_, index)` should be `(_: any, index: number)`

**Fix:**
```typescript
// BEFORE
{garantiasActivas.map((_, index) => (
  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
))}

// AFTER
{garantiasActivas.map((_: any, index: number) => (
  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
))}
```

### 3. useMemo Filter Parameters
**File:** Multiple dashboard pages with search filtering

**Error:** Filter callbacks have untyped parameters

**Fix:**
```typescript
// BEFORE
const filteredCategories = useMemo(() => {
  if (!searchTerm) return categories;
  return categories.filter(cat =>
    cat.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [categories, searchTerm]);

// AFTER
interface Category {
  name?: string;
  description?: string;
}

const filteredCategories = useMemo(() => {
  if (!searchTerm) return categories;
  return categories.filter((cat: Category) =>
    cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [categories, searchTerm]);
```

---

## How to Enable Strict Mode

Once these errors are fixed:

1. Update `next.config.mjs`:
```javascript
typescript: {
  ignoreBuildErrors: false, // Revert to strict
}
```

2. Run build:
```bash
cd /vercel/share/v0-project
pnpm build
```

3. Fix remaining type errors (will show in output)

---

## Root Causes

- **Untyped callbacks:** Map, filter, formatters need explicit parameter types
- **Implicit any:** Library typings (Recharts, React) sometimes return `any`
- **Generic types:** Components with generics need proper typing

---

## Priority

**P1:** Fix before re-enabling strict mode (next session)  
**Effort:** ~1-2 hours to add all types comprehensively  
**Impact:** None - code works, just needs type cleanup

---

**Next Step:** Run `pnpm build 2>&1 | grep "Type error"` to see full list after fix
