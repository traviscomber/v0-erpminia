-- FASE 3: Ledger de costos de mantenimiento y equipos
-- Guarda costos operativos por OT y costos importados desde Excel por equipo/vehiculo.

CREATE TABLE IF NOT EXISTS maintenance_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'work_order',
    source_sheet TEXT,
    source_row INTEGER,
    row_signature TEXT,
    maintenance_order_id UUID REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES maintenance_assets(id) ON DELETE SET NULL,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    cost_date DATE NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW(),
    account_code TEXT,
    account_name TEXT,
    document_number TEXT,
    concept TEXT,
    category_snapshot TEXT,
    equipment_name_snapshot TEXT,
    asset_code_snapshot TEXT,
    matched_by TEXT,
    match_confidence NUMERIC,
    parts_cost NUMERIC DEFAULT 0,
    labor_cost NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_costs_org_signature
    ON maintenance_costs (organization_id, row_signature);

CREATE INDEX IF NOT EXISTS idx_maintenance_costs_org
    ON maintenance_costs (organization_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_costs_asset
    ON maintenance_costs (asset_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_costs_cost_center
    ON maintenance_costs (cost_center_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_costs_source_type
    ON maintenance_costs (source_type);

CREATE INDEX IF NOT EXISTS idx_maintenance_costs_cost_date
    ON maintenance_costs (cost_date DESC);

ALTER TABLE maintenance_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_costs_org_isolation ON maintenance_costs
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));
