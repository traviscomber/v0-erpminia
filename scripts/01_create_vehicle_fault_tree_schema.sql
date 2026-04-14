-- Vehicle Fault Tree System - Schema
-- Tables: vehicles, components_template, components, fault_modes, wear_parts

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL, -- 'excavadora', 'pala', 'volqueta'
  model TEXT NOT NULL,
  year INT NOT NULL,
  site TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'operativo', -- 'operativo', 'mantenimiento', 'fuera_servicio'
  purchase_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Component Templates (reusable structure for vehicle types)
CREATE TABLE IF NOT EXISTS components_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  parent_id UUID REFERENCES components_template(id) ON DELETE SET NULL,
  level INT NOT NULL, -- 0=root, 1=subsystem, 2=component, 3=part
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Component Instances (actual components in a specific vehicle)
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES components_template(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES components(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'operativo', -- 'operativo', 'degradado', 'fallo'
  last_maintenance TIMESTAMP,
  maintenance_hours INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fault Modes (what can go wrong with a component)
CREATE TABLE IF NOT EXISTS fault_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_template_id UUID NOT NULL REFERENCES components_template(id) ON DELETE CASCADE,
  fault_code TEXT NOT NULL,
  fault_name TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL, -- 'critica', 'mayor', 'menor'
  symptoms TEXT,
  probable_causes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wear Parts (repuestos asociados a cada fallo)
CREATE TABLE IF NOT EXISTS wear_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fault_mode_id UUID NOT NULL REFERENCES fault_modes(id) ON DELETE CASCADE,
  part_code TEXT NOT NULL,
  part_name TEXT NOT NULL,
  description TEXT,
  supplier TEXT,
  unit_cost DECIMAL(10, 2),
  lead_time_days INT, -- días para conseguir el repuesto
  is_critical BOOLEAN DEFAULT FALSE,
  stock_current INT DEFAULT 0,
  stock_min INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_vehicles_site ON vehicles(site);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_components_vehicle ON components(vehicle_id);
CREATE INDEX idx_components_template_vehicle_type ON components_template(vehicle_type);
CREATE INDEX idx_fault_modes_component ON fault_modes(component_template_id);
CREATE INDEX idx_wear_parts_fault_mode ON wear_parts(fault_mode_id);

-- Enable RLS (Row Level Security)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE components_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE fault_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wear_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all authenticated users for now - adjust as needed)
CREATE POLICY "vehicles_allow_all" ON vehicles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "components_template_allow_all" ON components_template FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "components_allow_all" ON components FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "fault_modes_allow_all" ON fault_modes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "wear_parts_allow_all" ON wear_parts FOR ALL USING (auth.role() = 'authenticated');
