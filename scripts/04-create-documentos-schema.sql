-- Document Management Schema
-- Contracts, Subcontracts, Procurement Documents, Procedures

-- Contractors/Suppliers Table
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rut TEXT UNIQUE NOT NULL,
  business_type TEXT, -- 'supplier', 'contractor', 'subcontractor'
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'Chile',
  legal_representative TEXT,
  registration_status TEXT DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Main Contracts Table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT UNIQUE NOT NULL,
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  contract_type TEXT NOT NULL, -- 'supply', 'services', 'construction', 'maintenance'
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  contract_value DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  payment_terms TEXT,
  status TEXT DEFAULT 'active', -- 'draft', 'active', 'suspended', 'completed', 'terminated'
  execution_percentage DECIMAL(5,2),
  responsible_area TEXT,
  responsible_person TEXT,
  document_url TEXT,
  file_path TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subcontracts Table
CREATE TABLE IF NOT EXISTS subcontracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontract_number TEXT UNIQUE NOT NULL,
  parent_contract_id UUID NOT NULL REFERENCES contracts(id),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  subcontract_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  contract_value DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  status TEXT DEFAULT 'active',
  document_url TEXT,
  file_path TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contract Amendments/Modifications
CREATE TABLE IF NOT EXISTS contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  amendment_number INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  amendment_type TEXT, -- 'extension', 'value_change', 'scope_change', 'termination'
  old_value DECIMAL(15,2),
  new_value DECIMAL(15,2),
  old_end_date DATE,
  new_end_date DATE,
  amendment_date DATE NOT NULL,
  approval_status TEXT DEFAULT 'pending',
  document_url TEXT,
  file_path TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Procurement Documents
CREATE TABLE IF NOT EXISTS procurement_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL, -- 'quote', 'po', 'delivery_note', 'invoice', 'receipt'
  document_number TEXT UNIQUE NOT NULL,
  contract_id UUID REFERENCES contracts(id),
  contractor_id UUID NOT NULL REFERENCES contractors(id),
  issue_date DATE NOT NULL,
  due_date DATE,
  amount DECIMAL(15,2),
  currency TEXT DEFAULT 'CLP',
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
  document_url TEXT,
  file_path TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Approval Workflows
CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL, -- 'contract', 'subcontract', 'amendment', 'procurement'
  document_id UUID NOT NULL,
  approval_step INTEGER,
  approver_id UUID,
  approver_name TEXT,
  approval_date TIMESTAMP,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document Audit Trail
CREATE TABLE IF NOT EXISTS document_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'approved', 'rejected', 'signed'
  user_id UUID,
  user_name TEXT,
  changes JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id ON contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_subcontracts_parent_contract ON subcontracts(parent_contract_id);
CREATE INDEX IF NOT EXISTS idx_amendments_contract_id ON contract_amendments(contract_id);
CREATE INDEX IF NOT EXISTS idx_procurement_contract_id ON procurement_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_approvals_document_id ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_document_id ON document_audit_log(document_id);

-- Enable RLS
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow authenticated users)
CREATE POLICY "Enable read for authenticated users" ON contractors
  FOR SELECT USING (auth.role() = 'authenticated_user');
CREATE POLICY "Enable insert for authenticated users" ON contractors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');
CREATE POLICY "Enable update for authenticated users" ON contractors
  FOR UPDATE USING (auth.role() = 'authenticated_user');

CREATE POLICY "Enable read for authenticated users" ON contracts
  FOR SELECT USING (auth.role() = 'authenticated_user');
CREATE POLICY "Enable insert for authenticated users" ON contracts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');
CREATE POLICY "Enable update for authenticated users" ON contracts
  FOR UPDATE USING (auth.role() = 'authenticated_user');

CREATE POLICY "Enable read for authenticated users" ON subcontracts
  FOR SELECT USING (auth.role() = 'authenticated_user');
CREATE POLICY "Enable insert for authenticated users" ON subcontracts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');
CREATE POLICY "Enable update for authenticated users" ON subcontracts
  FOR UPDATE USING (auth.role() = 'authenticated_user');
