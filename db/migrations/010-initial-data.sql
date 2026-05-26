-- QUICK START: Insert test organization and initial data
-- Run this after main schema initialization

-- 1. Create Test Organization
INSERT INTO organizations (name, slug, industry, country, timezone, status)
VALUES ('Demo Company', 'demo-company', 'mining', 'CL', 'America/Santiago', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Get the org ID for reference
-- SELECT id FROM organizations WHERE slug = 'demo-company';

-- 2. Create Department
INSERT INTO departments (organization_id, name, code, status)
SELECT id, 'Operations', 'OPS', 'active' FROM organizations WHERE slug = 'demo-company'
ON CONFLICT (organization_id, code) DO NOTHING;

-- 3. Create Position  
INSERT INTO positions (organization_id, name, code, status)
SELECT id, 'Safety Officer', 'SAFETY', 'active' FROM organizations WHERE slug = 'demo-company'
ON CONFLICT (organization_id, code) DO NOTHING;

-- 4. Create Cost Center
INSERT INTO cost_centers (organization_id, code, name, status)
SELECT id, 'CC-001', 'Operations Budget', 'active' FROM organizations WHERE slug = 'demo-company'
ON CONFLICT (organization_id, code) DO NOTHING;

-- 5. Create Sample Personnel (placeholder, will link to real users later)
INSERT INTO personnel (organization_id, rut, first_name, last_name, email, position_id, department_id, status, hire_date)
SELECT 
  o.id,
  '12345678-9',
  'Admin',
  'User',
  'admin@example.com',
  p.id,
  d.id,
  'active',
  CURRENT_DATE
FROM organizations o
CROSS JOIN departments d
CROSS JOIN positions p
WHERE o.slug = 'demo-company' AND d.code = 'OPS' AND p.code = 'SAFETY'
ON CONFLICT (organization_id, rut) DO NOTHING;

-- 6. Verify insertions
SELECT 
  'Organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Departments', COUNT(*) FROM departments
UNION ALL
SELECT 'Positions', COUNT(*) FROM positions
UNION ALL
SELECT 'Cost Centers', COUNT(*) FROM cost_centers
UNION ALL
SELECT 'Personnel', COUNT(*) FROM personnel
ORDER BY table_name;
