-- Maintenance Orders - Hierarchical System (3 Levels)

-- Level 0: Main Work Order (por vehículo/faena)
-- Level 1: Component Sub-Orders (por subsistema)
-- Level 2: Tasks (acciones específicas)

CREATE TABLE IF NOT EXISTS maintenance_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES vehicles(id),
  parent_id UUID REFERENCES maintenance_orders(id) ON DELETE CASCADE, -- Para jerarquía
  component_id UUID REFERENCES components_template(id), -- Componente asociado (Level 1+)
  
  -- Información básica
  order_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Tipo y prioridad
  maintenance_type TEXT CHECK (maintenance_type IN ('preventiva', 'correctiva', 'predictiva')),
  priority TEXT CHECK (priority IN ('crítica', 'alta', 'media', 'baja')),
  
  -- Jerarquía y nivel
  level INT DEFAULT 0 CHECK (level IN (0, 1, 2)), -- 0=Principal, 1=Componente, 2=Tarea
  
  -- Asignación
  assigned_to UUID, -- Técnico responsable
  technician_name TEXT,
  
  -- Duraciones
  estimated_hours DECIMAL(10, 2),
  actual_hours DECIMAL(10, 2),
  
  -- Estados
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'completada', 'cancelada')),
  progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Costos
  estimated_cost DECIMAL(15, 2),
  actual_cost DECIMAL(15, 2),
  
  -- Fechas
  scheduled_date TIMESTAMP,
  start_date TIMESTAMP,
  completion_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Auditoría
  created_by UUID,
  updated_by UUID
);

-- Tabla de piezas por orden
CREATE TABLE IF NOT EXISTS order_wear_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_order_id UUID NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
  wear_part_id UUID NOT NULL REFERENCES wear_parts(id),
  
  quantity INT NOT NULL DEFAULT 1,
  unit_cost DECIMAL(15, 2),
  total_cost DECIMAL(15, 2),
  
  installed BOOLEAN DEFAULT FALSE,
  installed_at TIMESTAMP,
  installed_by UUID,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de seguimiento de progreso
CREATE TABLE IF NOT EXISTS order_progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_order_id UUID NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
  
  old_status TEXT,
  new_status TEXT NOT NULL,
  progress_from INT,
  progress_to INT,
  
  notes TEXT,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX idx_maintenance_orders_vehicle_id ON maintenance_orders(vehicle_id);
CREATE INDEX idx_maintenance_orders_parent_id ON maintenance_orders(parent_id);
CREATE INDEX idx_maintenance_orders_status ON maintenance_orders(status);
CREATE INDEX idx_maintenance_orders_assigned_to ON maintenance_orders(assigned_to);
CREATE INDEX idx_order_wear_parts_maintenance_order_id ON order_wear_parts(maintenance_order_id);
CREATE INDEX idx_order_progress_tracking_maintenance_order_id ON order_progress_tracking(maintenance_order_id);

-- Row Level Security
ALTER TABLE maintenance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_wear_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_progress_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all for now (será restringido después)
CREATE POLICY "allow_all_maintenance_orders" ON maintenance_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_order_wear_parts" ON order_wear_parts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_order_progress_tracking" ON order_progress_tracking FOR ALL USING (true) WITH CHECK (true);
