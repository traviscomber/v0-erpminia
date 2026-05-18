-- FASE 1: MAESTROS & TABLAS CORE - SQL Migration
-- Este archivo contiene todos los DDLs necesarios para FASE 1 del MVP

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. ORGANIZATIONS (Multi-Tenant Foundation)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT, -- 'mining', 'construction', 'oil_gas', etc
  country TEXT DEFAULT 'CL',
  timezone TEXT DEFAULT 'America/Santiago',
  logo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. COST CENTERS (Centros de Costo)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES auth.users(id),
  budget_annual NUMERIC(15,2),
  budget_used NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, code)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. DEPARTMENTS (Departamentos)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  department_head_id UUID REFERENCES auth.users(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, code)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 4. ROLES (RBAC - Role-Based Access Control)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'admin', 'manager', 'operator', 'viewer', 'driver', etc
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, name)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 5. PERMISSIONS (Permisos granulares)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL, -- 'documents', 'maintenance', 'inventory', etc
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'approve'
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 6. ROLE_PERMISSIONS (Mapping roles → permissions)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 7. USER_ROLES (Assignment de roles a users)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role_id, organization_id)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 8. SUPPLIERS (Proveedores)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rut TEXT, -- RUT único si es chileno
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'CL',
  business_type TEXT, -- 'equipment', 'parts', 'services', 'labor'
  contact_person TEXT,
  payment_terms TEXT, -- 'net_30', 'net_60', 'cash', etc
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 9. WAREHOUSES (Bodegas para inventario)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  site_id UUID REFERENCES plants(id), -- Opcional: asociar a una planta/faena
  manager_id UUID REFERENCES auth.users(id),
  address TEXT,
  capacity_m3 NUMERIC(10,2), -- Capacidad en metros cúbicos
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, code)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 10. WAREHOUSE_LOCATIONS (Ubicaciones dentro de bodega)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  aisle TEXT NOT NULL, -- Pasillo: A, B, C...
  row INTEGER NOT NULL, -- Fila: 1, 2, 3...
  bin INTEGER NOT NULL, -- Bin/Compartimiento: 1, 2, 3...
  level INTEGER, -- Nivel: 1, 2, 3...
  qr_code TEXT UNIQUE, -- QR única
  capacity_units INTEGER, -- Capacidad en unidades
  current_units INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(warehouse_id, aisle, row, bin, level)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 11. AUDIT_LOG (Sistema centralizado de auditoría)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', etc
  resource_type TEXT NOT NULL, -- 'document', 'maintenance_order', 'inventory_item', etc
  resource_id UUID,
  resource_identifier TEXT, -- Para casos donde no hay UUID (e.g., document name)
  old_values JSONB, -- Estado anterior (para updates)
  new_values JSONB, -- Nuevo estado
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_audit_org_user (organization_id, user_id),
  INDEX idx_audit_resource (resource_type, resource_id),
  INDEX idx_audit_created_at (created_at DESC)
);

-- ════════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON cost_centers(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_org ON warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_warehouse ON warehouse_locations(warehouse_id);

-- ════════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see orgs they belong to
CREATE POLICY org_users_can_view ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = organizations.id
      AND user_roles.user_id = auth.uid()
    )
  );

-- Cost Centers: Users can only see CC in their org
CREATE POLICY cc_org_isolation ON cost_centers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Departments: Same org isolation
CREATE POLICY dept_org_isolation ON departments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Suppliers: Same org isolation
CREATE POLICY supplier_org_isolation ON suppliers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Warehouses: Same org isolation
CREATE POLICY warehouse_org_isolation ON warehouses FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Warehouse Locations: Access through warehouse org
CREATE POLICY warehouse_location_org_isolation ON warehouse_locations FOR SELECT
  USING (
    warehouse_id IN (
      SELECT id FROM warehouses
      WHERE organization_id IN (
        SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Audit Log: Users can only see their org's audit logs
CREATE POLICY audit_log_org_isolation ON audit_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════════
-- SEED DATA (Permisos estándar para todos los módulos)
-- ════════════════════════════════════════════════════════════════════════════════

INSERT INTO permissions (resource, action, description) VALUES
-- Documents
('documents', 'create', 'Crear nuevo documento'),
('documents', 'read', 'Ver documentos'),
('documents', 'update', 'Editar documentos'),
('documents', 'delete', 'Eliminar documentos'),
('documents', 'approve', 'Aprobar documentos'),
('documents', 'export', 'Exportar documentos'),
-- Maintenance
('maintenance', 'create', 'Crear orden de mantenimiento'),
('maintenance', 'read', 'Ver órdenes de mantenimiento'),
('maintenance', 'update', 'Editar órdenes de mantenimiento'),
('maintenance', 'delete', 'Eliminar órdenes de mantenimiento'),
('maintenance', 'assign', 'Asignar técnico'),
('maintenance', 'close', 'Cerrar orden'),
-- Inventory
('inventory', 'create', 'Crear items de inventario'),
('inventory', 'read', 'Ver inventario'),
('inventory', 'update', 'Editar inventario'),
('inventory', 'delete', 'Eliminar items'),
('inventory', 'transfer', 'Transferir entre bodegas'),
('inventory', 'scan_qr', 'Escanear QR'),
-- Reports
('reports', 'read', 'Ver reportes'),
('reports', 'export', 'Exportar reportes'),
-- Admin
('admin', 'manage_users', 'Gestionar usuarios'),
('admin', 'manage_roles', 'Gestionar roles'),
('admin', 'manage_organization', 'Gestionar organización'),
('admin', 'audit_logs', 'Ver logs de auditoría')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════════

-- Función para registrar cambios en audit_log automáticamente
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    user_agent
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    current_setting('request.headers')::json->>'user-agent'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear triggers para auditoría automática en tablas clave
CREATE TRIGGER audit_cost_centers
AFTER INSERT OR UPDATE OR DELETE ON cost_centers
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_departments
AFTER INSERT OR UPDATE OR DELETE ON departments
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_suppliers
AFTER INSERT OR UPDATE OR DELETE ON suppliers
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- ════════════════════════════════════════════════════════════════════════════════
-- NOTES
-- ════════════════════════════════════════════════════════════════════════════════
/*
Para crear más triggers de auditoría en otros módulos, seguir el patrón:

CREATE TRIGGER audit_{table_name}
AFTER INSERT OR UPDATE OR DELETE ON {table_name}
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

Este script debe ejecutarse en Supabase mediante:
1. SQL Editor en Supabase Dashboard, O
2. Herramienta de migración tipo Prisma/Migrations

Las políticas RLS garantizan que cada usuario solo vea datos de su organización.
*/
