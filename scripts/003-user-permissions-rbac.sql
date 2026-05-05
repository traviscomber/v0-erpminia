-- Create user_permissions table for granular permission management
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL, -- 'produccion', 'mantenimiento', 'bodega', etc
  action VARCHAR(50) NOT NULL, -- 'view', 'create', 'edit', 'delete', 'export'
  resource_type VARCHAR(100), -- 'equipment', 'work_order', 'inventory_item', null for all
  resource_id UUID, -- Specific resource, null for all in module
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE, -- null = permanent, date = temporary permission
  is_active BOOLEAN DEFAULT TRUE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, module, action, resource_type, resource_id),
  CONSTRAINT valid_action CHECK (action IN ('view', 'create', 'edit', 'delete', 'export', 'approve', 'admin'))
);

-- Create index for faster permission lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_module ON public.user_permissions(module);
CREATE INDEX idx_user_permissions_active ON public.user_permissions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_permissions_expires ON public.user_permissions(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own permissions
CREATE POLICY "users_view_own_permissions" ON public.user_permissions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Admins can view and manage all permissions
CREATE POLICY "admins_manage_all_permissions" ON public.user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Service role (backend) can do everything
CREATE POLICY "service_role_all_permissions" ON public.user_permissions
  USING (true);

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_module VARCHAR,
  p_action VARCHAR,
  p_resource_type VARCHAR DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE 
      user_id = p_user_id
      AND module = p_module
      AND action = p_action
      AND (resource_type IS NULL OR resource_type = p_resource_type)
      AND (resource_id IS NULL OR resource_id = p_resource_id)
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create permission_roles_matrix table for role-based defaults
CREATE TABLE IF NOT EXISTS public.permission_roles_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL UNIQUE,
  module VARCHAR(100) NOT NULL,
  actions TEXT[] NOT NULL, -- Array of allowed actions: ['view', 'create', 'edit', 'delete', 'export']
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, module)
);

-- Insert default role-module permission matrix for mining operations
INSERT INTO public.permission_roles_matrix (role, module, actions, description) VALUES
  ('admin', 'produccion', ARRAY['view', 'create', 'edit', 'delete', 'export', 'admin'], 'Full access to production module'),
  ('admin', 'mantenimiento', ARRAY['view', 'create', 'edit', 'delete', 'export', 'admin'], 'Full access to maintenance'),
  ('admin', 'bodega', ARRAY['view', 'create', 'edit', 'delete', 'export', 'admin'], 'Full access to warehouse'),
  ('admin', 'hse', ARRAY['view', 'create', 'edit', 'delete', 'export', 'admin'], 'Full HSE access'),
  ('admin', 'compras', ARRAY['view', 'create', 'edit', 'delete', 'export', 'admin', 'approve'], 'Full purchasing access'),
  ('admin', 'finanzas', ARRAY['view', 'create', 'edit', 'delete', 'export', 'admin'], 'Full finance access'),
  
  ('manager', 'produccion', ARRAY['view', 'create', 'edit', 'export'], 'View and manage production'),
  ('manager', 'mantenimiento', ARRAY['view', 'create', 'edit', 'export', 'approve'], 'Manage maintenance orders'),
  ('manager', 'bodega', ARRAY['view', 'edit', 'export'], 'View and update inventory'),
  ('manager', 'hse', ARRAY['view', 'create', 'edit', 'export', 'approve'], 'HSE officer capabilities'),
  ('manager', 'compras', ARRAY['view', 'create', 'export'], 'Create purchase orders'),
  ('manager', 'finanzas', ARRAY['view', 'export'], 'Finance reporting'),
  
  ('technician', 'produccion', ARRAY['view', 'export'], 'Production monitoring'),
  ('technician', 'mantenimiento', ARRAY['view', 'create', 'edit', 'export'], 'Work on maintenance orders'),
  ('technician', 'bodega', ARRAY['view', 'edit'], 'Get parts from warehouse'),
  ('technician', 'hse', ARRAY['view'], 'View safety procedures'),
  
  ('warehouse_staff', 'bodega', ARRAY['view', 'create', 'edit', 'export'], 'Full warehouse management'),
  ('warehouse_staff', 'compras', ARRAY['view', 'export'], 'Receive purchase orders'),
  
  ('finance_officer', 'finanzas', ARRAY['view', 'create', 'edit', 'export'], 'Finance management'),
  ('finance_officer', 'compras', ARRAY['view', 'export'], 'View purchase orders'),
  
  ('viewer', 'produccion', ARRAY['view'], 'Read-only production'),
  ('viewer', 'mantenimiento', ARRAY['view'], 'Read-only maintenance'),
  ('viewer', 'bodega', ARRAY['view'], 'Read-only warehouse'),
  ('viewer', 'hse', ARRAY['view'], 'Read-only HSE'),
  ('viewer', 'compras', ARRAY['view'], 'Read-only purchasing'),
  ('viewer', 'finanzas', ARRAY['view'], 'Read-only finance');

-- Function to grant role-based permissions to user
CREATE OR REPLACE FUNCTION public.grant_role_permissions(
  p_user_id UUID,
  p_role VARCHAR
) RETURNS void AS $$
DECLARE
  v_permission_record RECORD;
BEGIN
  FOR v_permission_record IN
    SELECT module, actions FROM public.permission_roles_matrix WHERE role = p_role
  LOOP
    FOREACH p_action IN ARRAY v_permission_record.actions
    LOOP
      INSERT INTO public.user_permissions (user_id, role, module, action, granted_by)
      VALUES (p_user_id, p_role, v_permission_record.module, p_action, auth.uid())
      ON CONFLICT (user_id, module, action, resource_type, resource_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table for permission changes
CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL, -- 'granted', 'revoked', 'expired', 'updated'
  user_id UUID NOT NULL REFERENCES auth.users(id),
  permission_id UUID REFERENCES public.user_permissions(id),
  module VARCHAR(100),
  action_type VARCHAR(50),
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permission_audit_log_user ON public.permission_audit_log(user_id);
CREATE INDEX idx_permission_audit_log_created ON public.permission_audit_log(created_at);

ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- Trigger to log permission changes
CREATE OR REPLACE FUNCTION public.log_permission_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.permission_audit_log (
    action, user_id, permission_id, module, action_type, old_value, new_value, performed_by
  ) VALUES (
    CASE WHEN TG_OP = 'DELETE' THEN 'revoked' ELSE 'granted' END,
    NEW.user_id,
    NEW.id,
    NEW.module,
    NEW.action,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER user_permissions_audit_trigger
AFTER INSERT OR DELETE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();
