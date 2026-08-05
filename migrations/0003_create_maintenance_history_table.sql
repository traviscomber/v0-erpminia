-- Create maintenance_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.maintenance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  asset_id UUID,
  work_order_id UUID,
  maintenance_type VARCHAR(50),
  performed_by_name VARCHAR(255),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  parts_replaced TEXT,
  parts_cost DECIMAL(12, 2),
  labor_hours DECIMAL(8, 2),
  labor_cost DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES public.maintenance_assets(id) ON DELETE SET NULL,
  FOREIGN KEY (work_order_id) REFERENCES public.maintenance_work_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_maintenance_history_org ON public.maintenance_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_asset ON public.maintenance_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_work_order ON public.maintenance_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_created ON public.maintenance_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_history_asset_created ON public.maintenance_history(asset_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization isolation
CREATE POLICY "maintenance_history_org_isolation" ON public.maintenance_history
  USING (organization_id = auth.jwt() ->> 'org_id'::text OR 
         organization_id IN (
           SELECT id FROM public.organizations 
           WHERE id = auth.jwt() ->> 'org_id'::text
         ));

CREATE POLICY "maintenance_history_insert" ON public.maintenance_history
  FOR INSERT WITH CHECK (organization_id = auth.jwt() ->> 'org_id'::text);

CREATE POLICY "maintenance_history_update" ON public.maintenance_history
  FOR UPDATE USING (organization_id = auth.jwt() ->> 'org_id'::text);

CREATE POLICY "maintenance_history_delete" ON public.maintenance_history
  FOR DELETE USING (organization_id = auth.jwt() ->> 'org_id'::text);
