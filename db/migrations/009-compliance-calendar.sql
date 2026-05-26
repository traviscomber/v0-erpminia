-- Compliance Calendar & Audit Checklists

CREATE TABLE compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text DEFAULT 'default',
  event_type text CHECK (event_type IN ('inspection', 'report', 'renewal', 'audit', 'training')),
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  frequency text CHECK (frequency IN ('one_time', 'monthly', 'quarterly', 'annual')),
  next_date date,
  status text CHECK (status IN ('pending', 'completed', 'overdue')),
  responsible_person_id uuid,
  related_documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE compliance_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text DEFAULT 'default',
  checklist_type text CHECK (checklist_type IN ('iso_45001', 'iso_14001', 'sernageomin')),
  title text NOT NULL,
  description text,
  version int DEFAULT 1,
  status text CHECK (status IN ('draft', 'active', 'archived')),
  created_by uuid,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid REFERENCES compliance_checklists(id) ON DELETE CASCADE,
  section text,
  question_number text,
  question text NOT NULL,
  required boolean DEFAULT true,
  order_index int,
  created_at timestamp DEFAULT now()
);

CREATE TABLE audit_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text DEFAULT 'default',
  checklist_id uuid REFERENCES compliance_checklists(id),
  audit_date date NOT NULL,
  auditor_id uuid,
  status text CHECK (status IN ('in_progress', 'completed', 'awaiting_review', 'approved')),
  score int CHECK (score >= 0 AND score <= 100),
  findings int DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE audit_item_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_response_id uuid REFERENCES audit_responses(id) ON DELETE CASCADE,
  checklist_item_id uuid REFERENCES checklist_items(id),
  response text CHECK (response IN ('compliant', 'non_compliant', 'partial', 'n_a')),
  comments text,
  evidence_url text,
  create_nc_if_fail boolean DEFAULT false,
  created_nc_id uuid,
  answered_at timestamp DEFAULT now()
);

-- RLS
ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_item_responses ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_compliance_events_org ON compliance_events(org_id);
CREATE INDEX idx_compliance_events_due_date ON compliance_events(due_date);
CREATE INDEX idx_compliance_events_status ON compliance_events(status);
CREATE INDEX idx_checklists_org ON compliance_checklists(org_id);
CREATE INDEX idx_audit_responses_org ON audit_responses(org_id);
CREATE INDEX idx_audit_responses_date ON audit_responses(audit_date);
