-- HSE Canonical Tables
-- Create the canonical schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS canonical;

-- HSE Roles (from ROLES-INTRANET.xlsx)
CREATE TABLE IF NOT EXISTS canonical.hse_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  role_name TEXT,
  role_code TEXT,
  department TEXT,
  manager TEXT,
  responsibilities TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- HSE Commitments (from Registro-Maestro-Compromisos-Ambientales.xlsx)
CREATE TABLE IF NOT EXISTS canonical.hse_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  commitment_code TEXT,
  commitment_description TEXT,
  status TEXT,
  responsible_party TEXT,
  target_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- HSE Facilities (from LISTADO-EECC.xlsx)
CREATE TABLE IF NOT EXISTS canonical.hse_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  facility_code TEXT,
  facility_name TEXT,
  location TEXT,
  facility_type TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hse_roles_org ON canonical.hse_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_hse_commitments_org ON canonical.hse_commitments(organization_id);
CREATE INDEX IF NOT EXISTS idx_hse_facilities_org ON canonical.hse_facilities(organization_id);
