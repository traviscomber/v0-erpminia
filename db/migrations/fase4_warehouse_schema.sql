-- FASE 4: SISTEMA DE BODEGA/INVENTARIO
-- Warehouse locations, stock management, QR, transfers, reorder

-- 1. WAREHOUSE STRUCTURE
CREATE TABLE IF NOT EXISTS warehouse_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    zone_code TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, zone_code)
);

CREATE TABLE IF NOT EXISTS warehouse_racks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES warehouse_zones(id) ON DELETE CASCADE,
    rack_code TEXT NOT NULL,
    rack_name TEXT NOT NULL,
    capacity_units INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(zone_id, rack_code)
);

CREATE TABLE IF NOT EXISTS warehouse_bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_id UUID NOT NULL REFERENCES warehouse_racks(id) ON DELETE CASCADE,
    bin_code TEXT NOT NULL,
    bin_location TEXT,  -- e.g. "A-1-5"
    capacity_units INTEGER,
    current_stock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rack_id, bin_code)
);

-- 2. STOCK MANAGEMENT
CREATE TABLE IF NOT EXISTS warehouse_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    part_id UUID REFERENCES spare_parts(id) ON DELETE SET NULL,
    part_code TEXT NOT NULL,
    part_name TEXT NOT NULL,
    bin_id UUID REFERENCES warehouse_bins(id) ON DELETE SET NULL,
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_reserved INTEGER DEFAULT 0,
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    reorder_level INTEGER,
    reorder_quantity INTEGER,
    unit_cost NUMERIC,
    last_counted_date DATE,
    expiry_date DATE,
    batch_number TEXT,
    supplier_lot TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, part_code, batch_number)
);

-- 3. STOCK MOVEMENTS (IN/OUT/TRANSFER)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL,  -- in, out, transfer, adjustment, damaged
    quantity INTEGER NOT NULL,
    from_bin_id UUID REFERENCES warehouse_bins(id) ON DELETE SET NULL,
    to_bin_id UUID REFERENCES warehouse_bins(id) ON DELETE SET NULL,
    reference_doc TEXT,  -- PO number, WO number, etc
    reference_id UUID,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_quantity CHECK (quantity > 0)
);

-- 4. QR CODE TRACKING
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    qr_code_value TEXT NOT NULL,
    stock_id UUID NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
    bin_id UUID REFERENCES warehouse_bins(id),
    status TEXT DEFAULT 'active',  -- active, inactive, damaged
    scans_count INTEGER DEFAULT 0,
    last_scan_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, qr_code_value)
);

-- 5. QR SCAN LOG
CREATE TABLE IF NOT EXISTS qr_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT,  -- view, count, transfer, inspect
    bin_id_before UUID REFERENCES warehouse_bins(id),
    bin_id_after UUID REFERENCES warehouse_bins(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. TRANSFER REQUESTS
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    transfer_number TEXT NOT NULL,
    from_bin_id UUID NOT NULL REFERENCES warehouse_bins(id) ON DELETE CASCADE,
    to_bin_id UUID NOT NULL REFERENCES warehouse_bins(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending, in_transit, completed, cancelled
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    reason TEXT,
    UNIQUE(organization_id, transfer_number)
);

-- 7. REORDER ALERTS
CREATE TABLE IF NOT EXISTS reorder_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
    alert_type TEXT,  -- low_stock, overstock, expiry_warning, damaged
    threshold_value INTEGER,
    current_value INTEGER,
    status TEXT DEFAULT 'active',  -- active, acknowledged, resolved
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. INVENTORY COUNTS (Audits)
CREATE TABLE IF NOT EXISTS inventory_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    count_number TEXT NOT NULL,
    count_date DATE,
    zone_id UUID REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    variance_found BOOLEAN DEFAULT FALSE,
    variance_percentage NUMERIC,
    status TEXT DEFAULT 'in_progress',  -- in_progress, completed, reconciled
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, count_number)
);

CREATE TABLE IF NOT EXISTS inventory_count_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    count_id UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES warehouse_stock(id) ON DELETE CASCADE,
    counted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    system_quantity INTEGER,
    physical_quantity INTEGER,
    variance INTEGER GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY warehouse_stock_org ON warehouse_stock
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY stock_movements_org ON stock_movements
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));
CREATE POLICY qr_codes_org ON qr_codes
    USING (organization_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid()));

-- INDEXES
CREATE INDEX idx_warehouse_stock_org ON warehouse_stock(organization_id);
CREATE INDEX idx_warehouse_stock_part_code ON warehouse_stock(part_code);
CREATE INDEX idx_warehouse_stock_bin_id ON warehouse_stock(bin_id);
CREATE INDEX idx_warehouse_stock_quantity ON warehouse_stock(quantity_on_hand);
CREATE INDEX idx_stock_movements_stock_id ON stock_movements(stock_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_qr_codes_value ON qr_codes(qr_code_value);
CREATE INDEX idx_qr_codes_stock_id ON qr_codes(stock_id);
CREATE INDEX idx_transfers_status ON stock_transfers(status);
CREATE INDEX idx_reorder_alerts_stock ON reorder_alerts(stock_id);
CREATE INDEX idx_inventory_counts_status ON inventory_counts(status);
