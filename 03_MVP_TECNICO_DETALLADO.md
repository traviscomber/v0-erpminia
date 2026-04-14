# MVP TÉCNICO DETALLADO

## n3uralia ERP mining

### Especificación técnica exhaustiva para desarrollo

---

## Índice

1. Architecture & Infrastructure
2. Database Schema
3. API Specification (tRPC)
4. Frontend Components & Pages
5. Authentication & Authorization (RBAC)
6. File Management
7. Real-time Features
8. Search & Filtering
9. Notifications & Alerts
10. Integrations
11. Performance Requirements
12. Security Requirements
13. Deployment & DevOps

---

## 1. Architecture & Infrastructure

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Browser)                   │
│  React 19 + Next.js 16 SSR + TypeScript + Tailwind CSS      │
│  (Hosted on Vercel CDN)                                      │
└──────────────────────────────────────────────────────────────┘
                         ↓ HTTPS
┌──────────────────────────────────────────────────────────────┐
│              API LAYER (Next.js 16 API Routes)                │
│  - tRPC endpoints (type-safe RPC)                             │
│  - NextAuth.js authentication                                 │
│  - File upload handling                                       │
│  - WebSocket connections (real-time)                          │
│  (Hosted on Vercel Serverless Functions)                     │
└──────────────────────────────────────────────────────────────┘
                         ↓ 
┌──────────────────────────────────────────────────────────────┐
│           DATA LAYER (Supabase PostgreSQL)                    │
│  - Relational database (ACID compliant)                       │
│  - Row-Level Security (RLS) policies                          │
│  - Real-time subscriptions                                    │
│  - Full-text search indexes                                   │
│  (Auto-scaling, automated backups)                            │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                                 │
│  - Vercel Blob (file storage)                                 │
│  - SendGrid (email notifications)                             │
│  - Sentry (error tracking)                                    │
│  - Datadog (monitoring & logs)                                │
└──────────────────────────────────────────────────────────────┘
```

### Technology Stack Details

**Frontend Framework**
- Next.js 16 (app router)
- React 19.2 (server components + client components)
- TypeScript 5.3 (strict mode)
- Tailwind CSS 4 (atomic CSS)
- shadcn/ui v4 + custom mining-specific components

**Frontend State Management**
- TanStack Query v5 (server state)
- Zustand v4 (client state - minimal)
- React Hook Form + Zod (form validation)

**Frontend UI Libraries**
- Recharts (charts & graphs)
- react-table v8 (data tables)
- react-hot-toast (notifications)
- react-hot-keys (keyboard shortcuts)
- zod (schema validation)

**Backend Framework**
- Next.js 16 (API routes + middleware)
- Node.js 20 LTS

**Backend Logic**
- tRPC v11 (type-safe RPC)
- Prisma v5 (ORM)
- NextAuth.js v4 (authentication)

**Database**
- Supabase PostgreSQL 15 (managed)
- Prisma migrations
- Row-Level Security (RLS)

**Message Queue / Async Jobs**
- Bull v4 (Redis-based)
- For: email sending, PDF generation, bulk operations

**File Storage**
- Vercel Blob (public uploads, PDFs)
- Built-in CDN, auto-compression

**Email Service**
- SendGrid (SMTP relay)
- Templated emails (handlebars)
- Webhooks for bounce/complaint tracking

**Monitoring & Observability**
- Sentry (error tracking)
- Datadog (logging, metrics)
- Vercel Analytics (performance)

**Testing Framework**
- Vitest (unit tests)
- Playwright (e2e tests)
- Mock Service Worker (API mocking)

**CI/CD**
- GitHub Actions (workflow automation)
- Vercel deployments (auto on merge to main)
- Pre-commit hooks (eslint, prettier)

---

## 2. Database Schema

### Core Entity Relationships

```sql
-- MASTER DATA
companies ←─────→ sites ←─────→ departments
                   ↓
              cost_centers
              
users (with RBAC roles)
├── admin
├── supervisor
├── operator
├── accountant
└── readonly

-- DOCUMENTS
documents ←─────→ document_versions
                   ↓
          document_approvals (workflow)
          document_templates
          
-- MAINTENANCE
assets (equipos) ←─────→ asset_categories
   ↓
   ├→ maintenance_orders
   ├→ maintenance_history
   ├→ maintenance_schedule
   └→ asset_downtime
   
asset_location_history (tracks where equipment has been)

-- INVENTORY
warehouses ←─────→ warehouse_locations
   ↓
inventory_items
├→ item_categories
├→ supplier_items
├→ inventory_movements
├→ stock_receives
└→ cycle_counts

-- AUDIT & COMPLIANCE
audit_logs (ALL changes recorded)
activity_logs (user activities)
approval_workflows (document states)
```

### Complete SQL Schema (Key Tables)

```sql
-- Companies (Multi-tenant)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  rut VARCHAR(15) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  country VARCHAR(100) DEFAULT 'Chile',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sites/Faenas
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  region VARCHAR(100),
  mining_type VARCHAR(50), -- underground, open_pit, both
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Users & RBAC
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- admin, supervisor, operator, accountant, readonly
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- permit, contract, report, inspection, etc
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending_approval, approved, rejected, expired
  expires_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_company_status (company_id, status),
  INDEX idx_expires_at (expires_at)
);

-- Document Versions (for versioning)
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_size_bytes INT,
  version_number INT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);

-- Document Approvals (workflow)
CREATE TABLE document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id),
  approval_order INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  comments TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, approver_id, approval_order)
);

-- Assets/Equipos
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- excavator, loader, truck, compressor, etc
  serial_number VARCHAR(100) UNIQUE,
  purchase_date DATE,
  current_location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'operational', -- operational, maintenance, retired
  acquisition_cost DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_site_status (site_id, status)
);

-- Maintenance Orders
CREATE TABLE maintenance_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  type VARCHAR(50) NOT NULL, -- preventive, corrective, predictive
  priority VARCHAR(50) NOT NULL, -- critical, high, medium, low
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  assigned_to UUID REFERENCES users(id),
  scheduled_date DATE,
  expected_duration_hours INT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_asset_status (asset_id, status),
  INDEX idx_priority_status (priority, status)
);

-- Inventory Items
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  unit_type VARCHAR(50), -- piece, kg, liter, m3, etc
  current_quantity INT NOT NULL DEFAULT 0,
  minimum_level INT DEFAULT 0,
  maximum_level INT DEFAULT 0,
  unit_cost DECIMAL(10, 2),
  supplier_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, sku),
  INDEX idx_low_stock (company_id, current_quantity)
);

-- Warehouse Locations
CREATE TABLE warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL,
  aisle VARCHAR(10),
  row_num VARCHAR(10),
  bin VARCHAR(10),
  current_quantity INT DEFAULT 0,
  capacity INT,
  item_id UUID REFERENCES inventory_items(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(warehouse_id, aisle, row_num, bin)
);

-- Inventory Movements (audit trail)
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  from_location_id UUID REFERENCES warehouse_locations(id),
  to_location_id UUID REFERENCES warehouse_locations(id),
  quantity INT NOT NULL,
  movement_type VARCHAR(50), -- in, out, transfer, adjustment, count
  reference_id UUID, -- links to purchase order, work order, etc
  moved_by UUID NOT NULL REFERENCES users(id),
  moved_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_item_date (item_id, moved_at),
  INDEX idx_company_date (company_id, moved_at)
);

-- Audit Logs (everything recorded)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  INDEX idx_table_record (table_name, record_id),
  INDEX idx_changed_at (changed_at)
);
```

### Key Indexes for Performance

```sql
-- Documents
CREATE INDEX idx_documents_company_status ON documents(company_id, status);
CREATE INDEX idx_documents_expires ON documents(expires_at);
CREATE FULLTEXT INDEX idx_documents_search ON documents(name, description);

-- Maintenance
CREATE INDEX idx_maintenance_asset_status ON maintenance_orders(asset_id, status);
CREATE INDEX idx_maintenance_priority ON maintenance_orders(priority, status);
CREATE INDEX idx_maintenance_assigned_to ON maintenance_orders(assigned_to, status);
CREATE INDEX idx_maintenance_date ON maintenance_orders(scheduled_date);

-- Inventory
CREATE INDEX idx_inventory_company_sku ON inventory_items(company_id, sku);
CREATE INDEX idx_inventory_low_stock ON inventory_items(company_id, current_quantity);
CREATE FULLTEXT INDEX idx_inventory_search ON inventory_items(sku, name);

-- Audit
CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_company_date ON audit_logs(company_id, changed_at);
```

---

## 3. API Specification (tRPC)

### tRPC Router Structure

```typescript
// /server/routers/_app.ts
export const appRouter = router({
  // Documents
  documents: router({
    list: procedure
      .input(z.object({ 
        companyId: z.string().uuid(),
        skip: z.number().default(0),
        take: z.number().default(20),
        status: z.string().optional()
      }))
      .query(({ input }) => {
        // Return paginated documents with permissions check
      }),
    
    create: procedure
      .input(DocumentCreateSchema)
      .mutation(({ input, ctx }) => {
        // Create document + audit log
      }),
    
    approve: procedure
      .input(z.object({ 
        documentId: z.string().uuid(),
        approverNotes: z.string().optional()
      }))
      .mutation(({ input, ctx }) => {
        // Update approval status + send notification
      }),
    
    export: procedure
      .input(z.object({
        documentId: z.string().uuid(),
        format: z.enum(['pdf', 'excel', 'csv'])
      }))
      .mutation(({ input }) => {
        // Queue PDF/export job
      })
  }),
  
  // Maintenance
  maintenance: router({
    createOrder: procedure
      .input(MaintenanceOrderSchema)
      .mutation(({ input, ctx }) => {
        // Create order + trigger notifications
      }),
    
    listByAsset: procedure
      .input(z.object({
        assetId: z.string().uuid(),
        status: z.string().optional()
      }))
      .query(({ input }) => {
        // List maintenance orders for asset
      }),
    
    updateStatus: procedure
      .input(z.object({
        orderId: z.string().uuid(),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
        notes: z.string().optional()
      }))
      .mutation(({ input, ctx }) => {
        // Update status + log time
      })
  }),
  
  // Inventory
  inventory: router({
    listItems: procedure
      .input(PaginationSchema.extend({
        search: z.string().optional(),
        category: z.string().optional(),
        lowStockOnly: z.boolean().default(false)
      }))
      .query(({ input }) => {
        // Return items with full-text search
      }),
    
    moveItem: procedure
      .input(z.object({
        itemId: z.string().uuid(),
        fromLocationId: z.string().uuid().optional(),
        toLocationId: z.string().uuid(),
        quantity: z.number().positive()
      }))
      .mutation(({ input, ctx }) => {
        // Record movement + update locations
      }),
    
    generateQRCodes: procedure
      .input(z.object({
        itemIds: z.array(z.string().uuid())
      }))
      .mutation(({ input }) => {
        // Queue QR code generation job
      })
  })
});
```

---

## 4. Frontend Components & Pages

### Pages Structure

```
app/
├── layout.tsx (root layout + providers)
├── dashboard/
│   ├── page.tsx (operations center)
│   ├── layout.tsx (sidebar + header)
│   ├── crear-tarea/
│   │   └── page.tsx (task creation wizard)
│   ├── alertas/
│   │   └── page.tsx (alerts center)
│   ├── documentos-v2/
│   │   ├── page.tsx (document list)
│   │   ├── [id]/
│   │   │   └── page.tsx (document detail + approvals)
│   │   └── upload/
│   │       └── page.tsx (document upload)
│   ├── mantenimiento/
│   │   ├── page.tsx (maintenance dashboard)
│   │   ├── [id]/
│   │   │   └── page.tsx (order detail)
│   │   └── create/
│   │       └── page.tsx (order creation)
│   ├── bodega/
│   │   ├── page.tsx (inventory dashboard)
│   │   ├── items/
│   │   │   └── page.tsx (items list + search)
│   │   ├── movements/
│   │   │   └── page.tsx (movements log)
│   │   └── qr-scanner/
│   │       └── page.tsx (QR scanning interface)
│   ├── operaciones/
│   │   └── page.tsx (operations overview)
│   ├── reportes/
│   │   └── page.tsx (reporting & exports)
│   └── finanzas/
│       └── page.tsx (financial summary)
├── auth/
│   ├── login/
│   │   └── page.tsx (login form)
│   └── signup/
│       └── page.tsx (registration)
└── api/
    ├── auth/[...nextauth].ts (authentication routes)
    ├── trpc/
    │   └── [trpc].ts (tRPC handler)
    └── upload/
        └── route.ts (file upload)
```

### Key Components

**Layout Components**
- `Header.tsx` - Top navigation + user menu
- `Sidebar.tsx` - Left navigation (grouped by module)
- `Footer.tsx` - App footer

**Dashboard Components**
- `StatusStrip.tsx` - 4 KPI cards (critical view)
- `CriticalTasksPanel.tsx` - Today's tasks table
- `AlertsCenter.tsx` - Alert notifications

**Document Components**
- `DocumentUpload.tsx` - Upload form
- `DocumentList.tsx` - Filterable list + search
- `ApprovalWorkflow.tsx` - Multi-level approval UI
- `DocumentViewer.tsx` - PDF/image viewer

**Maintenance Components**
- `OrderCreationWizard.tsx` - Step-by-step form
- `OrderDetail.tsx` - Full order view + history
- `AssetKPIs.tsx` - Equipment health metrics
- `MaintenanceSchedule.tsx` - Calendar view

**Inventory Components**
- `InventoryTable.tsx` - Searchable item grid
- `QRScanner.tsx` - Camera-based QR reader
- `LocationMatrix.tsx` - Warehouse grid view
- `MovementForm.tsx` - In/out/transfer workflow

---

## 5. Authentication & Authorization (RBAC)

### Roles & Permissions Matrix

```typescript
type Role = 'admin' | 'supervisor' | 'operator' | 'accountant' | 'readonly';

const permissions: Record<Role, Record<string, boolean>> = {
  admin: {
    // Full access
    'documents:*': true,
    'maintenance:*': true,
    'inventory:*': true,
    'users:manage': true,
    'settings:edit': true,
  },
  supervisor: {
    'documents:read': true,
    'documents:approve': true,
    'maintenance:create': true,
    'maintenance:edit': true,
    'maintenance:view': true,
    'inventory:read': true,
    'inventory:move': true,
    'users:view': false,
  },
  operator: {
    'documents:read': true,
    'maintenance:view': true,
    'maintenance:update_status': true,
    'inventory:read': true,
    'inventory:move': true,
    'users:view': false,
  },
  accountant: {
    'documents:read': true,
    'reports:read': true,
    'financials:read': true,
    'maintenance:view': true,
    'inventory:read': true,
  },
  readonly: {
    // Only read access
    'documents:read': true,
    'maintenance:view': true,
    'inventory:read': true,
  }
};
```

### Row-Level Security (RLS) in Supabase

```sql
-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Documents: Users can only see their company's documents
CREATE POLICY "Users see company documents"
  ON documents
  FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Maintenance: Supervisors can edit, operators can only see
CREATE POLICY "Supervisors manage maintenance"
  ON maintenance_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'supervisor'
      AND company_id = maintenance_orders.company_id
    )
  );

-- Inventory: Low stock items visible to all, movements to supervisors+
CREATE POLICY "View low stock items"
  ON inventory_items
  FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## 6. File Management

### Document Upload Flow

```
1. Client selects file (PDF, PNG, JPG, DOCX)
2. Frontend validates:
   - Size < 50MB
   - Type whitelisted
   - Virus scan (VirusTotal API - optional)
3. Client generates presigned S3/Blob URL
4. Direct browser upload to Vercel Blob
5. Callback creates database record
6. If PDF: Trigger OCR extraction (async job)
7. Full-text index created for search
```

### File Storage Strategy

**Vercel Blob:**
- All user uploads
- Auto-compression
- CDN-backed
- Retention policy: 7 years (regulatory)

**Local Temporary:**
- Generated PDFs (1 hour TTL)
- QR codes (cache, regenerate if needed)

---

## 7. Real-time Features

### WebSocket Implementation

**Connection Events:**
```typescript
// Status updates (maintenance orders, document approvals)
socket.on('order:status_changed', (data) => {
  // Update UI in real-time
});

// Inventory alerts (low stock)
socket.on('inventory:low_stock', (data) => {
  // Show toast notification
});

// User activity (who's viewing what)
socket.on('user:online', (data) => {
  // Show avatar + presence
});
```

**Broadcast Events:**
- Document approved/rejected
- Maintenance order status change
- Inventory movement completed
- System alerts

---

## 8. Search & Filtering

### Full-Text Search Implementation

```sql
-- Create search index
CREATE INDEX documents_search_idx ON documents 
USING GIN (to_tsvector('spanish', name || ' ' || description));

-- Query example
SELECT * FROM documents 
WHERE to_tsvector('spanish', name || ' ' || description) 
@@ plainto_tsquery('spanish', 'excavadora mantenimiento');
```

### Frontend Search UX

- Autocomplete (debounced)
- Filter by: date, status, category, owner
- Save search filters (user preferences)
- Advanced filters (power users)

---

## 9. Notifications & Alerts

### Notification Types

| Event | Channel | Recipient |
|-------|---------|-----------|
| Document ready for approval | Email + In-app | Approver |
| Work order assigned | SMS + In-app | Assigned person |
| Low stock alert | Email + Dashboard | Inventory manager |
| Maintenance completed | In-app | Supervisor |
| System maintenance | Email | All users |

### Notification Service

```typescript
// /server/services/notificationService.ts
export const notificationService = {
  async sendDocumentApprovalNeeded(documentId: string, approverId: string) {
    // 1. Create in-app notification record
    // 2. Send email with approval link
    // 3. Log audit trail
  },
  
  async sendLowStockAlert(itemId: string, companyId: string) {
    // 1. Create dashboard alert
    // 2. Email inventory manager
    // 3. Optional: SMS if critical
  }
};
```

---

## 10. Integrations (MVP Phase)

### Phase 1 (MVP)
- Email (SendGrid)
- PDF export (puppeteer)
- CSV/Excel export (xlsx library)

### Phase 2 (Post-MVP)
- Accounting software (SAP, NetSuite)
- CRM (Hubspot)
- IoT sensors (Sigfox, LoRaWAN)

---

## 11. Performance Requirements

### Frontend Performance

| Metric | Target | Tool |
|--------|--------|------|
| FCP (First Contentful Paint) | < 1.5s | Lighthouse |
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| TTI (Time to Interactive) | < 3s | Lighthouse |
| Overall Score | > 85 | Lighthouse |

### Backend Performance

- API response time: < 200ms (p95)
- Database query time: < 100ms (p95)
- PDF generation: < 5s
- Full-text search: < 500ms

### Database Performance

```sql
-- Query performance targets
SELECT * FROM documents WHERE company_id = ? AND status = ? 
-- Should return in < 50ms with 1M records

SELECT * FROM maintenance_orders WHERE asset_id = ? ORDER BY created_at DESC LIMIT 20
-- Should return in < 30ms

SELECT SUM(quantity) FROM inventory_movements 
WHERE item_id = ? AND moved_at > NOW() - INTERVAL '1 day'
-- Should return in < 20ms
```

---

## 12. Security Requirements

### Data Security

- [ ] Passwords hashed with bcrypt (cost: 12)
- [ ] TLS 1.3 for all connections
- [ ] Data at rest encrypted (Supabase)
- [ ] PII fields encrypted (email, phone)
- [ ] API keys rotated every 90 days

### API Security

- [ ] Rate limiting (100 req/min per user)
- [ ] CORS properly configured
- [ ] CSRF tokens on state-changing operations
- [ ] Input validation + sanitization (Zod)
- [ ] SQL injection prevention (Prisma parameterized)
- [ ] XSS prevention (React auto-escaping)

### Audit & Compliance

- [ ] Audit logs for all changes
- [ ] User activity logging
- [ ] 7-year data retention
- [ ] GDPR compliance (data export, deletion)
- [ ] SERNAGEOMIN compliance (for Chile)

### Infrastructure Security

- [ ] VPC isolation
- [ ] WAF (Cloudflare if needed)
- [ ] DDoS protection
- [ ] Regular security scans (Snyk)
- [ ] Dependency updates (Dependabot)

---

## 13. Deployment & DevOps

### Deployment Pipeline

```
1. Developer pushes to feature branch
2. Pre-commit hooks run (eslint, prettier, type-check)
3. PR created → GitHub Actions runs tests
4. Code review + approval
5. Merge to main branch
6. GitHub Actions:
   - Run full test suite
   - Build Next.js app
   - Run e2e tests on staging
   - Deploy to Vercel production
7. Post-deployment:
   - Smoke tests
   - Performance benchmarks
   - Error tracking check (Sentry)
```

### Environment Management

**Development**
- Local `.env.local`
- Local Supabase container
- Hot reload enabled

**Staging**
- Vercel preview deployments
- Staging Supabase instance
- Mirrored production data (anonymized)

**Production**
- Vercel production
- Supabase production
- Backups every 6 hours
- Point-in-time recovery (30 days)

### Monitoring & Alerting

**Metrics**
- Error rate (> 1% = alert)
- API latency (p95 > 500ms = alert)
- Database connections (> 80% = alert)
- Uptime (< 99.9% = alert)

**Tools**
- Sentry: Error tracking
- Datadog: Logs + metrics
- Vercel: Deployment status
- Statuspage.io: Public status page

---

## Development Phases

### Phase 0 (Weeks 1-2): Setup
- Repository setup
- Database schema creation
- Authentication flow
- API scaffolding
- Basic component library

### Phase 1 (Weeks 3-6): Core
- Master data CRUD
- User management + RBAC
- Audit logging
- File upload infrastructure

### Phase 2 (Weeks 7-12): Documents Module
- Document upload/versioning
- Approval workflows
- Search & filtering
- Export functionality

### Phase 3 (Weeks 13-18): Maintenance Module
- Work order management
- Asset tracking
- Scheduling
- KPI dashboards

### Phase 4 (Weeks 19-24): Inventory Module
- Item management
- Warehouse locations
- QR code integration
- Movement tracking

### Phase 5-6 (Weeks 25-30): Testing & QA
- Unit test coverage (80%+)
- E2E test coverage (75%+)
- Performance optimization
- Security assessment
- Production readiness

---

## Success Metrics

### Development Success
- 0 critical bugs in production
- 80%+ code coverage
- All modules fully functional
- < 3s page load time
- 99.9% uptime
- Zero data loss

### Post-Launch Success
- NPS > 50
- Churn < 5% annually
- Customer satisfaction > 4.2/5
- < 4 hour support response
- < 2% error rate

---

## Conclusion

Este MVP técnico detallado proporciona la hoja de ruta exacta para desarrollar n3uralia ERP mining como un sistema enterprise-grade, escalable y seguro en **6 meses** con énfasis particular en **testing exhaustivo y QA** en los Meses 5-6.

El stack tecnológico elegido (Next.js, Supabase, tRPC, Prisma) permite desarrollo rápido sin sacrificar calidad o seguridad, ideal para un MVP competitivo en mercado minero chileno.
