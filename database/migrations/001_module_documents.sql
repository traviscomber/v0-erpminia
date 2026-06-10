-- Tabla genérica para gestionar documentos en cualquier módulo
-- Soporta: DOCX, PDF, XLS, XLSX
-- Features: versionado, revisión 2-level, expiración, auditoría

CREATE TABLE IF NOT EXISTS module_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL, -- 'prevención', 'mantenimiento', 'finanzas', 'hse', 'bodega', 'legal'
  category TEXT NOT NULL, -- 'arranque', 'procedimientos', 'políticas', etc
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'pdf', 'docx', 'xls', 'xlsx'
  file_path TEXT NOT NULL, -- Ruta en Supabase Storage
  file_size_bytes INTEGER,
  file_url TEXT, -- URL pública de acceso
  
  -- Metadata
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Vigencia
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_expired BOOLEAN GENERATED ALWAYS AS (valid_until IS NOT NULL AND valid_until < NOW()) STORED,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES module_documents(id),
  
  -- Review Status
  status TEXT DEFAULT 'draft', -- 'draft', 'pending_l1', 'pending_l2', 'active', 'rejected'
  
  -- Level 1 Review (Dennyse)
  reviewed_by_l1 UUID REFERENCES auth.users(id),
  reviewed_at_l1 TIMESTAMP WITH TIME ZONE,
  l1_status TEXT, -- 'pending', 'approved', 'rejected'
  l1_observations TEXT,
  
  -- Level 2 Review (Javier/Gonzalo)
  reviewed_by_l2 UUID REFERENCES auth.users(id),
  reviewed_at_l2 TIMESTAMP WITH TIME ZONE,
  l2_status TEXT, -- 'pending', 'approved', 'rejected'
  l2_observations TEXT,
  
  -- Soft delete
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_module_documents_module ON module_documents(module);
CREATE INDEX idx_module_documents_category ON module_documents(category);
CREATE INDEX idx_module_documents_status ON module_documents(status);
CREATE INDEX idx_module_documents_valid_until ON module_documents(valid_until);
CREATE INDEX idx_module_documents_module_category ON module_documents(module, category);

-- Row Level Security (RLS)
ALTER TABLE module_documents ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden ver documentos activos aprobados en su módulo
CREATE POLICY "view_active_documents"
  ON module_documents FOR SELECT
  USING (is_active = TRUE AND status = 'active');

-- Política: Usuarios pueden ver borradores propios
CREATE POLICY "view_own_drafts"
  ON module_documents FOR SELECT
  USING (uploaded_by = auth.uid() OR is_active = FALSE);

-- Política: Solo Dennyse y revisores L2 pueden ver documentos en review
CREATE POLICY "view_review_documents"
  ON module_documents FOR SELECT
  USING (
    (reviewed_by_l1 = auth.uid() OR reviewed_by_l2 = auth.uid())
    OR (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'legal_reviewer')
  );

-- Política: Solo owner puede subir
CREATE POLICY "upload_own_documents"
  ON module_documents FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- Política: Solo owner o legal team puede actualizar
CREATE POLICY "update_documents"
  ON module_documents FOR UPDATE
  USING (
    uploaded_by = auth.uid() 
    OR reviewed_by_l1 = auth.uid()
    OR reviewed_by_l2 = auth.uid()
    OR (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'legal_reviewer')
  );

-- Tabla de auditoría para seguimiento completo
CREATE TABLE IF NOT EXISTS module_documents_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES module_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'reviewed_l1', 'reviewed_l2', 'approved', 'rejected', 'deleted'
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_document_id ON module_documents_audit(document_id);
CREATE INDEX idx_audit_created_at ON module_documents_audit(created_at);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_module_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER module_documents_updated_at
  BEFORE UPDATE ON module_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_module_documents_updated_at();

-- Función para crear entrada de auditoría
CREATE OR REPLACE FUNCTION log_document_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO module_documents_audit (document_id, action, actor_id, action_details)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_ARGV[0],
    auth.uid(),
    jsonb_build_object(
      'status', NEW.status,
      'l1_status', NEW.l1_status,
      'l2_status', NEW.l2_status,
      'observations', COALESCE(NEW.l1_observations, NEW.l2_observations)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_document_upload
  AFTER INSERT ON module_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_action('created');

CREATE TRIGGER log_document_review
  AFTER UPDATE ON module_documents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_document_action('status_change');
