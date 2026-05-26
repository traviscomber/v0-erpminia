// FASE 1: RBAC Types & Interfaces

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'assign' | 'transfer' | 'scan_qr' | 'close' | 'manage_users' | 'manage_roles' | 'manage_organization' | 'audit_logs';

export type Resource = 'documents' | 'maintenance' | 'inventory' | 'reports' | 'admin';

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface Role {
  id: string;
  organization_id: string;
  name: string; // 'admin', 'manager', 'operator', 'viewer'
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Permission {
  id: string;
  resource: Resource;
  action: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  organization_id: string;
  assigned_at: string;
  assigned_by?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  country: string;
  timezone: string;
  logo_url?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  roles: UserRole[];
}

export interface CostCenter {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description?: string;
  manager_id?: string;
  budget_annual?: number;
  budget_used?: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description?: string;
  department_head_id?: string;
  cost_center_id?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  rut?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  country: string;
  business_type: string;
  contact_person?: string;
  payment_terms?: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  site_id?: string;
  manager_id?: string;
  address?: string;
  capacity_m3?: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface WarehouseLocation {
  id: string;
  warehouse_id: string;
  aisle: string;
  row: number;
  bin: number;
  level?: number;
  qr_code?: string;
  capacity_units?: number;
  current_units: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id?: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  resource_type: string;
  resource_id?: string;
  resource_identifier?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status: 'completed' | 'failed';
  error_message?: string;
  created_at: string;
}

export interface RBACContext {
  user_id: string;
  organization_id: string;
  roles: string[];
  permissions: Permission[];
}
