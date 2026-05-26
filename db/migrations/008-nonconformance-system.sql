-- FASE 3: Non-Conformance Management System
-- 5 core tables + RLS policies + indexes

CREATE TABLE IF NOT EXISTS nonconformances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nc_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('open', 'under_review', 'corrected', 'closed', 're_opened')) DEFAULT 'open',
  detection_date DATE NOT NULL,
  due_date DATE NOT NULL,
  identified_by UUID NOT NULL REFERENCES auth.users(id),
  related_process TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nonconformance_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonconformance_id UUID NOT NULL REFERENCES nonconformances(id) ON DELETE CASCADE,
  root_cause TEXT,
  affected_area TEXT,
  impact_level TEXT CHECK (impact_level IN ('personnel', 'environment', 'production')),
  regulatory_standard TEXT,
  legal_requirement BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonconformance_id UUID NOT NULL REFERENCES nonconformances(id) ON DELETE CASCADE,
  action_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  responsible_person_id UUID REFERENCES auth.users(id),
  target_completion_date DATE NOT NULL,
  status TEXT CHECK (status IN ('planned', 'in_progress', 'completed', 'verified', 'on_hold')) DEFAULT 'planned',
  completion_date DATE,
  verification_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corrective_action_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
  update_date DATE DEFAULT NOW(),
  status TEXT,
  completion_percentage INTEGER CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  comments TEXT,
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nonconformance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonconformance_id UUID NOT NULL REFERENCES nonconformances(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('evidence', 'root_cause_analysis', 'verification')),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE nonconformances ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonconformance_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_action_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nonconformance_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nonconformances_org_access" ON nonconformances
  FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "nonconformance_details_access" ON nonconformance_details
  FOR ALL USING (
    nonconformance_id IN (
      SELECT id FROM nonconformances 
      WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "corrective_actions_access" ON corrective_actions
  FOR ALL USING (
    nonconformance_id IN (
      SELECT id FROM nonconformances 
      WHERE organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())
    )
  );

-- INDEXES
CREATE INDEX idx_nonconformances_org ON nonconformances(organization_id);
CREATE INDEX idx_nonconformances_status ON nonconformances(status);
CREATE INDEX idx_nonconformances_due_date ON nonconformances(due_date);
CREATE INDEX idx_nonconformances_severity ON nonconformances(severity);
CREATE INDEX idx_corrective_actions_nc ON corrective_actions(nonconformance_id);
CREATE INDEX idx_corrective_actions_status ON corrective_actions(status);
