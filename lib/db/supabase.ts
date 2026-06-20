import { createClient } from '@supabase/supabase-js';

// Lazy-initialize Supabase clients to avoid env var errors at build time
function getClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error('Faltan variables de entorno de Supabase');
  }

  return {
    supabase: createClient(supabaseUrl, supabaseAnonKey),
    supabaseAdmin: createClient(supabaseUrl, supabaseServiceRoleKey),
  };
}

// Export factory functions
export function getSupabaseClient() {
  return getClients().supabase;
}

export function getSupabaseAdmin() {
  return getClients().supabaseAdmin;
}

// Database initialization helper
export async function initializeDatabase() {
  try {
    // Create tables - Usuarios y Autenticación
    await getSupabaseAdmin().rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          full_name VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user',
          company_id UUID REFERENCES companies(id),
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          rut VARCHAR(20),
          industry VARCHAR(100),
          region VARCHAR(100),
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS sites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID REFERENCES companies(id) NOT NULL,
          name VARCHAR(255) NOT NULL,
          location VARCHAR(255),
          code VARCHAR(50),
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS cost_centers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          site_id UUID REFERENCES sites(id) NOT NULL,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50),
          budget DECIMAL(15, 2),
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS warehouses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          site_id UUID REFERENCES sites(id) NOT NULL,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50),
          capacity_units INT,
          manager_id UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS inventory_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          warehouse_id UUID REFERENCES warehouses(id) NOT NULL,
          name VARCHAR(255) NOT NULL,
          sku VARCHAR(100) UNIQUE,
          category VARCHAR(100),
          unit_cost DECIMAL(15, 2),
          current_stock INT,
          minimum_stock INT,
          maximum_stock INT,
          reorder_point INT,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS stock_movements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          inventory_item_id UUID REFERENCES inventory_items(id) NOT NULL,
          movement_type VARCHAR(50),
          quantity INT,
          reason VARCHAR(255),
          user_id UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          site_id UUID REFERENCES sites(id) NOT NULL,
          name VARCHAR(255) NOT NULL,
          asset_code VARCHAR(100) UNIQUE,
          category VARCHAR(100),
          status VARCHAR(50),
          last_maintenance TIMESTAMP,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS maintenance_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          asset_id UUID REFERENCES assets(id) NOT NULL,
          order_type VARCHAR(50),
          status VARCHAR(50),
          description TEXT,
          scheduled_date TIMESTAMP,
          completion_date TIMESTAMP,
          technician_id UUID REFERENCES users(id),
          cost_center_id UUID REFERENCES cost_centers(id),
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS maintenance_spare_parts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          maintenance_order_id UUID REFERENCES maintenance_orders(id),
          inventory_item_id UUID REFERENCES inventory_items(id),
          quantity INT,
          created_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_id UUID REFERENCES companies(id) NOT NULL,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          document_type VARCHAR(100),
          file_path VARCHAR(255),
          file_size INT,
          expiration_date DATE,
          status VARCHAR(50),
          compliance_requirement VARCHAR(100),
          user_id UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS document_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID REFERENCES documents(id),
          version_number INT,
          file_path VARCHAR(255),
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS document_approvals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID REFERENCES documents(id),
          user_id UUID REFERENCES users(id),
          status VARCHAR(50),
          comments TEXT,
          created_at TIMESTAMP DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type VARCHAR(100),
          entity_id UUID,
          action VARCHAR(50),
          changes JSONB,
          user_id UUID REFERENCES users(id),
          created_at TIMESTAMP DEFAULT now()
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
        CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(company_id);
        CREATE INDEX IF NOT EXISTS idx_warehouses_site ON warehouses(site_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory_items(warehouse_id);
        CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
        CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_orders(asset_id);
        CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(inventory_item_id);
      `
    });

    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error: (error as Error).message };
  }
}
