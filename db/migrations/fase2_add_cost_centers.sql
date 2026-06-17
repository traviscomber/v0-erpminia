-- FASE 2: Add cost_center_id to work orders, documents, requisitions, and sustainability tables
-- This script adds foreign key relationships to cost_centers table

-- 1. Work Orders (Maintenance)
ALTER TABLE IF EXISTS work_orders
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_cost_center ON work_orders(cost_center_id);

-- 2. Documents
ALTER TABLE IF EXISTS documents
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_cost_center ON documents(cost_center_id);

-- 3. Requisitions / Purchase Requests (Finanzas)
ALTER TABLE IF EXISTS requisitions
ADD COLUMN IF NOT EXISTS cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_requisitions_cost_center ON requisitions(cost_center_id);

-- 4. Purchase Orders (Finanzas)
ALTER TABLE IF EXISTS purchase_orders
ADD COLUMN IF NOT EXISTS cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_cost_center ON purchase_orders(cost_center_id);

-- 5. Non-conformities / No-conformidades (Sostenibilidad)
ALTER TABLE IF EXISTS non_conformities
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_non_conformities_cost_center ON non_conformities(cost_center_id);

-- 6. Audit Log already has organization_id, optionally add cost_center_id for detailed tracking
ALTER TABLE IF EXISTS audit_log
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_cost_center ON audit_log(cost_center_id);
