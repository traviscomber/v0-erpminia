-- FASE 2: SISTEMA DE DOCUMENTOS
-- Tablas maestras para gestión de documentos con SERNAGEOMIN compliance

-- 1. DOCUMENT TEMPLATES (plantillas de documentos)
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,  -- 'safety', 'compliance', 'operational', 'regulatory'
    document_type TEXT NOT NULL,  -- 'permit', 'certificate', 'plan', 'report'
    schema JSONB DEFAULT '{}'::jsonb,  -- JSON schema para validación
    required_approvers INTEGER DEFAULT 2,  -- 1, 2, o 3 niveles
    expiry_days INTEGER,  -- null = no expiry
    sernageomin_requirement BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 2. DOCUMENTS (documentos)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
    document_number TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,  -- inherit from template
    document_type TEXT NOT NULL,
    status TEXT DEFAULT 'draft',  -- draft, submitted, under_review, approved, rejected, expired
    priority TEXT DEFAULT 'normal',  -- normal, high, critical
    version INTEGER DEFAULT 1,
    current_file_url TEXT,
    current_file_path TEXT,
    file_size_mb NUMERIC,
    file_mime_type TEXT,
    
    -- Compliance & Dates
    effective_date DATE,
    expiry_date DATE,
    days_until_expiry INTEGER,
    expired BOOLEAN DEFAULT FALSE,
    sernageomin_requirement BOOLEAN DEFAULT FALSE,
    
    -- Tracking
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Search & indexing
    search_text TEXT,  -- denormalized for FTS
    CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired')),
    CONSTRAINT valid_priority CHECK (priority IN ('normal', 'high', 'critical'))
);

-- 3. DOCUMENT VERSIONS (versionado)
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_mb NUMERIC,
    file_mime_type TEXT,
    change_notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

-- 4. DOCUMENT APPROVALS (workflow de aprobaciones - 3 niveles)
CREATE TABLE IF NOT EXISTS document_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    approval_level INTEGER NOT NULL DEFAULT 1,  -- 1 (reviewer), 2 (validator), 3 (approver)
    approval_level_name TEXT,  -- 'Reviewer', 'Validator', 'Final Approver'
    required_role TEXT,  -- 'reviewer', 'validator', 'approver'
    status TEXT DEFAULT 'pending',  -- pending, approved, rejected, skipped
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    comments TEXT,
    rejection_reason TEXT,
    approved_at TIMESTAMP,
    submitted_for_review_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_approval_status CHECK (status IN ('pending', 'approved', 'rejected', 'skipped'))
);

-- 5. DOCUMENT SEARCH INDEX (para full-text search)
CREATE TABLE IF NOT EXISTS document_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    document_number TEXT,
    created_by_name TEXT,
    document_type TEXT,
    category TEXT,
    search_vector TSVECTOR,  -- PostgreSQL full-text search vector
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id)
);

-- 6. SERNAGEOMIN REQUIREMENTS MAPPING
CREATE TABLE IF NOT EXISTS sernageomin_document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    normative_requirement_id UUID REFERENCES normative_requirements(id) ON DELETE SET NULL,
    required_document_type TEXT NOT NULL,
    document_template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
    is_required BOOLEAN DEFAULT TRUE,
    max_expiry_days INTEGER,
    renewal_before_expiry_days INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. DOCUMENT COMPLIANCE CHECKLIST
CREATE TABLE IF NOT EXISTS document_compliance_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES sernageomin_document_requirements(id) ON DELETE SET NULL,
    requirement_description TEXT NOT NULL,
    is_compliant BOOLEAN,
    validation_notes TEXT,
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. DOCUMENT DIGITAL SIGNATURES (estructura para firmas digitales)
CREATE TABLE IF NOT EXISTS document_digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    signed_by_name TEXT,
    signature_certificate TEXT,  -- PEM-encoded certificate
    signature_value TEXT,  -- Base64-encoded signature
    signing_timestamp TIMESTAMP,
    certificate_validity_start DATE,
    certificate_validity_end DATE,
    signature_valid BOOLEAN,
    validation_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. DOCUMENT EXPIRY ALERTS
CREATE TABLE IF NOT EXISTS document_expiry_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    alert_type TEXT DEFAULT 'expiry_approaching',  -- expiry_approaching, expired
    days_until_expiry INTEGER,
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMP,
    alert_recipients JSONB DEFAULT '[]'::jsonb,  -- array of email addresses
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_alert_type CHECK (alert_type IN ('expiry_approaching', 'expired'))
);

-- RLS POLICIES
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see documents from their organization
CREATE POLICY documents_org_isolation ON documents
    USING (organization_id IN (
        SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ));

CREATE POLICY document_versions_org_isolation ON document_versions
    USING (document_id IN (
        SELECT id FROM documents WHERE organization_id IN (
            SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY document_approvals_org_isolation ON document_approvals
    USING (document_id IN (
        SELECT id FROM documents WHERE organization_id IN (
            SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY document_templates_org_isolation ON document_templates
    USING (organization_id IN (
        SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    ));

-- INDEXES for performance
CREATE INDEX idx_documents_organization_id ON documents(organization_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_template_id ON documents(template_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_approvals_document_id ON document_approvals(document_id);
CREATE INDEX idx_document_approvals_assigned_to ON document_approvals(assigned_to);
CREATE INDEX idx_document_approvals_status ON document_approvals(status);
CREATE INDEX idx_document_expiry_alerts_document_id ON document_expiry_alerts(document_id);
CREATE INDEX idx_document_expiry_alerts_alert_type ON document_expiry_alerts(alert_type);
CREATE INDEX idx_document_search_vector ON document_search_index USING GIN(search_vector);

-- AUDIT TRIGGERS (automáticamente loguea cambios)
CREATE TRIGGER audit_documents_changes
AFTER INSERT OR UPDATE OR DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION log_document_change();

CREATE TRIGGER audit_approvals_changes
AFTER INSERT OR UPDATE OR DELETE ON document_approvals
FOR EACH ROW
EXECUTE FUNCTION log_approval_change();

