// Core enums and types for n3uralia ERP MVP
// Organized by module and entity type

// ========== ENUM DEFINITIONS ==========

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

export enum CompanyType {
  MINING_OPERATOR = 'mining_operator',
  CONTRACTOR = 'contractor',
  SERVICE_PROVIDER = 'service_provider',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
}

export enum DocumentCategory {
  OPERATIONAL = 'operational',
  SAFETY = 'safety',
  COMPLIANCE = 'compliance',
  MAINTENANCE = 'maintenance',
  FINANCIAL = 'financial',
  ADMINISTRATIVE = 'administrative',
}

export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  PREDICTIVE = 'predictive',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum InventoryMovementType {
  RECEIPT = 'receipt',
  ISSUANCE = 'issuance',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
  CONSUMPTION = 'consumption',
}

export enum InventoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

// ========== USER & COMPANY TYPES ==========

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  rut: string; // Chilean business ID
  address: string;
  city: string;
  region: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  contact_person: string;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  company_id: string;
  name: string;
  code: string;
  type: 'mining_site' | 'processing_plant' | 'warehouse' | 'office';
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostCenter {
  id: string;
  company_id: string;
  site_id?: string;
  code: string;
  name: string;
  description?: string;
  budget?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  site_id?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========== DOCUMENT MANAGEMENT TYPES ==========

export interface Document {
  id: string;
  company_id: string;
  site_id?: string;
  title: string;
  code: string;
  category: DocumentCategory;
  status: DocumentStatus;
  version: number;
  file_url: string;
  file_size: number;
  file_type: string;
  description?: string;
  issued_by: string;
  issue_date: string;
  expiration_date?: string;
  requires_renewal: boolean;
  responsible_user_id: string;
  tags?: string[];
  compliance_requirements?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  changes_description?: string;
  created_by: string;
  created_at: string;
}

export interface DocumentAuditLog {
  id: string;
  document_id: string;
  action: 'viewed' | 'downloaded' | 'created' | 'updated' | 'expired' | 'renewed';
  user_id: string;
  timestamp: string;
  details?: string;
}

// ========== MAINTENANCE TYPES ==========

export interface Asset {
  id: string;
  company_id: string;
  site_id: string;
  code: string;
  name: string;
  type: string;
  model?: string;
  manufacturer?: string;
  serial_number?: string;
  acquisition_date: string;
  location: string;
  status: 'operational' | 'maintenance' | 'retired';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
}

export interface MaintenanceOrder {
  id: string;
  company_id: string;
  site_id: string;
  order_number: string;
  asset_id: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  title: string;
  description: string;
  scheduled_date: string;
  start_date?: string;
  completion_date?: string;
  planned_duration_hours?: number;
  actual_duration_hours?: number;
  assigned_to_user_id: string;
  cost_center_id?: string;
  estimated_cost?: number;
  actual_cost?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceSparePart {
  id: string;
  maintenance_order_id: string;
  inventory_item_id: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
}

export interface MaintenanceMetric {
  id: string;
  asset_id: string;
  mtbf: number; // Mean Time Between Failures (hours)
  mttr: number; // Mean Time To Repair (hours)
  availability_percentage: number;
  total_failures: number;
  total_maintenance_hours: number;
  last_maintenance: string;
  next_scheduled_maintenance: string;
  updated_at: string;
}

// ========== INVENTORY/BODEGA TYPES ==========

export interface InventoryItem {
  id: string;
  company_id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  unit: string; // units, liters, kg, etc
  status: InventoryStatus;
  supplier_id?: string;
  unit_cost: number;
  reorder_point: number;
  reorder_quantity: number;
  lead_time_days: number;
  created_at: string;
  updated_at: string;
}

export interface WarehouseLocation {
  id: string;
  company_id: string;
  warehouse_id: string;
  code: string;
  name: string;
  zone: string;
  row: string;
  shelf: string;
  bin: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryStock {
  id: string;
  inventory_item_id: string;
  warehouse_location_id: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  quantity_available: number;
  last_counted: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  company_id: string;
  inventory_item_id: string;
  from_location_id?: string;
  to_location_id?: string;
  movement_type: InventoryMovementType;
  quantity: number;
  unit_cost: number;
  total_value: number;
  reference_number?: string;
  reason?: string;
  created_by: string;
  created_at: string;
}

export interface PhysicalCount {
  id: string;
  company_id: string;
  warehouse_id: string;
  count_date: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  counted_by: string;
  supervisor: string;
  discrepancies_found: number;
  discrepancy_value?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PhysicalCountLine {
  id: string;
  physical_count_id: string;
  inventory_item_id: string;
  location_id: string;
  expected_quantity: number;
  counted_quantity: number;
  variance: number;
  variance_reason?: string;
  created_at: string;
}

// ========== DASHBOARD & REPORTING TYPES ==========

export interface DashboardKPI {
  module: 'documents' | 'maintenance' | 'inventory';
  metric: string;
  value: number;
  trend: number;
  period: string;
  unit?: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  module: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
