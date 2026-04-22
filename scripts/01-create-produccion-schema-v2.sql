-- Producción Module Schema - Version 2 (Idempotent)
-- Only creates tables and indexes if they don't exist

-- Plants Table
CREATE TABLE IF NOT EXISTS plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL UNIQUE,
  location varchar(255),
  operating_company varchar(255),
  status varchar(50) DEFAULT 'activa',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamp
);

-- Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  equipment_code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  type varchar(50), -- excavator, truck, pump, conveyor, etc
  manufacturer varchar(255),
  model varchar(255),
  serial_number varchar(255),
  installation_date date,
  status varchar(50) DEFAULT 'operativo', -- operativo, mantenimiento, falla, inactivo
  criticality varchar(20) DEFAULT 'media', -- baja, media, alta, critica
  last_maintenance date,
  mtbf_hours integer, -- mean time between failures
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamp
);

-- Sensors Table
CREATE TABLE IF NOT EXISTS sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  sensor_code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  type varchar(50), -- temperature, pressure, vibration, flow, power, rpm, etc
  unit varchar(20), -- C, psi, mm/s, l/min, kW, rpm, etc
  min_threshold numeric,
  max_threshold numeric,
  warning_threshold numeric,
  alert_threshold numeric,
  status varchar(50) DEFAULT 'activo',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  deleted_at timestamp
);

-- Sensor Readings Table (TimeSeries)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id uuid NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  reading_value numeric NOT NULL,
  reading_timestamp timestamp DEFAULT now(),
  quality varchar(20) DEFAULT 'good', -- good, warning, alert
  created_at timestamp DEFAULT now()
);

-- Alarms Table
CREATE TABLE IF NOT EXISTS alarms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id uuid REFERENCES sensors(id),
  equipment_id uuid REFERENCES equipment(id),
  alarm_type varchar(50), -- warning, alert, critical
  title varchar(255) NOT NULL,
  description text,
  severity varchar(20), -- info, warning, critical
  status varchar(50) DEFAULT 'activa', -- activa, reconocida, resuelta
  triggered_at timestamp DEFAULT now(),
  acknowledged_at timestamp,
  acknowledged_by uuid REFERENCES auth.users(id),
  resolved_at timestamp,
  resolved_by uuid REFERENCES auth.users(id),
  auto_generated_ot_id uuid, -- Links to OT if created
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Equipment Detenciones/Paradas
CREATE TABLE IF NOT EXISTS detenciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  start_time timestamp NOT NULL,
  end_time timestamp,
  duration_minutes integer,
  reason varchar(100), -- mechanical, electrical, preventive, lack_of_material, etc
  impact_production_units numeric,
  root_cause text,
  linked_alarm_id uuid REFERENCES alarms(id),
  linked_ot_id uuid, -- Links to maintenance OT
  status varchar(50) DEFAULT 'open', -- open, analysis, resolved
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Equipment Availability/Uptime
CREATE TABLE IF NOT EXISTS equipment_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_minutes integer DEFAULT 1440,
  available_minutes integer,
  unavailable_minutes integer,
  availability_percentage numeric,
  detenciones_count integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_equipment_plant_id ON equipment(plant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_sensors_equipment_id ON sensors(equipment_id);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);
CREATE INDEX IF NOT EXISTS idx_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON sensor_readings(reading_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alarms_equipment_id ON alarms(equipment_id);
CREATE INDEX IF NOT EXISTS idx_alarms_sensor_id ON alarms(sensor_id);
CREATE INDEX IF NOT EXISTS idx_alarms_status ON alarms(status);
CREATE INDEX IF NOT EXISTS idx_alarms_severity ON alarms(severity);
CREATE INDEX IF NOT EXISTS idx_detenciones_equipment_id ON detenciones(equipment_id);
CREATE INDEX IF NOT EXISTS idx_detenciones_start_time ON detenciones(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_availability_equipment_date ON equipment_availability(equipment_id, date);

-- Enable RLS
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE detenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now - will be refined per role)
CREATE POLICY "enable_read_plants" ON plants FOR SELECT USING (true);
CREATE POLICY "enable_read_equipment" ON equipment FOR SELECT USING (true);
CREATE POLICY "enable_read_sensors" ON sensors FOR SELECT USING (true);
CREATE POLICY "enable_read_readings" ON sensor_readings FOR SELECT USING (true);
CREATE POLICY "enable_read_alarms" ON alarms FOR SELECT USING (true);
CREATE POLICY "enable_read_detenciones" ON detenciones FOR SELECT USING (true);
CREATE POLICY "enable_read_availability" ON equipment_availability FOR SELECT USING (true);
