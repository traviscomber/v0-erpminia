-- ============================================================================
-- MIGRATION: 005-contratos-hse-tables.sql
-- Nuevas tablas para módulos Contratos y HSE
-- ============================================================================

-- ============================================================================
-- TABLA: contratos_hitos (Payment Milestones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contratos_hitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  hito_number INTEGER NOT NULL,
  hito_name VARCHAR(255) NOT NULL,
  monto_neto NUMERIC(15, 2) NOT NULL,
  monto_anticipo NUMERIC(15, 2) DEFAULT 0,
  fecha_programada DATE NOT NULL,
  fecha_real DATE,
  estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, parcial, pagado
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_estado_hito CHECK (estado IN ('pendiente', 'parcial', 'pagado'))
);

CREATE INDEX idx_contratos_hitos_contractor ON contratos_hitos(contractor_id);
CREATE INDEX idx_contratos_hitos_status ON contratos_hitos(estado);

-- ============================================================================
-- TABLA: contratos_garantias (Guarantee Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contratos_garantias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hito_id UUID NOT NULL REFERENCES contratos_hitos(id) ON DELETE CASCADE,
  porcentaje_retencion NUMERIC(5, 2) NOT NULL, -- 5% a 10%
  monto_retenido NUMERIC(15, 2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado VARCHAR(50) DEFAULT 'retenida', -- retenida, devuelta, vencida
  fecha_devolucion DATE,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_estado_garantia CHECK (estado IN ('retenida', 'devuelta', 'vencida'))
);

CREATE INDEX idx_garantias_vencimiento ON contratos_garantias(fecha_vencimiento);
CREATE INDEX idx_garantias_estado ON contratos_garantias(estado);

-- ============================================================================
-- TABLA: contratos_regalias (Royalties/Rent Control)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contratos_regalias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  propiedad INTEGER NOT NULL, -- 1, 2, 3
  porcentaje_neto NUMERIC(5, 2) NOT NULL,
  porcentaje_retencion NUMERIC(5, 2) NOT NULL,
  mes_ano VARCHAR(7) NOT NULL, -- YYYY-MM
  monto_bruto NUMERIC(15, 2) NOT NULL,
  monto_neto NUMERIC(15, 2) NOT NULL,
  monto_retenido NUMERIC(15, 2) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, pagado
  fecha_pago DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_propiedad CHECK (propiedad IN (1, 2, 3))
);

CREATE INDEX idx_regalias_mes ON contratos_regalias(mes_ano);
CREATE INDEX idx_regalias_propiedad ON contratos_regalias(propiedad);

-- ============================================================================
-- TABLA: hse_documentos (HSE Document Repository)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hse_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- politica, programa, reglamento, procedimiento, instructivo, plan
  version VARCHAR(50) NOT NULL,
  fecha_actualizacion DATE NOT NULL,
  estado VARCHAR(50) DEFAULT 'vigente', -- vigente, en_revision, obsoleto
  descripcion TEXT,
  url_documento TEXT,
  archivo_path TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_tipo_doc CHECK (tipo IN ('politica', 'programa', 'reglamento', 'procedimiento', 'instructivo', 'plan')),
  CONSTRAINT valid_estado_doc CHECK (estado IN ('vigente', 'en_revision', 'obsoleto'))
);

CREATE INDEX idx_hse_docs_tipo ON hse_documentos(tipo);
CREATE INDEX idx_hse_docs_estado ON hse_documentos(estado);

-- ============================================================================
-- TABLA: hse_documentos_aplicabilidad (Document-Faena-Cargo Mapping)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hse_documentos_aplicabilidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES hse_documentos(id) ON DELETE CASCADE,
  faena VARCHAR(100) NOT NULL, -- Peumo, Don Jaime, Planta, Raíz Cobre
  cargo VARCHAR(100),
  es_obligatorio BOOLEAN DEFAULT TRUE,
  fecha_desde DATE NOT NULL,
  
  UNIQUE(documento_id, faena, cargo)
);

-- ============================================================================
-- TABLA: hse_capacitaciones (Training Calendar & Records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hse_capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- achs, otec, induccion, especifica
  tema VARCHAR(255),
  programa_hse_id UUID REFERENCES hse_documentos(id),
  proveedor VARCHAR(255),
  instructor VARCHAR(255),
  fecha_programada DATE NOT NULL,
  fecha_real DATE,
  duracion_horas INTEGER NOT NULL,
  faena VARCHAR(100),
  cargos_aplica TEXT, -- JSON array o string separado por comas
  estado VARCHAR(50) DEFAULT 'programada', -- programada, realizada, cancelada
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_tipo_cap CHECK (tipo IN ('achs', 'otec', 'induccion', 'especifica')),
  CONSTRAINT valid_estado_cap CHECK (estado IN ('programada', 'realizada', 'cancelada'))
);

CREATE INDEX idx_capacitaciones_fecha ON hse_capacitaciones(fecha_programada);
CREATE INDEX idx_capacitaciones_estado ON hse_capacitaciones(estado);

-- ============================================================================
-- TABLA: hse_capacitaciones_asistentes (Training Attendance & Scores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hse_capacitaciones_asistentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capacitacion_id UUID NOT NULL REFERENCES hse_capacitaciones(id) ON DELETE CASCADE,
  personal_id UUID NOT NULL, -- Referencia a personal en RRHH
  personal_nombre VARCHAR(255),
  personal_rut VARCHAR(12),
  asistio BOOLEAN DEFAULT FALSE,
  calificacion VARCHAR(50), -- aprobado, reprobado, o nota (1-7)
  certificado_generado BOOLEAN DEFAULT FALSE,
  fecha_certificado DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(capacitacion_id, personal_rut)
);

-- ============================================================================
-- TABLA: hse_epp_maestro (PPE Master by Cargo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hse_epp_maestro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo VARCHAR(100) NOT NULL,
  epp_elemento VARCHAR(100) NOT NULL, -- casco, chaleco, guantes, respirador, etc
  cantidad INTEGER NOT NULL DEFAULT 1,
  marca_modelo VARCHAR(255),
  frecuencia_reemplazo VARCHAR(50), -- anual, semestral, trimestral
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(cargo, epp_elemento)
);

-- ============================================================================
-- TABLA: hse_epp_entregas (PPE Delivery & Inventory Integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hse_epp_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID NOT NULL,
  personal_nombre VARCHAR(255),
  personal_rut VARCHAR(12),
  cargo VARCHAR(100),
  epp_elemento VARCHAR(100) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  marca_modelo VARCHAR(255),
  fecha_entrega DATE NOT NULL,
  entregado_por_nombre VARCHAR(255),
  entregado_por_id UUID REFERENCES auth.users(id),
  estado_anterior VARCHAR(50), -- nuevo, usado, descarte
  devolucion_requerida BOOLEAN DEFAULT FALSE,
  fecha_devolucion DATE,
  sincronizado_bodega BOOLEAN DEFAULT FALSE,
  bodega_transaction_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_estado_epp CHECK (estado_anterior IN ('nuevo', 'usado', 'descarte'))
);

CREATE INDEX idx_epp_personal ON hse_epp_entregas(personal_rut);
CREATE INDEX idx_epp_fecha ON hse_epp_entregas(fecha_entrega);

-- ============================================================================
-- TABLA: contratos_alertas (Centralized Alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contratos_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL, -- vencimiento, pago_rojo, garantia_vence, regalias_discrepancia
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  hito_id UUID REFERENCES contratos_hitos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  severidad VARCHAR(50) DEFAULT 'media', -- baja, media, alta, critica
  fecha_alerta DATE NOT NULL,
  fecha_vencimiento DATE,
  estado VARCHAR(50) DEFAULT 'activa', -- activa, resuelta, ignorada
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_tipo_alerta CHECK (tipo IN ('vencimiento', 'pago_rojo', 'garantia_vence', 'regalias_discrepancia', 'documento_vence', 'capacitacion_vence')),
  CONSTRAINT valid_severidad CHECK (severidad IN ('baja', 'media', 'alta', 'critica'))
);

CREATE INDEX idx_alertas_estado ON contratos_alertas(estado);
CREATE INDEX idx_alertas_fecha ON contratos_alertas(fecha_alerta);

-- ============================================================================
-- RLS POLICIES - contratos_hitos
-- ============================================================================
ALTER TABLE contratos_hitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated" ON contratos_hitos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for contratos_admin" ON contratos_hitos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for contratos_admin" ON contratos_hitos
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS POLICIES - hse_documentos
-- ============================================================================
ALTER TABLE hse_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated" ON hse_documentos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for hse_admin" ON hse_documentos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TRIGGER: Update audit timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contratos_hitos_updated_at
  BEFORE UPDATE ON contratos_hitos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hse_documentos_updated_at
  BEFORE UPDATE ON hse_documentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100),
  operation VARCHAR(10), -- INSERT, UPDATE, DELETE
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

