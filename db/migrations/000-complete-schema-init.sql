-- COMPLETE DATABASE SCHEMA INITIALIZATION
-- This script creates all necessary tables for the application

-- ════════════════════════════════════════════════════════════════════════════════
-- VERIFY CORE TABLES EXISTS (If not created by previous migrations)
-- ════════════════════════════════════════════════════════════════════════════════

-- Organizations (Multi-Tenant)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT DEFAULT 'mining',
  country TEXT DEFAULT 'CL',
  timezone TEXT DEFAULT 'America/Santiago',
  logo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- Profiles (Extended User Info)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'viewer',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Roles (RBAC)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, organization_id, role)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- MAESTROS TABLES (Reference Data)
-- ════════════════════════════════════════════════════════════════════════════════

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES auth.users(id),
  budget_annual NUMERIC(15,2),
  budget_used NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Positions/Roles
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  salary_level NUMERIC(15,2),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- Personnel/Employees
CREATE TABLE IF NOT EXISTS personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rut TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  hire_date DATE,
  status TEXT DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, rut)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- SUSTAINABILITY NONCONFORMANCE SYSTEM (Already exists, but ensure)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sostenibilidad_nonconformances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    nc_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    source TEXT,
    discovered_date DATE NOT NULL,
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'open',
    root_cause TEXT,
    impact_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    target_closure_date DATE,
    actual_closure_date DATE,
    UNIQUE(organization_id, nc_number)
);

CREATE TABLE IF NOT EXISTS sostenibilidad_nc_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nc_id UUID NOT NULL REFERENCES sostenibilidad_nonconformances(id) ON DELETE CASCADE,
    detail_type TEXT,
    file_url TEXT,
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sostenibilidad_corrective_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nc_id UUID NOT NULL REFERENCES sostenibilidad_nonconformances(id) ON DELETE CASCADE,
    ca_number TEXT NOT NULL,
    action_description TEXT NOT NULL,
    responsible_person UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scheduled_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    status TEXT DEFAULT 'planned',
    verification_method TEXT,
    estimated_cost NUMERIC,
    actual_cost NUMERIC,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(nc_id, ca_number)
);

CREATE TABLE IF NOT EXISTS sostenibilidad_ca_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ca_id UUID NOT NULL REFERENCES sostenibilidad_corrective_actions(id) ON DELETE CASCADE,
    update_type TEXT,
    status TEXT NOT NULL,
    comments TEXT,
    percentage_complete INTEGER,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    attachment_url TEXT
);

CREATE TABLE IF NOT EXISTS sostenibilidad_compliance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_period TEXT NOT NULL,
    total_ncs INTEGER,
    open_ncs INTEGER,
    closed_ncs INTEGER,
    overdue_cas INTEGER,
    compliance_score NUMERIC,
    trend TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, report_period)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- ENABLE ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE sostenibilidad_nonconformances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sostenibilidad_nc_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE sostenibilidad_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sostenibilidad_ca_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sostenibilidad_compliance_history ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES - Multi-Tenant Isolation
-- ════════════════════════════════════════════════════════════════════════════════

-- Organizations: Users can only see their org
DROP POLICY IF EXISTS "Users can read own org" ON organizations;
CREATE POLICY "Users can read own org" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Profiles: Users can read their own and org members
DROP POLICY IF EXISTS "Profiles read policy" ON profiles;
CREATE POLICY "Profiles read policy" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR 
    organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Cost Centers: Read if in org
DROP POLICY IF EXISTS "Cost centers read policy" ON cost_centers;
CREATE POLICY "Cost centers read policy" ON cost_centers
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Departments: Read if in org
DROP POLICY IF EXISTS "Departments read policy" ON departments;
CREATE POLICY "Departments read policy" ON departments
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Positions: Read if in org
DROP POLICY IF EXISTS "Positions read policy" ON positions;
CREATE POLICY "Positions read policy" ON positions
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Personnel: Read if in org
DROP POLICY IF EXISTS "Personnel read policy" ON personnel;
CREATE POLICY "Personnel read policy" ON personnel
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  );

-- NC: Read if in org
DROP POLICY IF EXISTS "NC read policy" ON sostenibilidad_nonconformances;
CREATE POLICY "NC read policy" ON sostenibilidad_nonconformances
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  );

-- NC Details: Read if NC belongs to org
DROP POLICY IF EXISTS "NC details read policy" ON sostenibilidad_nc_details;
CREATE POLICY "NC details read policy" ON sostenibilidad_nc_details
  FOR SELECT USING (
    nc_id IN (
      SELECT id FROM sostenibilidad_nonconformances 
      WHERE organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

-- Corrective Actions: Read if NC belongs to org
DROP POLICY IF EXISTS "CA read policy" ON sostenibilidad_corrective_actions;
CREATE POLICY "CA read policy" ON sostenibilidad_corrective_actions
  FOR SELECT USING (
    nc_id IN (
      SELECT id FROM sostenibilidad_nonconformances 
      WHERE organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

-- CA Updates: Read if CA belongs to NC in org
DROP POLICY IF EXISTS "CA updates read policy" ON sostenibilidad_ca_updates;
CREATE POLICY "CA updates read policy" ON sostenibilidad_ca_updates
  FOR SELECT USING (
    ca_id IN (
      SELECT ca.id FROM sostenibilidad_corrective_actions ca
      INNER JOIN sostenibilidad_nonconformances nc ON ca.nc_id = nc.id
      WHERE nc.organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
    )
  );

-- Compliance History: Read if in org
DROP POLICY IF EXISTS "Compliance history read policy" ON sostenibilidad_compliance_history;
CREATE POLICY "Compliance history read policy" ON sostenibilidad_compliance_history
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON cost_centers(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_positions_org ON positions(organization_id);
CREATE INDEX IF NOT EXISTS idx_personnel_org ON personnel(organization_id);
CREATE INDEX IF NOT EXISTS idx_personnel_rut ON personnel(rut);
CREATE INDEX IF NOT EXISTS idx_nc_org ON sostenibilidad_nonconformances(organization_id);
CREATE INDEX IF NOT EXISTS idx_nc_status ON sostenibilidad_nonconformances(status);
CREATE INDEX IF NOT EXISTS idx_nc_severity ON sostenibilidad_nonconformances(severity);
CREATE INDEX IF NOT EXISTS idx_nc_number ON sostenibilidad_nonconformances(nc_number);
CREATE INDEX IF NOT EXISTS idx_ca_status ON sostenibilidad_corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_ca_date ON sostenibilidad_corrective_actions(scheduled_completion_date);
