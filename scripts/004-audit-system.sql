-- Create comprehensive audit trail system for all user activities
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export', 'login', 'logout'
  module VARCHAR(100) NOT NULL, -- 'produccion', 'mantenimiento', 'bodega', etc
  table_name VARCHAR(100),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed', 'unauthorized'
  error_message TEXT,
  duration_ms INTEGER, -- Milliseconds to complete action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  retention_until TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 years')
);

-- Create indexes for audit log queries
CREATE INDEX idx_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_activity_log_module ON public.user_activity_log(module);
CREATE INDEX idx_activity_log_table_name ON public.user_activity_log(table_name);
CREATE INDEX idx_activity_log_action ON public.user_activity_log(action);
CREATE INDEX idx_activity_log_created_at ON public.user_activity_log(created_at DESC);
CREATE INDEX idx_activity_log_record_id ON public.user_activity_log(record_id);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only view their own activity
CREATE POLICY "users_view_own_activity" ON public.user_activity_log
  FOR SELECT USING (auth.uid() = user_id);

-- RLS: Admins can view all activity
CREATE POLICY "admins_view_all_activity" ON public.user_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_module VARCHAR;
BEGIN
  -- Map table names to modules
  v_module := CASE TG_TABLE_NAME
    WHEN 'equipment' THEN 'produccion'
    WHEN 'sensors' THEN 'produccion'
    WHEN 'sensor_readings' THEN 'produccion'
    WHEN 'maintenance_orders' THEN 'mantenimiento'
    WHEN 'components' THEN 'mantenimiento'
    WHEN 'wear_parts' THEN 'bodega'
    WHEN 'incidents' THEN 'hse'
    WHEN 'hse_inspections' THEN 'hse'
    WHEN 'document_audit_log' THEN 'documentos'
    WHEN 'procurement_documents' THEN 'compras'
    WHEN 'contracts' THEN 'finanzas'
    ELSE 'other'
  END;

  -- Log the change
  INSERT INTO public.user_activity_log (
    user_id,
    action,
    module,
    table_name,
    record_id,
    old_values,
    new_values,
    status
  ) VALUES (
    auth.uid(),
    CASE TG_OP
      WHEN 'INSERT' THEN 'create'
      WHEN 'UPDATE' THEN 'update'
      WHEN 'DELETE' THEN 'delete'
    END,
    v_module,
    TG_TABLE_NAME,
    CASE TG_OP
      WHEN 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    'success'
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to production tables
CREATE TRIGGER audit_equipment AFTER INSERT OR UPDATE OR DELETE ON equipment
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_maintenance_orders AFTER INSERT OR UPDATE OR DELETE ON maintenance_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_wear_parts AFTER INSERT OR UPDATE OR DELETE ON wear_parts
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_incidents AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_procurement AFTER INSERT OR UPDATE OR DELETE ON procurement_documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_contracts AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- Function to cleanup old audit logs (7 year retention)
CREATE OR REPLACE FUNCTION public.cleanup_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_activity_log
  WHERE retention_until < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (pg_cron extension needed in production)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * 0', 'SELECT public.cleanup_audit_logs()');
