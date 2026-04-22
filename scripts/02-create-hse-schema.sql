-- HSE MODULE - COMPLETE SCHEMA
-- Tables: normative_frameworks, normative_requirements, incidents, incident_investigations, 
-- corrective_actions, hse_inspections, risk_matrix, hse_alerts

-- 1. NORMATIVE FRAMEWORKS (Marcos Normativos)
CREATE TABLE IF NOT EXISTS normative_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- DS-132, Ley19.300, DS-148, etc
  name TEXT NOT NULL,
  jurisdiction TEXT, -- Chile, Codelco, etc
  category TEXT NOT NULL, -- Seguridad_Minera, Ambiental, Residuos, Relaves, Cierre
  description TEXT,
  effective_date DATE,
  status TEXT DEFAULT 'vigente', -- vigente, derogada, obsoleta
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. NORMATIVE REQUIREMENTS (Requisitos Específicos)
CREATE TABLE IF NOT EXISTS normative_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES normative_frameworks(id),
  req_number TEXT NOT NULL, -- DS-132-Art5, etc
  title TEXT NOT NULL,
  description TEXT,
  compliance_type TEXT NOT NULL, -- must_comply, should_comply, best_practice
  frequency TEXT, -- annual, quarterly, monthly, on_demand, one_time
  deadline DATE,
  assigned_to UUID,
  responsible_role TEXT, -- HSE Manager, Plant Manager, etc
  document_required BOOLEAN DEFAULT false,
  audit_required BOOLEAN DEFAULT false,
  training_required BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, compliant, non_compliant, expired
  compliance_evidence_id UUID,
  last_checked DATE,
  last_checked_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_normative_requirements_framework_id ON normative_requirements(framework_id);
CREATE INDEX idx_normative_requirements_deadline ON normative_requirements(deadline);

-- 3. INCIDENTS (Incidentes de Seguridad/Ambiental)
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT UNIQUE NOT NULL,
  date_occurred TIMESTAMP NOT NULL,
  date_reported TIMESTAMP NOT NULL,
  location TEXT NOT NULL, -- Plant, Area, coordinates
  equipment_id UUID REFERENCES equipment(id),
  incident_type TEXT NOT NULL, -- accidente, lesion, cuasi_accidente, derrame, contaminacion, otro
  severity TEXT NOT NULL, -- leve, medio, grave, critica
  description TEXT NOT NULL,
  people_involved INTEGER DEFAULT 1,
  injuries_count INTEGER DEFAULT 0,
  reported_by UUID NOT NULL,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'abierto', -- abierto, en_investigacion, cerrado
  investigation_status TEXT DEFAULT 'pendiente', -- pendiente, en_progreso, completada
  root_cause_identified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_incidents_date_occurred ON incidents(date_occurred DESC);
CREATE INDEX idx_incidents_status ON incidents(status);

-- 4. INCIDENT INVESTIGATIONS (Investigación de Incidentes - RCA)
CREATE TABLE IF NOT EXISTS incident_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  immediate_causes TEXT,
  underlying_causes TEXT, -- System, Process, People
  root_causes TEXT,
  contributing_factors TEXT,
  risk_rating NUMERIC, -- 1-5 scale
  investigation_date TIMESTAMP,
  investigated_by UUID,
  investigation_notes TEXT,
  documents_attached JSONB, -- Array of document IDs
  status TEXT DEFAULT 'borrador', -- borrador, revisado, aprobado
  approved_by UUID,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. CORRECTIVE ACTIONS (Acciones Correctivas)
CREATE TABLE IF NOT EXISTS corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id UUID NOT NULL REFERENCES incident_investigations(id),
  action_number TEXT UNIQUE NOT NULL,
  action_description TEXT NOT NULL,
  action_type TEXT, -- control, elimination, substitution, engineering, ppe
  target_risk_reduction NUMERIC, -- Expected % reduction (0-100)
  priority TEXT NOT NULL, -- baja, media, alta, critica
  assigned_to UUID NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'abierta', -- abierta, en_progreso, completada, vencida
  completion_date DATE,
  completion_evidence TEXT,
  effectiveness_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_corrective_actions_due_date ON corrective_actions(due_date);
CREATE INDEX idx_corrective_actions_status ON corrective_actions(status);

-- 6. HSE INSPECTIONS (Auditorías e Inspecciones)
CREATE TABLE IF NOT EXISTS hse_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number TEXT UNIQUE NOT NULL,
  inspection_type TEXT NOT NULL, -- auditoria_interna, externa, regulatoria, seguimiento
  scope TEXT NOT NULL, -- Plant, Area, Process
  scheduled_date DATE,
  actual_date TIMESTAMP,
  conducted_by UUID,
  conducted_by_role TEXT,
  findings_count INTEGER DEFAULT 0,
  findings_json JSONB, -- Array of findings
  conformities_count INTEGER,
  non_conformities_count INTEGER,
  observations_count INTEGER,
  overall_rating TEXT, -- satisfactory, satisfactory_with_minor, needs_improvement, unsatisfactory
  status TEXT NOT NULL DEFAULT 'programada', -- programada, en_progreso, completada
  report_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. RISK MATRIX (Matriz de Riesgos HSE)
CREATE TABLE IF NOT EXISTS risk_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_id TEXT NOT NULL,
  hazard_description TEXT NOT NULL,
  process_or_area TEXT,
  likelihood INTEGER NOT NULL, -- 1-5
  severity INTEGER NOT NULL, -- 1-5
  risk_level INTEGER NOT NULL, -- likelihood × severity
  current_controls TEXT,
  control_effectiveness INTEGER DEFAULT 50, -- 1-100%
  residual_risk_level INTEGER,
  risk_owner UUID,
  mitigation_plan TEXT,
  last_review_date DATE,
  next_review_date DATE,
  status TEXT DEFAULT 'activo', -- activo, mitigado, eliminado, aceptado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. HSE ALERTS (Alertas de Cumplimiento)
CREATE TABLE IF NOT EXISTS hse_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- requirement_expiring, inspection_overdue, action_overdue, training_due, incident_reported
  severity TEXT NOT NULL, -- info, warning, critical
  requirement_id UUID REFERENCES normative_requirements(id),
  incident_id UUID REFERENCES incidents(id),
  action_id UUID REFERENCES corrective_actions(id),
  days_until_due INTEGER,
  message TEXT,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'activa', -- activa, acknowledged, resolved
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hse_alerts_assigned_to ON hse_alerts(assigned_to);
CREATE INDEX idx_hse_alerts_status ON hse_alerts(status);

-- 9. EQUIPMENT-HSE LINKAGE (Link Equipment to HSE Requirements)
CREATE TABLE IF NOT EXISTS equipment_hse_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  requirement_id UUID NOT NULL REFERENCES normative_requirements(id),
  hazards TEXT,
  required_training TEXT,
  ppe_required TEXT,
  inspection_frequency TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE normative_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE normative_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hse_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE hse_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_hse_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for MVP)
CREATE POLICY "normative_frameworks_allow_all" ON normative_frameworks FOR ALL USING (true);
CREATE POLICY "normative_requirements_allow_all" ON normative_requirements FOR ALL USING (true);
CREATE POLICY "incidents_allow_all" ON incidents FOR ALL USING (true);
CREATE POLICY "incident_investigations_allow_all" ON incident_investigations FOR ALL USING (true);
CREATE POLICY "corrective_actions_allow_all" ON corrective_actions FOR ALL USING (true);
CREATE POLICY "hse_inspections_allow_all" ON hse_inspections FOR ALL USING (true);
CREATE POLICY "risk_matrix_allow_all" ON risk_matrix FOR ALL USING (true);
CREATE POLICY "hse_alerts_allow_all" ON hse_alerts FOR ALL USING (true);
CREATE POLICY "equipment_hse_requirements_allow_all" ON equipment_hse_requirements FOR ALL USING (true);
