# PHASE 3 - QUICK START GUIDE

**Status:** ✅ Production Ready  
**Build:** ✅ Passing  
**Deployment:** Ready for Vercel

---

## 📊 WHAT'S NEW IN PHASE 3

### Non-Conformance Management System
- **Create & Track:** Auto-numbered NC tickets (NC-2026-XXXX)
- **Corrective Actions:** Linked action plans (CA-NC-XXXX-XX)
- **Compliance Score:** Real-time tracking of completion rate
- **Overdue Alerts:** System alerts for overdue items
- **Audit Trail:** Full history of all changes

---

## 🔗 QUICK ACCESS

### User Portals
- Dashboard: `/dashboard/sostenibilidad/no-conformidades`
- Create NC: Button in dashboard
- Create CA: From NC detail view
- View Compliance: Compliance tab

### API Endpoints
```
POST /api/sostenibilidad/nonconformances
GET /api/sostenibilidad/nonconformances?status=open
GET /api/sostenibilidad/nonconformances/[id]
PUT /api/sostenibilidad/nonconformances/[id]

POST /api/sostenibilidad/corrective-actions
GET /api/sostenibilidad/corrective-actions
GET /api/sostenibilidad/compliance-report
```

### Database Tables
- `sostenibilidad_nonconformances` - Master records
- `sostenibilidad_corrective_actions` - Action plans
- `sostenibilidad_ca_updates` - Progress tracking
- `sostenibilidad_compliance_history` - Reporting

---

## 🚀 DEPLOYMENT

### Deploy to Vercel
```bash
git add .
git commit -m "Phase 3: Non-conformance management - production ready"
git push origin main
```

### Verify Deployment
1. Check build status in Vercel dashboard
2. Test at: `https://your-domain.vercel.app/dashboard/sostenibilidad/no-conformidades`
3. Create test non-conformance
4. Verify auto-numbering works

---

## 📝 KEY FEATURES

### Auto-Numbering
- **NC Format:** NC-YYYY-XXXX (e.g., NC-2026-0001)
- **CA Format:** CA-NC-YYYY-XXXX-XX (e.g., CA-NC-2026-0001-01)

### Status Workflows
- **NC:** open → under_review → corrected → closed
- **CA:** planned → in_progress → completed → verified

### Severity Levels
- **Critical** - Red badge, immediate action required
- **High** - Orange badge, urgent
- **Medium** - Yellow badge, schedule within 2 weeks
- **Low** - Green badge, routine

### Compliance Score
- Calculated as: (Closed NCs on time / Total NCs) × 100
- Updates in real-time as CAs are completed
- Used for compliance reporting to regulators

---

## 🔐 SECURITY

### RBAC Permissions
- `sustainability.read` - View NCs and CAs
- `sustainability.write` - Create and edit NCs/CAs
- `sustainability.approve` - Close NCs and verify CAs

### Multi-Tenant
- All data isolated by organization_id
- RLS policies enforce isolation
- No cross-tenant data visibility

### Audit Trail
- All mutations logged with user, timestamp, changes
- Full history of NC and CA modifications
- Exportable for compliance audits

---

## 📊 DASHBOARDS

### KPI Cards
- **Open NCs:** Count of open non-conformances
- **Overdue NCs:** Count past due date (in red)
- **CAs In Progress:** Count of active action plans
- **Compliance Score:** % of NCs closed on time

### Tabs
1. **Overview** - Summary statistics
2. **Active NCs** - Table of open items
3. **Corrective Actions** - Track all action plans
4. **Compliance** - Historical trends

---

## 🛠️ TROUBLESHOOTING

### Build Fails
- Ensure env vars set in Vercel dashboard
- Check for TypeScript errors: `npx tsc --noEmit`
- Rebuild: `git push origin main`

### Supabase Connection
- Verify NEXT_PUBLIC_SUPABASE_URL is set
- Verify SUPABASE_SERVICE_ROLE_KEY is in Vercel
- Check database migrations ran: `SELECT count(*) FROM sostenibilidad_nonconformances;`

### RBAC Issues
- Verify user has correct permissions
- Check `/api/admin/permissions` endpoint
- Ensure user_roles record exists in database

---

## 📞 SUPPORT

For issues:
1. Check database: `SELECT * FROM sostenibilidad_nonconformances LIMIT 5;`
2. Check API response: Test endpoint in Postman
3. Check browser console for client errors
4. Review audit_trail for mutation history

---

## ✅ PRODUCTION CHECKLIST

- [ ] Build passes: `pnpm build`
- [ ] Deployed to Vercel
- [ ] Test NC creation
- [ ] Test CA creation
- [ ] Verify auto-numbering
- [ ] Check audit trail
- [ ] Test RBAC enforcement
- [ ] Validate compliance score
- [ ] Export to PDF/Excel works
- [ ] Monitor error logs (first 24h)

---

**Phase 3 Ready:** ✅ YES  
**Deploy Now:** ✅ READY
