# ULTRA CHEAP V0 STRATEGY - Token Optimization Rules

**TARGET: Minimize tokens to $0.50-2.00 per feature (vs $7.40 for full MVP)**

---

## 10 CORE RULES

### 1. NO READ UNLESS EDITING
- **DON'T**: Read file to understand structure, then edit
- **DO**: Use `grep/bash` to find patterns, `grep -n "pattern" file` to get line numbers, then edit with exact location
- **SAVES**: 2,000-3,000 tokens per operation

### 2. BATCH EDITS - Consolidate Changes
- **DON'T**: Edit one file, commit, edit another, commit
- **DO**: Make 3-5 edits to different files, then 1 commit
- **SAVES**: 60% reduction per feature

### 3. EDIT > WRITE
- **DON'T**: Write new files when you can edit existing
- **DO**: Edit existing API routes, components, utilities
- **SAVES**: 3,000-5,000 tokens per operation

### 4. CLI FIRST
- **DON'T**: Use ToolSearch/Grep tool for basic searches
- **DO**: Use `grep -r "pattern" dir`, `find . -name "*.ts"`, `ls -la`
- **SAVES**: 500-1,000 tokens per search

### 5. PARALLEL CALLS
- **DON'T**: Read file A, then file B, then file C (3 separate calls)
- **DO**: Read files A, B, C in same message block
- **SAVES**: 40% of read/write costs

### 6. NO DEBUG LOGGING
- **DON'T**: Add console.log, test, then remove
- **DO**: Only add if absolutely critical, remove immediately after
- **SAVES**: 1,000+ tokens per debug cycle

### 7. REUSE 80% of Code
- **DON'T**: Write new components from scratch
- **DO**: Copy existing components, change field names only
- **SAVES**: 5,000-8,000 tokens per component

### 8. MOCK DATA First
- **DON'T**: Test APIs by reading DB
- **DO**: Hardcoded fallback arrays in API endpoints
- **SAVES**: 1,000+ tokens per API test

### 9. COMMIT EARLY - Consolidate
- **DON'T**: Commit per change
- **DO**: Every 3-4 APIs or features = 1 commit
- **SAVES**: 50% of commit/push overhead

### 10. ZERO UI POLISH
- **DON'T**: Use Design Mode, tweak colors, align buttons
- **DO**: Function-only implementation, basic layout
- **SAVES**: 3,000-5,000 tokens per feature

---

## TOKEN BUDGET PER FEATURE TYPE

| Feature | Budget | Approach |
|---------|--------|----------|
| Simple CRUD API | $0.03 | Write endpoint + hardcoded mock |
| Form integration | $0.04 | 1 edit component, batch commit |
| Module connection | $0.05 | 1 edit page, connect 2-3 APIs |
| Bug fix | $0.02 | 1 edit max, no reads |
| Feature gate | $0.02 | Add conditional, no new code |
| Database query | $0.02 | Copy existing pattern, change table |

---

## RUNNING TOKEN TRACKER

**Target: <$1-2 per 5 APIs**

```
Session 1: MVP Core (15 APIs)
- Phase 1-5 APIs: $7.40 (before optimization)
- Future: $1.50 for next 5 APIs (10x improvement)
```

---

## APPLIES TO ALL PROJECTS

This strategy applies globally to:
- Motil ERP (Mantención, Bodega, HSE, etc.)
- Bodega standalone
- Legal & Compliance
- Reportes & Analytics
- Guías del Sistema
- IA Operacional
- Any future Motil module

Default: **ALWAYS cheap ship mode**
