-- PRODUCCIÓN MODULE - COMPLETE SCHEMA
-- Tables: plants, equipment, equipment_hierarchy, sensors, sensor_readings, alarms, detenciones

-- 1. PLANTS (Plantas Operacionales)
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  site TEXT NOT NULL, -- La Patagua, Otras
  status TEXT NOT NULL DEFAULT 'operativa', -- operativa, mantención, desactivada
  capacity_tph NUMERIC, -- Tons per hour
  location_lat NUMERIC,
  location_lng NUMERIC,
  manager_id UUID,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- 2. EQUIPMENT (Equipos Principales)
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- chancadora, molino, correa, bomba, etc
  model TEXT,
  manufacturer TEXT,
  serial_number TEXT,
  purchase_date DATE,
  status TEXT NOT NULL DEFAULT 'operativo', -- operativo, alarma, parado, fuera_servicio
  criticality TEXT DEFAULT 'media', -- baja, media, alta, critica
  throughput_capacity NUMERIC, -- Capacity in tons/hour
  area_id UUID, -- Optional: which area it belongs to
  parent_id UUID REFERENCES equipment(id), -- For hierarchical structure
  specs JSONB, -- Technical specifications
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX idx_equipment_plant_id ON equipment(plant_id);
CREATE INDEX idx_equipment_parent_id ON equipment(parent_id);

-- 3. SENSORS (Sensores IoT)
CREATE TABLE IF NOT EXISTS sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sensor_type TEXT NOT NULL, -- vibration, temperature, pressure, amperage, flow, etc
  unit TEXT NOT NULL, -- mm/s, °C, bar, A, m3/h, etc
  tag TEXT, -- For SCADA/OPC-UA integration
  min_threshold NUMERIC,
  max_threshold NUMERIC,
  alarm_threshold NUMERIC,
  critical_threshold NUMERIC,
  status TEXT NOT NULL DEFAULT 'activo', -- activo, inactivo, falla
  last_reading NUMERIC,
  last_reading_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sensors_equipment_id ON sensors(equipment_id);

-- 4. SENSOR READINGS (Lecturas de Sensores - Telemetría)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  unit TEXT,
  status TEXT, -- normal, warning, alarm, critical
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  received_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);

-- 5. ALARMS (Alarmas Generadas)
CREATE TABLE IF NOT EXISTS alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID NOT NULL REFERENCES sensors(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  alarm_type TEXT NOT NULL, -- threshold_exceeded, rate_of_change, anomaly
  severity TEXT NOT NULL, -- warning, alarm, critical
  value NUMERIC,
  threshold NUMERIC,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'activa', -- activa, acknowledged, resolved
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_alarms_equipment_id ON alarms(equipment_id);
CREATE INDEX idx_alarms_sensor_id ON alarms(sensor_id);
CREATE INDEX idx_alarms_status ON alarms(status);

-- 6. DETENCIONES (Stoppages/Downtime Events)
CREATE TABLE IF NOT EXISTS detenciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  alarm_id UUID REFERENCES alarms(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  category TEXT NOT NULL, -- mecanica, electrica, proceso, seguridad, ambiental, otro
  cause TEXT,
  impact_tph NUMERIC, -- Lost throughput in tons/hour
  impact_cost NUMERIC, -- Estimated cost of downtime
  status TEXT NOT NULL DEFAULT 'abierta', -- abierta, en_reparacion, cerrada
  maintenance_order_id UUID, -- Link to maintenance OT
  root_cause TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_detenciones_equipment_id ON detenciones(equipment_id);
CREATE INDEX idx_detenciones_start_time ON detenciones(start_time DESC);

-- 7. EQUIPMENT AVAILABILITY TRACKING (For KPI calculations)
CREATE TABLE IF NOT EXISTS equipment_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  date DATE NOT NULL,
  total_minutes INTEGER DEFAULT 1440,
  downtime_minutes INTEGER DEFAULT 0,
  availability_percentage NUMERIC,
  planned_downtime_minutes INTEGER DEFAULT 0,
  unplanned_downtime_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(equipment_id, date)
);

-- Enable RLS on all tables
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE detenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow all for MVP - secure later)
CREATE POLICY "plants_allow_all" ON plants FOR ALL USING (true);
CREATE POLICY "equipment_allow_all" ON equipment FOR ALL USING (true);
CREATE POLICY "sensors_allow_all" ON sensors FOR ALL USING (true);
CREATE POLICY "sensor_readings_allow_all" ON sensor_readings FOR ALL USING (true);
CREATE POLICY "alarms_allow_all" ON alarms FOR ALL USING (true);
CREATE POLICY "detenciones_allow_all" ON detenciones FOR ALL USING (true);
CREATE POLICY "equipment_availability_allow_all" ON equipment_availability FOR ALL USING (true);
