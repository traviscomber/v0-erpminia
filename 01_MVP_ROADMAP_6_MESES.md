# n3uralia ERP mining — Roadmap MVP 6 Meses

## Objetivo General
Construir un MVP **Enterprise-Grade** y listo para producción de n3uralia ERP mining, especializado en los 3 módulos operacionales críticos para empresas mineras medianas y contratistas en Chile.

**Módulos Core:**
1. **Sistema de Documentos** (Document Management & Compliance - SERNAGEOMIN)
2. **Sistema de Mantenimiento** (Assets & Maintenance Management - Predictivo)
3. **Bodega/Inventario** (Inventory & Warehouse Management - FIFO + QR)

**Horizonte:** 6 meses (Enero-Junio o Julio-Diciembre)
- **Meses 1-4**: Desarrollo y features core
- **Meses 5-6**: Testing exhaustivo, QA, bugfixes, optimización y launch preparation

### Inversión Requerida

- **Costo MVP Mensual:** $3,000,000 CLP + IVA 19% = $3,570,000 CLP/mes
- **Costo MVP Total (6 meses):** $18,000,000 CLP + IVA = $21,420,000 CLP
- **Soporte Mensual Post-Launch:** $1,500,000 CLP/mes
- **Team:** 7-8 profesionales
- **Breakdown Mensual:** $2.1M sueldos + $0.5M infraestructura + $0.4M herramientas/licenses

---

## Fase 0: Setup & Arquitectura (Semanas 1-2)

### Deliverables
- [ ] Infraestructura cloud (Vercel + Supabase PostgreSQL)
- [ ] Arquitectura de base de datos relacional normalizada
- [ ] System design de autenticación y RBAC (Role-Based Access Control)
- [ ] Framework de testing (unit, integration, e2e)
- [ ] Documentación de API contracts
- [ ] Setup de CI/CD pipeline (GitHub Actions)
- [ ] Design tokens y componentes base consolidados
- [ ] Security baseline (OWASP, encryption, audit logs)

### Tech Stack
**Frontend**
- Next.js 16 / React 19.2
- TypeScript strict mode
- Tailwind CSS v4 + Design Tokens
- shadcn/ui v4 + custom components
- React Hook Form + Zod
- TanStack Query v5
- Zustand
- Recharts

**Backend**
- Next.js 16 API Routes
- Supabase PostgreSQL (RLS policies)
- Prisma ORM v5
- tRPC
- NextAuth.js
- Bull for async jobs
- Email service (SendGrid/Resend)

**Testing**
- Vitest (unit tests)
- Playwright (e2e tests)
- MSW (Mock Service Worker)

**DevOps**
- GitHub Actions
- Vercel
- Sentry
- Datadog

---

## Fase 1: Maestros & Core (Semanas 3-6)

### Tablas Maestras Fundamentales
- companies, sites (faenas), contracts
- cost_centers, departments, users (RBAC)
- suppliers, warehouses, locations
- assets (equipos), asset_categories, item_categories
- audit_logs, activity_logs

### Core Workflows
- Authentication & Session management
- Multi-tenant support
- Audit trail (todos los cambios registrados)
- Base CRUD operations
- File upload (AWS S3 / Vercel Blob)
- Real-time notifications (WebSocket)

---

## Fase 2: Sistema de Documentos (Semanas 7-12)

### Features Core
- Upload y versionado de documentos
- OCR para reconocimiento de datos
- Workflow de aprobaciones multinivel
- SERNAGEOMIN compliance checklist
- Digital signatures
- Expiry tracking y alertas
- Full-text search
- Audit trail completo

### Base de Datos
```sql
documents (id, name, type, status, created_by, expires_at, version)
document_approvals (id, document_id, approver_id, status, comments)
document_versions (id, document_id, file_url, created_at)
document_templates (id, name, schema, created_by)
```

### UI/UX
- Document list with filters
- Bulk upload
- Approval dashboard
- Document viewer (PDF, images)
- Search & filter
- Export to Excel/PDF

---

## Fase 3: Sistema de Mantenimiento (Semanas 13-18)

### Features Core
- Work Order management (crear, asignar, ejecutar, cerrar)
- Preventive maintenance scheduling
- Predictive maintenance (basado en MTBF)
- Asset tracking y location history
- Down time reporting
- MTTR (Mean Time To Repair) tracking
- Spare parts management
- Technician assignment & skills matrix
- Safety checklist pre-work

### Base de Datos
```sql
maintenance_orders (id, asset_id, type, priority, status, assigned_to, due_date)
maintenance_history (id, order_id, completed_by, actual_duration, comments)
spare_parts (id, name, category, quantity, min_level, supplier_id)
maintenance_schedule (id, asset_id, frequency, last_executed, next_due)
asset_downtime (id, asset_id, start_time, end_time, reason)
```

### UI/UX
- Order creation wizard
- Real-time status tracking
- Technician mobile app (React Native future)
- Dashboard with KPIs (MTTR, availability %)
- Schedule calendar
- Alert system

---

## Fase 4: Sistema de Bodega/Inventario (Semanas 19-24)

### Features Core
- Inventory management (FIFO, stock levels)
- QR code generation y scanning
- Multi-location warehouse
- Stock transfers entre bodegas
- Receiving & quality control
- Supplier management
- Reorder point automation
- Cycle counting
- Barcode printing

### Base de Datos
```sql
inventory_items (id, name, sku, category, current_qty, min_level, max_level, unit_cost)
warehouse_locations (id, warehouse_id, aisle, row, bin, capacity, current_qty)
inventory_movements (id, item_id, from_location, to_location, quantity, type, moved_by, moved_at)
stock_receives (id, po_id, item_id, qty_received, receiver_id, received_at)
cycle_counts (id, location_id, counted_qty, system_qty, variance, counted_by, counted_at)
```

### UI/UX
- Inventory dashboard
- Search by SKU / name
- Stock in/out forms
- QR scanner interface
- Location matrix view
- Reorder report
- Movement history

---

## Fase 5: Testing Exhaustivo (Semanas 25-27 / Mes 5)

### Unit Testing (Semana 25)
- [ ] Frontend component tests (80%+ coverage)
  - Form validation tests
  - Button interactions
  - Data display components
  - Modal/Dialog behavior
- [ ] Backend service tests
  - Database queries
  - Business logic
  - API endpoints
  - Authentication flows

**Target:** 80% code coverage minimum

### Integration Testing (Semana 26)
- [ ] API integration tests
  - tRPC procedures
  - Database operations
  - File uploads
  - Email notifications
- [ ] Cross-module workflows
  - Document approval → Notification → Audit log
  - Work order creation → Asset update → Inventory check
  - Stock transfer → Location update → Audit trail

### E2E Testing (Semana 27)
- [ ] Critical user journeys
  - Login → Create document → Approve → Export
  - Create work order → Assign → Complete → Close
  - Receive inventory → Update locations → Generate report
- [ ] Edge cases
  - Concurrent operations
  - Network failures
  - Session expiry
  - Permission denials

**Test Framework:** Playwright + MSW
**Minimum Coverage:** 75% of critical paths

---

## Fase 6: QA, Optimización & Launch (Semanas 28-30 / Mes 6)

### Performance Testing (Semana 28)
- [ ] Load testing (Lighthouse / WebPageTest)
  - First Contentful Paint (FCP) < 1.5s
  - Largest Contentful Paint (LCP) < 2.5s
  - Cumulative Layout Shift (CLS) < 0.1
  - Time to Interactive (TTI) < 3s
- [ ] Database query optimization
  - Slow query identification
  - Index optimization
  - Query plan analysis
- [ ] Bundle size optimization
  - Code splitting analysis
  - Dead code removal
  - Asset compression

**Target:** Lighthouse score > 85 para todas las rutas

### Security Testing (Semana 28)
- [ ] OWASP Top 10 assessment
  - SQL Injection testing
  - XSS vulnerability scanning
  - CSRF protection validation
  - Authentication bypass testing
- [ ] Data protection
  - Encryption at rest/transit
  - Password hashing verification
  - API key rotation
  - Secrets management
- [ ] Access control
  - RBAC enforcement
  - Row-level security (RLS)
  - Permission boundaries
  - Audit log verification

**Tools:** Burp Suite Community, OWASP ZAP, npm audit

### Manual QA (Semana 29)
- [ ] Functional testing por módulo
  - Documents: Upload, approve, export, search
  - Maintenance: Create, assign, track, close
  - Inventory: In/out, transfers, QR scan, reports
- [ ] User experience testing
  - Navigation flows
  - Error messages clarity
  - Mobile responsiveness
  - Accessibility (WCAG 2.1 AA)
- [ ] Regression testing
  - All features working post-optimization
  - No feature breaking changes

**Test Cases:** Mínimo 150 test cases por módulo

### Bug Fixing & Optimization (Semana 29)
- [ ] Critical bugs: 24h SLA
- [ ] High priority: 48h SLA
- [ ] Medium priority: 1 week SLA
- [ ] Low priority: Backlog
- [ ] Performance tuning:
  - Query optimization
  - Frontend rendering optimization
  - Caching strategies
  - CDN configuration

### Documentation & Training (Semana 30)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guides (PDF + video)
- [ ] Admin manual (setup, configuration, maintenance)
- [ ] Developer documentation (setup, architecture, deployment)
- [ ] Video tutorials (3-5 min each)
  - Getting started
  - Module walkthroughs
  - Common tasks
- [ ] Internal training materials

### Launch Preparation (Semana 30)
- [ ] Production environment setup
  - Database backups
  - Monitoring & alerting
  - Error tracking (Sentry)
  - Session replay (LogRocket)
- [ ] Deployment checklist
  - Code freeze
  - Final smoke tests
  - Rollback procedures
  - Incident response plan
- [ ] Customer communication
  - Release notes
  - Known limitations
  - Support contact info
- [ ] Support readiness
  - Ticketing system setup
  - Knowledge base
  - Support team training
  - SLA definition

---

## Success Criteria

### Fase 0-4 (Development)
- ✓ 100% feature completion per spec
- ✓ 0 critical bugs
- ✓ Database normalized and optimized
- ✓ API documented
- ✓ All modules functional

### Fase 5-6 (Testing & QA)
- ✓ 80%+ code coverage
- ✓ 75%+ e2e test coverage
- ✓ Lighthouse score > 85
- ✓ Security assessment passed
- ✓ 0 critical/high severity bugs
- ✓ WCAG 2.1 AA compliance
- ✓ All 150+ test cases passing
- ✓ Load test: 1000 concurrent users handled smoothly

---

## Team Composition

**Recomendado: 6-8 personas**

- **1x Tech Lead / Architect** (oversight, architecture, critical code reviews)
- **2x Full-Stack Developers** (features development, API design)
- **1x Frontend Developer** (UI/UX implementation, animations)
- **1x QA Engineer** (test plan, automation, manual testing)
- **1x DevOps/Infra Engineer** (deployment, monitoring, performance)
- **1x Product Manager** (requirements, prioritization, stakeholder communication)
- **1x UX/UI Designer** (design system, wireframes, user research)

**Optional:**
- Security consultant (penetration testing)
- Technical writer (documentation)

---

## Budget Estimate (Basado en CLP)

**Development (Meses 1-4):** $150,000 - $250,000 USD
- Infrastructure: $2,000/mes
- Team salaries (6 personas × 4 meses): ~$200,000
- Tools & licenses: $5,000
- Contingency (10%): $15,000

**Testing & QA (Meses 5-6):** $50,000 - $80,000 USD
- Specialized QA testing: $30,000
- Performance optimization: $10,000
- Security assessment: $15,000
- Documentation & training: $5,000
- Contingency (10%): $7,000

**Total MVP Cost:** $200,000 - $330,000 USD (~$195M - $322M CLP)

---

## Timeline Visual

```
Mes 1 (Sem 1-4):     Setup, Databases, Auth, Core workflows
Mes 2 (Sem 5-8):     Documentos Module (50%), Maintenance setup
Mes 3 (Sem 9-12):    Documentos (100%), Maintenance (80%), Inventory setup
Mes 4 (Sem 13-16):   Maintenance (100%), Inventory (100%), Integration
Mes 5 (Sem 17-21):   Unit + Integration + E2E Testing
Mes 6 (Sem 22-26):   Performance + Security + Manual QA + Launch
```

---

## Riesgos & Mitigación

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Requerimientos no claros | High | High | Weekly stakeholder meetings, formal sign-off |
| Scope creep | High | High | Frozen scope after Fase 1, change control process |
| Performance issues discovered late | Medium | High | Load testing desde Fase 3, profiling continuous |
| Security vulnerabilities | Medium | Critical | Security review in Fase 0, penetration testing Mes 6 |
| Team availability gaps | Low | Medium | Cross-training, documentation, pair programming |
| Database migration issues | Low | High | Staging environment identical to prod, rollback plan |

---

## Post-MVP Roadmap (Meses 7+)

**Fase 7 - Expansión (6 meses)**
- [ ] Procurement module (gestión de compras)
- [ ] Financial module (contabilidad, presupuestos)
- [ ] HR module (nómina, vacaciones, training)
- [ ] Mobile app (iOS/Android nativo)
- [ ] AI Assistant (análisis predictivo)

**Fase 8 - Integraciones (3 meses)**
- [ ] SAP connector
- [ ] ERP legacy systems
- [ ] IoT sensor integration
- [ ] GIS mapping
- [ ] Power BI / Analytics

**Fase 9 - Scale (Ongoing)**
- [ ] Multi-language support
- [ ] Additional mining geographies
- [ ] Industry verticals (construction, oil & gas)
- [ ] SaaS platform scaling

---

## Conclusión

Este roadmap establece una base sólida para un MVP enterprise-grade especializado en operaciones mineras chilenas, con énfasis particular en **calidad, seguridad y rendimiento** mediante 2 meses dedicados a Testing y QA exhaustivo.

**El resultado es un producto listo para producción, escalable y apto para ser comercializado con confianza a empresas mineras medianas, contratistas y consultores.**
