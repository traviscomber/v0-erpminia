-- Tabla de control de acceso: qué usuario tiene acceso a qué módulos
CREATE TABLE IF NOT EXISTS public.user_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer', -- 'viewer', 'uploader', 'reviewer', 'admin'
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, module_id)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_user_module_access_user ON public.user_module_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_access_module ON public.user_module_access(module_id);
CREATE INDEX IF NOT EXISTS idx_user_module_access_user_module ON public.user_module_access(user_id, module_id);

-- RLS en user_module_access
ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

-- Política: Admin puede ver todos los accesos
CREATE POLICY "admin_view_all_access"
  ON public.user_module_access FOR SELECT
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Política: Usuarios pueden ver sus propios accesos
CREATE POLICY "users_view_own_access"
  ON public.user_module_access FOR SELECT
  USING (user_id = auth.uid());

-- Política: Solo admin puede insertar/actualizar accesos
CREATE POLICY "admin_manage_access"
  ON public.user_module_access FOR INSERT
  WITH CHECK (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "admin_update_access"
  ON public.user_module_access FOR UPDATE
  USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Actualizar RLS policies en module_documents para usar user_module_access

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "view_active_documents" ON public.module_documents;
DROP POLICY IF EXISTS "view_own_drafts" ON public.module_documents;
DROP POLICY IF EXISTS "view_review_documents" ON public.module_documents;
DROP POLICY IF EXISTS "upload_own_documents" ON public.module_documents;
DROP POLICY IF EXISTS "update_documents" ON public.module_documents;

-- Nueva política: Ver documentos aprobados del módulo autorizado
CREATE POLICY "view_approved_in_authorized_module"
  ON public.module_documents FOR SELECT
  USING (
    is_active = TRUE 
    AND status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.user_module_access uma
      WHERE uma.user_id = auth.uid()
      AND uma.module_id = module_documents.module
      AND uma.status = 'active'
    )
  );

-- Política: Viewers solo ven documentos aprobados
CREATE POLICY "viewer_approved_only"
  ON public.module_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_module_access uma
      WHERE uma.user_id = auth.uid()
      AND uma.module_id = module_documents.module
      AND uma.role = 'viewer'
      AND uma.status = 'active'
    )
    AND module_documents.status = 'active'
  );

-- Política: Uploaders ven aprobados + sus borradores
CREATE POLICY "uploader_own_and_approved"
  ON public.module_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_module_access uma
      WHERE uma.user_id = auth.uid()
      AND uma.module_id = module_documents.module
      AND uma.role IN ('uploader', 'admin')
      AND uma.status = 'active'
    )
    AND (module_documents.status = 'active' OR module_documents.uploaded_by = auth.uid())
  );

-- Política: Reviewers ven todo en su módulo
CREATE POLICY "reviewer_all_statuses"
  ON public.module_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_module_access uma
      WHERE uma.user_id = auth.uid()
      AND uma.module_id = module_documents.module
      AND uma.role IN ('reviewer', 'admin')
      AND uma.status = 'active'
    )
  );

-- Política: Solo uploaders/admin pueden insertar
CREATE POLICY "insert_documents_authorized"
  ON public.module_documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_module_access uma
      WHERE uma.user_id = auth.uid()
      AND uma.module_id = module_documents.module
      AND uma.role IN ('uploader', 'admin')
      AND uma.status = 'active'
    )
  );

-- Política: Solo owner/reviewers pueden actualizar
CREATE POLICY "update_documents_authorized"
  ON public.module_documents FOR UPDATE
  USING (
    (
      uploaded_by = auth.uid() 
      OR reviewed_by_l1 = auth.uid() 
      OR reviewed_by_l2 = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_module_access uma
      WHERE uma.user_id = auth.uid()
      AND uma.module_id = module_documents.module
      AND uma.role IN ('uploader', 'reviewer', 'admin')
      AND uma.status = 'active'
    )
  );

-- Política: Solo owner/admin pueden eliminar (soft delete)
CREATE POLICY "delete_documents_authorized"
  ON public.module_documents FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_module_access uma
      WHERE uma.user_id = auth.uid()
      AND uma.module_id = module_documents.module
      AND uma.role IN ('uploader', 'admin')
      AND uma.status = 'active'
    )
  );
