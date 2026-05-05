GUÍA DE DEPLOYMENT - n3uralia ERP Minería
==========================================

## CHECKLIST PRE-DEPLOYMENT

### Verificaciones Código
□ Todos los tests pasan (npm run test)
□ Coverage >= 80% (npm run test:coverage)
□ Linting limpio (npm run lint)
□ Sin warnings de build (npm run build)
□ No hay console.log en código
□ Variables de entorno configuradas

### Verificaciones Seguridad
□ OWASP Top 10 audit completado
□ npm audit passed (sin vulnerabilidades críticas)
□ RLS policies en todas las tablas
□ Password policy enforced
□ Audit logging habilitado
□ No hay hardcoded secrets

### Verificaciones Performance
□ Lighthouse score >= 90
□ Page load < 2.5s
□ API latency < 500ms
□ Database queries optimizadas
□ SWR refresh intervals configurados

---

## DEPLOYMENT A VERCEL (RECOMENDADO)

### Paso 1: Preparar Repository

1. Ensure code is pushed to GitHub
```bash
git status
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

2. Verify main branch protection rules
- Require pull request reviews
- Dismiss stale PR reviews
- Require status checks

### Paso 2: Conectar a Vercel

1. Go to vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Click "Import"

### Paso 3: Configurar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

**Production Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NODE_ENV=production
```

**Optional (Monitoring):**
```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Paso 4: Configurar Domains

1. En Vercel → Settings → Domains
2. Agregar custom domain (ej: erp.miningco.cl)
3. Configure DNS records:
   ```
   CNAME: cname.vercel-dns.com
   ```

### Paso 5: Deploy

1. Click "Deploy" button
2. Wait for build to complete (~3-5 min)
3. Verify deployment successful

**URL resultante:**
- Production: https://erp.miningco.cl
- Preview: https://[branch].erp.vercel.app

---

## VERIFICACIÓN POST-DEPLOYMENT

### Health Check (Inmediato)

1. **Acceso a la plataforma**
   ```bash
   curl -I https://erp.miningco.cl
   # Status: 200 OK
   ```

2. **Todos los módulos accesibles**
   - [ ] Dashboard (< 3 segundos)
   - [ ] Producción (/dashboard/produccion)
   - [ ] Mantención (/dashboard/mantenimiento)
   - [ ] Bodega (/dashboard/bodega)
   - [ ] Compras (/dashboard/compras)
   - [ ] Finanzas (/dashboard/finanzas)
   - [ ] HSE (/dashboard/hse)
   - [ ] IA Operacional (/dashboard/ia-operacional)
   - [ ] KPI Dashboard (/dashboard/kpi-dashboard)

3. **Real-time Data Working**
   - [ ] Producción auto-refresh (30s)
   - [ ] KPI Dashboard refresh (60s)
   - [ ] Alerts display live

4. **Authentication**
   - [ ] Login works
   - [ ] Email verification sending
   - [ ] Session management working
   - [ ] Logout clears session

5. **RBAC Enforcement**
   - [ ] Permissions enforced by role
   - [ ] Audit logging recording actions
   - [ ] Admin can see all data

### Performance Checks (Primeras 24 horas)

1. **Page Load Metrics**
   ```bash
   lighthouse https://erp.miningco.cl --output=html
   ```
   - Largest Contentful Paint: < 2.5s
   - Cumulative Layout Shift: < 0.1
   - First Input Delay: < 100ms

2. **API Response Times**
   - Monitor in Vercel Analytics
   - Average latency: < 500ms
   - p95 latency: < 2s

3. **Error Rate**
   - Monitor Sentry dashboard
   - Should be < 0.1%

### Monitoring Setup (Primera semana)

1. **Configure Sentry**
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```
   - Check error trends
   - Set up alerts for critical errors

2. **Enable Vercel Analytics**
   - Vercel Dashboard → Analytics
   - Track usage patterns
   - Monitor performance trends

3. **Setup Monitoring Alerts**
   - High error rate (> 1%)
   - Deployment failures
   - Performance degradation

---

## ROLLBACK PROCEDURE

Si algo sale mal:

### Quick Rollback (< 5 min)

1. Go to Vercel Dashboard
2. Click your project
3. Go to Deployments
4. Find last stable deployment
5. Click "..." menu → "Promote to Production"

### Full Rollback

```bash
# If database schema changes needed
1. Check Supabase backups
2. Restore from automated backup
3. Redeploy previous code version
```

---

## LAUNCH DAY CHECKLIST

**1 Hour Before Launch**
- [ ] Final tests pass
- [ ] Monitoring systems online
- [ ] Support team ready
- [ ] Incident response plan communicated

**At Launch Time**
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Verify all modules accessible
- [ ] Monitor error rates (first 30 min)

**First 24 Hours**
- [ ] Monitor Sentry for errors
- [ ] Check performance metrics
- [ ] Respond to user issues
- [ ] Document any issues

**First Week**
- [ ] Stabilization mode
- [ ] Daily monitoring reviews
- [ ] User feedback collection
- [ ] Performance optimization

---

## BACKUP & DISASTER RECOVERY

### Automated Backups

Supabase provides automatic daily backups:
1. Go to Supabase Dashboard
2. Project Settings → Backups
3. Verify automatic backup enabled
4. Point-in-time recovery available

### Manual Backup

```bash
# Backup Supabase database
pg_dump postgresql://user:pass@db.supabase.co:5432/postgres > backup.sql

# Restore
psql postgresql://user:pass@db.supabase.co:5432/postgres < backup.sql
```

### Recovery Scenarios

**Data Corruption:**
1. Restore from latest Supabase backup
2. Verify data integrity
3. Redeploy application

**Application Error:**
1. Rollback to previous version
2. Fix code
3. Redeploy

---

## ONGOING MAINTENANCE

### Weekly Tasks
- [ ] Review error logs (Sentry)
- [ ] Check database performance
- [ ] Update npm packages (security)

### Monthly Tasks
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Backup integrity check

### Quarterly Tasks
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Architecture review

---

## COST ESTIMATION (Vercel + Supabase)

**Monthly Costs:**
- Vercel Pro: $20 USD (~CLP 17K)
- Supabase Pro: $25 USD (~CLP 21K) 
- Storage/Bandwidth: ~$10 USD (~CLP 8.5K)

**Total: ~CLP 46.5K/month (USD 55)**

**Annual: ~CLP 558K (USD 660)**

---

## SUPPORT & ESCALATION

**During Issues:**
1. Check Vercel status page
2. Review Sentry error details
3. Check database connectivity
4. Verify environment variables

**Emergency Contact:**
- Tech Lead: [contact info]
- On-call: [phone/email]

---

## DOCUMENTATION REFERENCES

- README.md - Project overview and quick start
- TESTING-STRATEGY.txt - Unit/E2E testing guide
- OWASP-COMPLIANCE.txt - Security checklist
- API-DOCS.md - Complete API reference
- MODULOS-AUDIT.txt - Module status and dependencies

---

Deployment Date: _________________
Deployed By: _________________
Verified By: _________________
