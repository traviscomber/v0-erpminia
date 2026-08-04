-- ========================================
-- BLOQUE C: Sostenibilidad Canonical Views
-- ========================================
-- Six canonical views for real-time sostenibilidad dashboards
-- These views read from imported HSE canonical data

-- 1. Risks Dashboard View (Matriz IPER)
CREATE OR REPLACE VIEW canonical.risks_dashboard AS
SELECT 
  r.id,
  r.organization_id,
  r.risk_code,
  r.process_area,
  r.task_activity,
  r.hazard,
  r.risk_description,
  r.consequence,
  r.existing_controls,
  r.likelihood,
  r.severity,
  r.risk_score,
  r.risk_level,
  r.residual_likelihood,
  r.residual_severity,
  r.residual_score,
  r.residual_level,
  r.responsible_person,
  r.review_date,
  r.status,
  CASE 
    WHEN r.risk_level = 'Crítico' THEN 'critical'
    WHEN r.risk_level = 'Alto' THEN 'high'
    WHEN r.risk_level = 'Medio' THEN 'medium'
    WHEN r.risk_level = 'Bajo' THEN 'low'
    ELSE 'unknown'
  END as severity_category,
  CASE 
    WHEN r.review_date < CURRENT_DATE THEN 'overdue'
    WHEN r.review_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
    ELSE 'current'
  END as review_status,
  sr.source_row,
  sr.source_sheet,
  sr.validation_status,
  r.created_at,
  r.updated_at
FROM canonical.hse_risks r
LEFT JOIN canonical.hse_source_rows sr ON r.source_row_id = sr.id
WHERE r.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
ORDER BY r.risk_score DESC NULLS LAST;

-- 2. Controls & Procedures View
CREATE OR REPLACE VIEW canonical.controls_dashboard AS
SELECT 
  c.id,
  c.organization_id,
  c.document_code,
  c.title,
  c.document_class,
  c.version_text,
  c.issue_date,
  c.last_review_date,
  c.next_review_date,
  c.status,
  c.responsible_person,
  c.responsible_area,
  c.evidence,
  CASE 
    WHEN c.next_review_date < CURRENT_DATE THEN 'overdue'
    WHEN c.next_review_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
    WHEN c.next_review_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'upcoming'
    ELSE 'current'
  END as expiry_status,
  CASE 
    WHEN c.document_class = 'procedure' THEN 'Procedimiento'
    WHEN c.document_class = 'regulation' THEN 'Reglamento'
    WHEN c.document_class = 'instruction' THEN 'Instructivo'
    ELSE c.document_class
  END as class_label,
  sr.validation_status,
  c.created_at,
  c.updated_at
FROM canonical.hse_document_controls c
LEFT JOIN canonical.hse_source_rows sr ON c.source_row_id = sr.id
WHERE c.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
ORDER BY c.next_review_date ASC NULLS LAST;

-- 3. Internal Driving Licenses View
CREATE OR REPLACE VIEW canonical.credentials_dashboard AS
SELECT 
  c.id,
  c.organization_id,
  c.person_name,
  c.person_rut,
  c.credential_type,
  c.credential_number,
  c.credential_class,
  c.authorized_assets,
  c.issue_date,
  c.expiry_date,
  c.status,
  c.issuer,
  CASE 
    WHEN c.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN c.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    WHEN c.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_upcoming'
    ELSE 'current'
  END as validity_status,
  c.created_at,
  c.updated_at
FROM canonical.hse_person_credentials c
WHERE c.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
ORDER BY c.expiry_date ASC;

-- 4. HSE Facilities Risk Profile View
CREATE OR REPLACE VIEW canonical.facilities_dashboard AS
SELECT 
  f.id,
  f.organization_id,
  f.code,
  f.name,
  f.location,
  f.type,
  f.risk_level,
  CASE 
    WHEN f.risk_level = 'Alto' THEN 'high'
    WHEN f.risk_level = 'Medio' THEN 'medium'
    WHEN f.risk_level = 'Bajo' THEN 'low'
    ELSE 'unknown'
  END as risk_category,
  (SELECT COUNT(*) FROM canonical.hse_risks WHERE process_area ILIKE f.name OR process_area ILIKE f.code) as associated_risks,
  f.created_at,
  f.updated_at
FROM public.hse_facilities f
WHERE f.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
ORDER BY f.risk_level DESC, f.name ASC;

-- 5. Environmental Commitments Compliance View
CREATE OR REPLACE VIEW canonical.commitments_dashboard AS
SELECT 
  c.id,
  c.organization_id,
  c.commitment_code,
  c.commitment_description,
  c.status,
  c.responsible_party,
  c.target_date,
  CASE 
    WHEN c.status = 'Completado' THEN 'completed'
    WHEN c.status = 'En Progreso' THEN 'in_progress'
    WHEN c.status = 'Pendiente' THEN 'pending'
    WHEN c.target_date < CURRENT_DATE THEN 'overdue'
    ELSE 'pending'
  END as compliance_status,
  CASE 
    WHEN c.target_date < CURRENT_DATE THEN 'overdue'
    WHEN c.target_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
    WHEN c.target_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'upcoming'
    ELSE 'future'
  END as deadline_status,
  c.created_at,
  c.updated_at
FROM public.hse_commitments c
WHERE c.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
ORDER BY c.target_date ASC;

-- 6. HSE Roles & Responsibilities View
CREATE OR REPLACE VIEW canonical.roles_dashboard AS
SELECT 
  r.id,
  r.organization_id,
  r.name,
  r.description,
  r.permissions,
  r.is_active,
  (SELECT COUNT(*) FROM public.hse_commitments WHERE responsible_party ILIKE r.name) as assigned_commitments,
  (SELECT COUNT(*) FROM canonical.hse_risks WHERE responsible_person ILIKE r.name) as assigned_risks,
  r.created_at,
  r.updated_at
FROM public.hse_roles r
WHERE r.organization_id = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'
ORDER BY r.name ASC;

-- Grant permissions to authenticated role
GRANT SELECT ON canonical.risks_dashboard TO authenticated;
GRANT SELECT ON canonical.controls_dashboard TO authenticated;
GRANT SELECT ON canonical.credentials_dashboard TO authenticated;
GRANT SELECT ON canonical.facilities_dashboard TO authenticated;
GRANT SELECT ON canonical.commitments_dashboard TO authenticated;
GRANT SELECT ON canonical.roles_dashboard TO authenticated;
