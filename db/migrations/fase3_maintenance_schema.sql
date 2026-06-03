-- FASE 3: SISTEMA DE MANTENIMIENTO
-- Work Orders, Preventive Maintenance, Asset Tracking, MTTR

-- 1. ASSETS/EQUIPMENT
CREATE TABLE IF NOT EXISTS maintenance_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_code TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_type TEXT,  -- pump, motor, conveyor, excavator, etc
    location TEXT,
    status TEXT DEFAULT 'active',  -- active, inactive, maintenance, decommissioned
    acquisition_date DATE,
    acquisition_cost NUMERIC,
    expected_lifespan_years INTEGER,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    criticality TEXT DEFAULT 'medium',  -- low, medium, high, critical
    mtbf_hours NUMERIC,  -- Mean Time Between Failures
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, asset_code)
);

-- 2. WORK ORDERS
CREATE TABLE IF NOT EXISTS maintenance_work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    work_order_number TEXT NOT NULL,
    asset_id UUID REFERENCES maintenance_assets(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    work_type TEXT,  -- corrective, preventive, predictive
    status TEXT DEFAULT 'open',  -- open, in_progress, completed, cancelled
    priority TEXT DEFAULT 'medium',  -- low, medium, high, critical
    
    -- Dates & Duration
    scheduled_date DATE,
    start_date TIMESTAMP,
    completion_date TIMESTAMP,
    planned_duration_hours NUMERIC,
    actual_duration_hours NUMERIC,
    down_time_hours NUMERIC,
    
    -- Assignment & Execution
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to_name TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- MTTR Tracking (Mean Time To Repair)
    mttr_deviation NUMERIC,  -- actual - planned
    root_cause TEXT,
    preventive_actions TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, work_order_number),
    CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled'))
);

-- 3. PREVENTIVE MAINTENANCE SCHEDULE
CREATE TABLE IF NOT EXISTS preventive_maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES maintenance_assets(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    description TEXT,
    frequency_days INTEGER,  -- cada X días
    frequency_hours NUMERIC,  -- o cada X horas de uso
    last_executed_date DATE,
    next_scheduled_date DATE,
    estimated_duration_hours NUMERIC,
    priority TEXT DEFAULT 'medium',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. TECHNICIAN SKILLS MATRIX
CREATE TABLE IF NOT EXISTS technician_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,  -- hydraulics, electrics, welding, etc
    proficiency_level TEXT DEFAULT 'intermediate',  -- beginner, intermediate, expert
    certification_date DATE,
    certification_expiry_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, user_id, skill_name)
);

-- 5. MAINTENANCE HISTORY
CREATE TABLE IF NOT EXISTS maintenance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES maintenance_assets(id) ON DELETE CASCADE,
    maintenance_type TEXT,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    performed_by_name TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    parts_replaced TEXT,
    parts_cost NUMERIC,
    labor_hours NUMERIC,
    labor_cost NUMERIC,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. SPARE PARTS INVENTORY
CREATE TABLE IF NOT EXISTS spare_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    part_code TEXT NOT NULL,
    part_name TEXT NOT NULL,
    asset_type TEXT,  -- para qué tipo de asset
    current_stock INTEGER DEFAULT 0,
    minimum_stock_level INTEGER,
    maximum_stock_level INTEGER,
    unit_cost NUMERIC,
    supplier_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    lead_time_days INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, part_code)
);

-- 7. MTTR & KPI TRACKING
CREATE TABLE IF NOT EXISTS maintenance_kpi_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tracking_date DATE,
    asset_id UUID REFERENCES maintenance_assets(id) ON DELETE SET NULL,
    
    -- MTTR (Mean Time To Repair)
    total_repairs INTEGER,
    total_repair_hours NUMERIC,
    average_mttr_hours NUMERIC,
    
    -- Downtime
    total_downtime_hours NUMERIC,
    preventable_downtime_hours NUMERIC,
    
    -- Maintenance Costs
    maintenance_cost NUMERIC,
    parts_cost NUMERIC,
    labor_cost NUMERIC,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, tracking_date, asset_id)
);

-- 8. SAFETY CHECKLIST
CREATE TABLE IF NOT EXISTS pre_work_safety_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
    equipment_locked BOOLEAN,
    energy_isolated BOOLEAN,
    ppe_available BOOLEAN,
    hazard_assessment_done BOOLEAN,
    fire_prevention_checked BOOLEAN,
    confined_space_checked BOOLEAN,
    hot_work_permit BOOLEAN,
    supervisor_approval BOOLEAN,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE maintenance_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventive_maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_assets_org_isolation ON maintenance_assets
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY work_orders_org_isolation ON maintenance_work_orders
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY preventive_maint_org_isolation ON preventive_maintenance_schedules
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY technician_skills_org_isolation ON technician_skills
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));

-- INDEXES
CREATE INDEX idx_work_orders_asset_id ON maintenance_work_orders(asset_id);
CREATE INDEX idx_work_orders_status ON maintenance_work_orders(status);
CREATE INDEX idx_work_orders_assigned_to ON maintenance_work_orders(assigned_to);
CREATE INDEX idx_work_orders_scheduled_date ON maintenance_work_orders(scheduled_date);
CREATE INDEX idx_assets_organization_id ON maintenance_assets(organization_id);
CREATE INDEX idx_assets_criticality ON maintenance_assets(criticality);
CREATE INDEX idx_preventive_maint_asset_id ON preventive_maintenance_schedules(asset_id);
CREATE INDEX idx_preventive_maint_next_date ON preventive_maintenance_schedules(next_scheduled_date);
CREATE INDEX idx_maintenance_history_asset_id ON maintenance_history(asset_id);
CREATE INDEX idx_spare_parts_organization_id ON spare_parts(organization_id);
CREATE INDEX idx_kpi_tracking_date ON maintenance_kpi_tracking(tracking_date);
