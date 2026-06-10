# LEGAL DOCUMENTS MASTER PLAN - MOTIL ERP MVP

**Status:** PLANNING  
**Date:** June 10, 2026  
**Scope:** Centralized legal document management with versioning, expiration tracking, and 2-level review workflow

---

## 1. ARCHITECTURE OVERVIEW

### Document Lifecycle
```
1. Upload → 2. Dennyse Review (Nivel 1) → 3. Javier/Gonzalo Approval (Nivel 2) → 4. Active
   ↓         ↓ Reject/Observe          ↓ Reject/Observe                      ↓ Monitor Expiry
   Draft     Pending                   Pending                               Expiring Soon → Renew
```

### Storage Structure (Supabase Storage)
```
documents/
├── modulo-prevencion/
│   ├── arranque/
│   │   ├── Certificado_Afiliacion_v1.pdf
│   │   ├── Accidentabilidad_v1.xlsx
│   │   └── ... (19 docs)
│   └── otros/
│       ├── Doc_Especifico_v1.docx
│       └── ...
├── modulo-mantenimiento/
│   ├── procedimientos/
│   └── ... 
├── modulo-finanzas/
├── modulo-hse/
└── modulo-bodega/
```

---

## 2. DATABASE SCHEMA

### Table: `legal_documents`
```sql
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY,
  module TEXT NOT NULL, -- 'prevencion', 'mantenimiento', 'finanzas', 'hse', 'bodega'
  document_type TEXT NOT NULL, -- 'arranque', 'procedimiento', 'certificado', etc.
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_url TEXT,
  version INT DEFAULT 1,
  status TEXT DEFAULT 'draft', -- draft, pending_l1, pending_l2, approved, rejected, expiring, expired
  valid_from TIMESTAMP,
  valid_until TIMESTAMP, -- NULL = indefinite
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP,
  rejection_reason TEXT, -- If rejected
  UNIQUE(module, document_type, version)
);
```

### Table: `legal_document_reviews`
```sql
CREATE TABLE legal_document_reviews (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES legal_documents,
  reviewer_id UUID REFERENCES auth.users,
  review_level INT, -- 1 or 2
  status TEXT, -- 'approved', 'rejected', 'pending'
  observations TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
```

### Table: `legal_document_history`
```sql
CREATE TABLE legal_document_history (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES legal_documents,
  action TEXT, -- 'uploaded', 'reviewed', 'approved', 'rejected', 'expired', 'renewed'
  performed_by UUID REFERENCES auth.users,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

### Table: `legal_document_assignments`
```sql
CREATE TABLE legal_document_assignments (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES legal_documents,
  assigned_to_user_id UUID REFERENCES auth.users,
  assigned_by_user_id UUID REFERENCES auth.users,
  assignment_type TEXT, -- 'review_l1', 'review_l2', 'acknowledge'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'acknowledged'
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 3. UI/UX STRUCTURE

### Dashboard Legal (Central Hub)
**Route:** `/dashboard/legal-documents`

**Sections:**
1. **Quick Stats**
   - Total docs by module
   - Pending reviews (L1 & L2)
   - Expiring soon (next 30 days)
   - Expired docs

2. **Tabs by Module**
   - Prevención (19 arranque + otros)
   - Mantenimiento
   - Finanzas
   - HSE
   - Bodega

3. **Filter/Search**
   - By module
   - By status (Draft, Pending L1, Pending L2, Approved, Expired)
   - By expiration date
   - By reviewer

4. **Actions**
   - View document
   - Download (PDF preview)
   - Review/Approve (L1 & L2)
   - Upload new version
   - Extend validity

### Module-Specific Pages
**Route:** `/dashboard/[module]/documentos-legales`

**Shows:**
- Documents specific to that module
- Upload new legal doc
- View approval status
- Document history

---

## 4. REVIEW WORKFLOW

### Level 1 Review (Dennyse)
- [ ] Reviews content
- [ ] Checks compliance
- [ ] Either: Approve → Send to L2
- [ ] Or: Reject with observations

### Level 2 Review (Javier/Gonzalo)
- [ ] Final approval
- [ ] Can request changes back to L1
- [ ] If approved: Sets validity date + publishes

### Expiration Management
- [ ] 30 days before expiry: Yellow warning
- [ ] On expiry: Document marked as "Expired"
- [ ] Upload new version: Creates v2, same document_type

---

## 5. IMPLEMENTATION PHASES

### Phase 1: Database & API (Days 1-2)
- [ ] Create SQL tables (4 tables)
- [ ] RLS policies
- [ ] Document upload API endpoint
- [ ] Create Supabase bucket `legal-documents`

### Phase 2: Legal Dashboard (Days 3-4)
- [ ] Main dashboard component
- [ ] Module tabs
- [ ] Status filters
- [ ] Document list with search

### Phase 3: Review Workflow (Days 5-6)
- [ ] Dennyse review interface (L1)
- [ ] Javier/Gonzalo approval (L2)
- [ ] Rejection dialog with observations
- [ ] Status tracking

### Phase 4: Module Integration (Days 7-8)
- [ ] Add "Documentos Legales" section to each module
- [ ] Link to legal dashboard
- [ ] Show module-specific docs

### Phase 5: Expiration Management (Days 9-10)
- [ ] Expiry alerts (30, 15, 7 days before)
- [ ] Expired docs dashboard
- [ ] Version renewal workflow
- [ ] Email notifications

### Phase 6: Notifications & Reporting (Days 11-12)
- [ ] Email alerts for reviewers
- [ ] Dashboard notifications
- [ ] Compliance reports
- [ ] Audit trail

---

## 6. FILE ORGANIZATION STRATEGY

### For the ~80 documents you have:

**Step 1: Categorize by module**
```
Prevención/
├── Arranque/
│   ├── Certificado_Afiliacion.pdf
│   ├── Accidentabilidad.xlsx
│   └── ... (19 docs)
└── Otros/

Mantenimiento/
├── Procedimientos/
├── Equipos/
└── ...

Finanzas/
Bodega/
HSE/
```

**Step 2: Naming Convention**
```
{DocumentType}_{Version}_{DateAdded}.{ext}

Examples:
- Certificado_Afiliacion_v1_2026-06-10.pdf
- Reglamento_Interno_v2_2026-06-15.docx
- MIPER_v1_2026-06-10.xlsx
```

**Step 3: Metadata for each doc**
```json
{
  "module": "prevencion",
  "document_type": "certificado_afiliacion",
  "version": 1,
  "valid_from": "2026-06-10",
  "valid_until": "2027-06-10",
  "file_format": "pdf",
  "size_mb": 2.5,
  "uploaded_by": "juan@n3uralia.com"
}
```

---

## 7. IMPLEMENTATION CHECKLIST

### Before Starting
- [ ] Confirm all modules that need legal docs
- [ ] List all document types per module
- [ ] Confirm renewal periods (1 year? 6 months?)
- [ ] Confirm Supabase bucket name
- [ ] Confirm reviewer emails (Dennyse, Javier, Gonzalo)

### Database
- [ ] Run SQL migration
- [ ] Verify RLS policies
- [ ] Create bucket in Supabase Storage
- [ ] Set bucket privacy (Private)

### API
- [ ] Upload endpoint working
- [ ] File validation (type, size)
- [ ] Database record creation
- [ ] Public URL generation

### UI Components
- [ ] Dashboard Legal component
- [ ] Document list component
- [ ] Review dialog component
- [ ] Upload form component
- [ ] Expiry alerts component

### Integration
- [ ] Add tab to each module
- [ ] Link to Legal Dashboard
- [ ] Show review status in module
- [ ] Display expiry warnings

### Testing
- [ ] Upload PDF, Word, Excel
- [ ] Test L1 review (Dennyse)
- [ ] Test L2 approval (Javier/Gonzalo)
- [ ] Test rejection workflow
- [ ] Test expiry alerts
- [ ] Test version renewal

---

## 8. NEXT STEPS

**When you provide the documents:**

1. **Organize by module** (Prevención, Mantenimiento, etc.)
2. **List document types** in each category
3. **Specify renewal periods** (valid_until dates)
4. **Provide reviewer info** (emails/usernames)
5. **Ready to build:**
   - SQL migration
   - Upload interface
   - Review dashboard
   - Legal dashboard

---

## Questions to Clarify

1. **How many modules have legal documents?** (All 6 or specific ones?)
2. **What's the typical validity period?** (1 year, 2 years, 6 months?)
3. **Do you have Dennyse, Javier, Gonzalo as users in the system?**
4. **Can you categorize your ~80 documents by module?**
5. **Do you want to start with Prevención or all modules at once?**

---

*Ready to build when you confirm the structure and provide the documents.*
