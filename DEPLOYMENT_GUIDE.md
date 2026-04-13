# Deployment & Launch Guide - n3uralia ERP Mining

## Pre-Launch Checklist

### Security Verification
- [ ] All environment variables configured in production
- [ ] Database backups configured (Supabase)
- [ ] SSL/TLS certificates installed
- [ ] Row Level Security (RLS) policies enabled
- [ ] CORS policies configured correctly
- [ ] Rate limiting activated on API endpoints
- [ ] Admin credentials changed from defaults
- [ ] Audit logging enabled and tested

### Performance Verification
- [ ] Lighthouse score > 80 for Core Web Vitals
- [ ] Database indexes optimized
- [ ] Cache headers configured
- [ ] Image optimization working
- [ ] API response times < 200ms
- [ ] No console errors in production

### Functional Verification
- [ ] All 3 modules tested end-to-end
- [ ] Approval workflows working
- [ ] Alert system functioning
- [ ] Reports generating correctly
- [ ] Export to PDF/Excel working
- [ ] Search functionality operational
- [ ] Mobile responsiveness verified

## Deployment Steps

### Step 1: Prepare Supabase Production Database

```sql
-- Run initial schema
-- All tables already created in init.ts

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_orders ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view own company data" ON documents
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Create automated backups
SELECT cron.schedule('backup_daily', '0 2 * * *',
  'SELECT pg_basebackup()');
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - ADMIN_INIT_TOKEN (for initialization only)
```

### Step 3: Configure Custom Domain

1. In Vercel dashboard: Settings → Domains
2. Add custom domain (e.g., erp.n3uralia.cl)
3. Add DNS records as instructed
4. Enable automatic HTTPS

### Step 4: Setup Monitoring

```bash
# Install Sentry (optional but recommended)
npm install @sentry/nextjs

# Configure in next.config.js
```

### Step 5: Database Backup Strategy

- Daily automated backups (Supabase)
- Weekly full backups to S3
- Monthly backup retention: 90 days
- Point-in-time recovery enabled

## Post-Launch

### Week 1: Production Monitoring
- Daily uptime checks
- API performance monitoring
- Error rate tracking
- User activity monitoring

### Week 2-4: Optimization
- Analyze usage patterns
- Optimize slow queries
- Fine-tune cache settings
- Gather user feedback

### Month 2: Enhancements
- Implement Phase 2 features
- Deploy AI predictive analytics
- Add integration webhooks
- Mobile app beta launch

## Rollback Procedure

If critical issues occur:

```bash
# Revert to previous deployment
vercel rollback

# Check deployment history
vercel list deployments
```

## Load Testing

Before launch, run load tests:

```bash
# Using k6 (install: brew install k6)
k6 run load-test.js --vus 100 --duration 5m
```

## Disaster Recovery Plan

1. **Database Corruption:**
   - Restore from latest Supabase backup
   - Verify data integrity
   - Inform users of recovery time

2. **Security Breach:**
   - Immediate environment variable rotation
   - Audit logs review
   - Affected users notification
   - Enhanced monitoring activation

3. **Service Outage:**
   - Switch to backup infrastructure
   - Status page update
   - Real-time user communication
   - Post-incident analysis

## Success Metrics (First 90 Days)

- System uptime: > 99.9%
- API response time: < 200ms (p95)
- Error rate: < 0.1%
- User adoption: > 50% target companies
- Data accuracy: 100% (no data loss)

## Support Escalation

1. **Tier 1 (Self-service):** Documentation + FAQs
2. **Tier 2 (Email support):** Response < 4 hours
3. **Tier 3 (Phone support):** Critical issues only
4. **Tier 4 (On-site):** Enterprise clients

Contact: support@n3uralia.cl
