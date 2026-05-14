# n3uralia ERP - Quick Reference Card

## ESSENTIAL INFO

**Project:** La Patagua Mining - Visual Compare API MVP  
**Stack:** Next.js 16 + React 19 + Tailwind CSS v4 + Supabase  
**Status:** 40% Complete | ACTIVE DEVELOPMENT  
**Key Person:** juan@n3uralia.com (test user)

---

## QUICK START

```bash
git pull origin main
pnpm install
pnpm dev           # http://localhost:3000
```

Login: `juan@n3uralia.com` / `c4rlit0s`

---

## WHAT'S DONE ✅

- **Sidebar Navigation** - Reorganized by departments (FIXED)
- **Sostenibilidad Module** - 8 complete pages with 10 sub-modules
  - Dashboard, Risk Prevention, Training, Equipment, KPIs, Inspections, Calendar, Documents
- **Brandbook Applied** - Strict 4-color system (primary/secondary/destructive/muted)
- **Auth System** - Supabase email + password working
- **UI Components** - shadcn/ui pre-installed + custom badges
- **Charts** - Recharts integration ready

---

## WHAT'S NOT DONE ❌

- Producción (Production)
- Mantenimiento (Maintenance)
- Bodega (Inventory)
- Compras (Procurement)
- Finanzas (Finance)
- IA Operacional (AI)
- Admin section
- ~60+ files need brandbook color fixes

---

## CRITICAL RULES

### 🎨 BRANDBOOK (NO EXCEPTIONS)
- Only 4 colors: primary (naranja), secondary (verde), destructive (rojo), muted (gris)
- Use tokens: `bg-primary`, `text-secondary`, `bg-destructive/10`
- NO arbitrary colors like `#FF6B35`, `bg-blue-500`, etc.
- NO gradients

Read: `/BRANDBOOK.md` BEFORE any UI work

---

## FILE STRUCTURE

```
/app/dashboard/sostenibilidad/**    ← Reference implementation
/components/layout/sidebar.tsx       ← Navigation (FIXED - test it)
/app/globals.css                     ← Tailwind + CSS variables
/BRANDBOOK.md                        ← Color rules
/AUDIT_REPORT.md                     ← Latest bugs
/PROJECT_SUMMARY.md                  ← Full documentation
```

---

## NEXT STEPS

1. Test sidebar navigation (click links in live server)
2. Fix remaining 60+ files for brandbook compliance
3. Implement: Producción → Mantenimiento → Bodega
4. Deploy to Vercel
5. Notify team

---

## KNOWN ISSUES

- ✅ Sidebar nav broken (FIXED - reload to test)
- ⚠️ ThemeProvider warning (non-blocking)
- ⚠️ 60% of codebase needs color fixes

---

## CONTACT

Test with: juan@n3uralia.com / c4rlit0s  
Database: Supabase PostgreSQL  
Hosting: Vercel

**Last Updated:** May 14, 2026  
**Next Review:** When 60% module completion reached
