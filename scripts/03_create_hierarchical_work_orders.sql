-- Hierarchical Work Orders Schema
-- Level 0: OT Principal (por vehículo)
-- Level 1: Sub-OT (por componente)
-- Level 2: Tareas específicas

-- Modificar maintenance_orders para soportar jerarquía
ALTER TABLE maintenance_orders 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES maintenance_orders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS component_id UUID REFERENCES components(id),
ADD COLUMN IF NOT EXISTS assigned_technician UUID,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10, 2);

-- Crear tabla para tracking de progreso
CREATE TABLE IF NOT EXISTS order_progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Crear tabla para piezas asignadas a órdenes
CREATE TABLE IF NOT EXISTS order_wear_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
  wear_part_id UUID NOT NULL REFERENCES wear_parts(id),
  quantity INTEGER DEFAULT 1,
  unit_cost DECIMAL(12, 2),
  total_cost DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla para asignación de técnicos a sub-órdenes
CREATE TABLE IF NOT EXISTS order_technician_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID,
  estimated_completion TIMESTAMP,
  actual_completion TIMESTAMP,
  hours_worked DECIMAL(10, 2),
  notes TEXT
);

-- Habilitar RLS
ALTER TABLE order_progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_wear_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_technician_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "order_progress_history_select" ON order_progress_history FOR SELECT USING (true);
CREATE POLICY "order_progress_history_insert" ON order_progress_history FOR INSERT WITH CHECK (true);

CREATE POLICY "order_wear_parts_select" ON order_wear_parts FOR SELECT USING (true);
CREATE POLICY "order_wear_parts_insert" ON order_wear_parts FOR INSERT WITH CHECK (true);
CREATE POLICY "order_wear_parts_update" ON order_wear_parts FOR UPDATE USING (true);
CREATE POLICY "order_wear_parts_delete" ON order_wear_parts FOR DELETE USING (true);

CREATE POLICY "order_technician_assignments_select" ON order_technician_assignments FOR SELECT USING (true);
CREATE POLICY "order_technician_assignments_insert" ON order_technician_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "order_technician_assignments_update" ON order_technician_assignments FOR UPDATE USING (true);
