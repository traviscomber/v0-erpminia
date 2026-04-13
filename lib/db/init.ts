import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function initializeDatabase() {
  try {
    console.log('[v0] Starting database initialization...');

    // Create tables using Supabase admin client
    const { error } = await supabase.rpc('execute_sql', {
      sql: `
        -- Disable RLS temporarily for setup
        ALTER ROLE postgres WITH NOLOGIN;

        -- Companies table
        CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR NOT NULL,
          type VARCHAR NOT NULL,
          rut VARCHAR UNIQUE NOT NULL,
          address VARCHAR,
          city VARCHAR,
          region VARCHAR,
          country VARCHAR DEFAULT 'Chile',
          phone VARCHAR,
          email VARCHAR,
          website VARCHAR,
          contact_person VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Sites table
        CREATE TABLE IF NOT EXISTS sites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id),
          name VARCHAR NOT NULL,
          code VARCHAR NOT NULL,
          type VARCHAR NOT NULL,
          address VARCHAR,
          city VARCHAR,
          latitude NUMERIC,
          longitude NUMERIC,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Cost Centers table
        CREATE TABLE IF NOT EXISTS cost_centers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id),
          site_id UUID REFERENCES sites(id),
          code VARCHAR NOT NULL,
          name VARCHAR NOT NULL,
          description TEXT,
          budget NUMERIC,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY REFERENCES auth.users(id),
          company_id UUID NOT NULL REFERENCES companies(id),
          email VARCHAR NOT NULL,
          full_name VARCHAR NOT NULL,
          phone VARCHAR,
          role VARCHAR DEFAULT 'operator',
          site_id UUID REFERENCES sites(id),
          department VARCHAR,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Documents table
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id),
          site_id UUID REFERENCES sites(id),
          title VARCHAR NOT NULL,
          code VARCHAR NOT NULL,
          category VARCHAR NOT NULL,
          status VARCHAR DEFAULT 'draft',
          version INTEGER DEFAULT 1,
          file_url VARCHAR NOT NULL,
          file_size INTEGER,
          file_type VARCHAR,
          description TEXT,
          issued_by VARCHAR,
          issue_date DATE,
          expiration_date DATE,
          requires_renewal BOOLEAN DEFAULT false,
          responsible_user_id UUID REFERENCES users(id),
          tags TEXT[],
          compliance_requirements TEXT[],
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Assets table
        CREATE TABLE IF NOT EXISTS assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id),
          site_id UUID NOT NULL REFERENCES sites(id),
          code VARCHAR NOT NULL,
          name VARCHAR NOT NULL,
          type VARCHAR NOT NULL,
          model VARCHAR,
          manufacturer VARCHAR,
          serial_number VARCHAR,
          acquisition_date DATE,
          location VARCHAR,
          status VARCHAR DEFAULT 'operational',
          criticality VARCHAR DEFAULT 'medium',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Maintenance Orders table
        CREATE TABLE IF NOT EXISTS maintenance_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id),
          site_id UUID NOT NULL REFERENCES sites(id),
          order_number VARCHAR NOT NULL,
          asset_id UUID NOT NULL REFERENCES assets(id),
          type VARCHAR NOT NULL,
          status VARCHAR DEFAULT 'scheduled',
          priority VARCHAR DEFAULT 'medium',
          title VARCHAR NOT NULL,
          description TEXT,
          scheduled_date TIMESTAMP,
          start_date TIMESTAMP,
          completion_date TIMESTAMP,
          planned_duration_hours NUMERIC,
          actual_duration_hours NUMERIC,
          assigned_to_user_id UUID REFERENCES users(id),
          cost_center_id UUID REFERENCES cost_centers(id),
          estimated_cost NUMERIC,
          actual_cost NUMERIC,
          notes TEXT,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Inventory Items table
        CREATE TABLE IF NOT EXISTS inventory_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id),
          code VARCHAR NOT NULL,
          name VARCHAR NOT NULL,
          category VARCHAR NOT NULL,
          description TEXT,
          unit VARCHAR DEFAULT 'units',
          status VARCHAR DEFAULT 'active',
          supplier_id UUID,
          unit_cost NUMERIC NOT NULL,
          reorder_point NUMERIC NOT NULL,
          reorder_quantity NUMERIC NOT NULL,
          lead_time_days INTEGER DEFAULT 7,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Warehouse Locations table
        CREATE TABLE IF NOT EXISTS warehouse_locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id),
          warehouse_id UUID,
          code VARCHAR NOT NULL,
          name VARCHAR NOT NULL,
          zone VARCHAR,
          row VARCHAR,
          shelf VARCHAR,
          bin VARCHAR,
          capacity NUMERIC,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Inventory Stock table
        CREATE TABLE IF NOT EXISTS inventory_stock (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
          warehouse_location_id UUID NOT NULL REFERENCES warehouse_locations(id),
          quantity_on_hand NUMERIC DEFAULT 0,
          quantity_allocated NUMERIC DEFAULT 0,
          quantity_available NUMERIC DEFAULT 0,
          last_counted TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Inventory Movements table
        CREATE TABLE IF NOT EXISTS inventory_movements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id),
          inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
          from_location_id UUID REFERENCES warehouse_locations(id),
          to_location_id UUID REFERENCES warehouse_locations(id),
          movement_type VARCHAR NOT NULL,
          quantity NUMERIC NOT NULL,
          unit_cost NUMERIC NOT NULL,
          total_value NUMERIC NOT NULL,
          reference_number VARCHAR,
          reason TEXT,
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Audit Logs table
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID NOT NULL REFERENCES companies(id),
          user_id UUID REFERENCES users(id),
          module VARCHAR NOT NULL,
          action VARCHAR NOT NULL,
          entity_type VARCHAR NOT NULL,
          entity_id UUID NOT NULL,
          changes JSONB,
          ip_address VARCHAR,
          user_agent VARCHAR,
          created_at TIMESTAMP DEFAULT NOW()
        );

        -- Create indexes for performance
        CREATE INDEX idx_documents_company_id ON documents(company_id);
        CREATE INDEX idx_documents_status ON documents(status);
        CREATE INDEX idx_maintenance_orders_company_id ON maintenance_orders(company_id);
        CREATE INDEX idx_maintenance_orders_status ON maintenance_orders(status);
        CREATE INDEX idx_inventory_items_company_id ON inventory_items(company_id);
        CREATE INDEX idx_inventory_stock_item_id ON inventory_stock(inventory_item_id);
        CREATE INDEX idx_inventory_movements_company_id ON inventory_movements(company_id);
        CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
        CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

        -- Enable RLS
        ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
        ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
        ALTER TABLE maintenance_orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
        ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
      `,
    });

    if (error) {
      console.error('[v0] Database initialization error:', error);
      throw error;
    }

    console.log('[v0] Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('[v0] Failed to initialize database:', error);
    throw error;
  }
}
