-- SOSTENIBILIDAD PHASE 3: NON-CONFORMANCE MANAGEMENT
-- Non-conformances, corrective actions, compliance tracking

-- 1. NON-CONFORMANCE MASTER TABLE
CREATE TABLE IF NOT EXISTS sostenibilidad_nonconformances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    nc_number TEXT NOT NULL,  -- Auto-generated: NC-{org}-{year}-{seq}
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,  -- safety, environmental, health, documentation, training
    severity TEXT NOT NULL,  -- critical, high, medium, low
    source TEXT,  -- internal_audit, external_audit, incident, regulatory, customer
    discovered_date DATE NOT NULL,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'open',  -- open, in_progress, closed, cancelled
    root_cause TEXT,
    impact_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    target_closure_date DATE,
    actual_closure_date DATE,
    UNIQUE(organization_id, nc_number)
);

-- 2. NON-CONFORMANCE DETAILS (Photos, attachments, evidence)
CREATE TABLE IF NOT EXISTS sostenibilidad_nc_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nc_id UUID NOT NULL REFERENCES sostenibilidad_nonconformances(id) ON DELETE CASCADE,
    detail_type TEXT,  -- photo, document, measurement, observation
    file_url TEXT,  -- Vercel Blob URL
    description TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 3. CORRECTIVE ACTION PLANS
CREATE TABLE IF NOT EXISTS sostenibilidad_corrective_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nc_id UUID NOT NULL REFERENCES sostenibilidad_nonconformances(id) ON DELETE CASCADE,
    ca_number TEXT NOT NULL,  -- Auto-generated: CA-{nc_number}-{seq}
    action_description TEXT NOT NULL,
    responsible_person UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    status TEXT DEFAULT 'planned',  -- planned, in_progress, completed, verified, closed
    verification_method TEXT,  -- inspection, measurement, audit, documentation
    estimated_cost NUMERIC,
    actual_cost NUMERIC,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(nc_id, ca_number)
);

-- 4. CORRECTIVE ACTION UPDATES (Progress tracking)
CREATE TABLE IF NOT EXISTS sostenibilidad_ca_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ca_id UUID NOT NULL REFERENCES sostenibilidad_corrective_actions(id) ON DELETE CASCADE,
    update_type TEXT,  -- progress, delay, completion, verification
    status TEXT NOT NULL,  -- on_track, at_risk, delayed, completed
    comments TEXT,
    percentage_complete INTEGER,  -- 0-100
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    attachment_url TEXT  -- Optional file attachment
);

-- 5. COMPLIANCE HISTORY (For reporting)
CREATE TABLE IF NOT EXISTS sostenibilidad_compliance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_period TEXT NOT NULL,  -- YYYY-MM format
    total_ncs INTEGER,
    open_ncs INTEGER,
    closed_ncs INTEGER,
    overdue_cas INTEGER,
    compliance_score NUMERIC,  -- 0-100
    trend TEXT,  -- improving, stable, declining
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, report_period)
);

-- RLS POLICIES
ALTER TABLE sostenibilidad_nonconformances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sostenibilidad_nc_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE sostenibilidad_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sostenibilidad_ca_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sostenibilidad_compliance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY sostenibilidad_nc_org ON sostenibilidad_nonconformances
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY sostenibilidad_nc_details_org ON sostenibilidad_nc_details
    USING (nc_id IN (SELECT id FROM sostenibilidad_nonconformances WHERE organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())));

CREATE POLICY sostenibilidad_ca_org ON sostenibilidad_corrective_actions
    USING (nc_id IN (SELECT id FROM sostenibilidad_nonconformances WHERE organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())));

CREATE POLICY sostenibilidad_ca_updates_org ON sostenibilidad_ca_updates
    USING (ca_id IN (SELECT id FROM sostenibilidad_corrective_actions WHERE nc_id IN (SELECT id FROM sostenibilidad_nonconformances WHERE organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()))));

CREATE POLICY sostenibilidad_compliance_history_org ON sostenibilidad_compliance_history
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));

-- INDEXES
CREATE INDEX idx_sostenibilidad_nc_org ON sostenibilidad_nonconformances(organization_id);
CREATE INDEX idx_sostenibilidad_nc_status ON sostenibilidad_nonconformances(status);
CREATE INDEX idx_sostenibilidad_nc_severity ON sostenibilidad_nonconformances(severity);
CREATE INDEX idx_sostenibilidad_nc_assigned ON sostenibilidad_nonconformances(assigned_to);
CREATE INDEX idx_sostenibilidad_ca_status ON sostenibilidad_corrective_actions(status);
CREATE INDEX idx_sostenibilidad_ca_date ON sostenibilidad_corrective_actions(scheduled_completion_date);
CREATE INDEX idx_sostenibilidad_compliance_period ON sostenibilidad_compliance_history(report_period);

