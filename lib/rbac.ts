export type UserRole = 'superadmin' | 'admin' | 'manager' | 'technician' | 'warehouse_staff' | 'finance_officer' | 'viewer';

export type Permission = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';

export interface RolePermissions {
  [role: string]: {
    [module: string]: Permission[];
  };
}

export const rolePermissions: RolePermissions = {
  superadmin: {
    compras: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    bodega: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    finanzas: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    mantenimiento: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    documentos: ['create', 'read', 'update', 'delete', 'approve', 'export'],
  },
  admin: {
    compras: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    bodega: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    finanzas: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    mantenimiento: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    documentos: ['create', 'read', 'update', 'delete', 'approve', 'export'],
  },
  manager: {
    compras: ['read', 'create', 'update', 'approve', 'export'],
    bodega: ['read', 'create', 'update', 'approve', 'export'],
    finanzas: ['read', 'update', 'export'],
    mantenimiento: ['read', 'create', 'update', 'approve', 'export'],
    documentos: ['read', 'create', 'update', 'export'],
  },
  technician: {
    mantenimiento: ['read', 'update', 'export'],
    bodega: ['read', 'update', 'export'],
    documentos: ['read', 'create'],
  },
  warehouse_staff: {
    bodega: ['read', 'create', 'update', 'export'],
    compras: ['read'],
  },
  finance_officer: {
    finanzas: ['read', 'create', 'update', 'approve', 'export'],
    compras: ['read', 'export'],
  },
  viewer: {
    compras: ['read'],
    bodega: ['read'],
    finanzas: ['read'],
    mantenimiento: ['read'],
    documentos: ['read'],
  },
};

export function canPerform(role: UserRole, module: string, permission: Permission): boolean {
  const modulePermissions = rolePermissions[role]?.[module];
  return modulePermissions?.includes(permission) ?? false;
}

export function getVisibleFields(role: UserRole, module: string): string[] {
  const fieldVisibility: Record<string, Record<string, string[]>> = {
    superadmin: {
      compras: ['id', 'po_number', 'vendor', 'amount', 'status', 'created_by', 'created_at', 'modified_at', 'cost'],
      bodega: ['id', 'sku', 'name', 'quantity', 'cost', 'location', 'batch', 'received_date', 'modified_at'],
      finanzas: ['id', 'invoice', 'vendor', 'amount', 'status', 'due_date', 'paid_date', 'po_link', 'created_by'],
    },
    admin: {
      compras: ['id', 'po_number', 'vendor', 'amount', 'status', 'created_by', 'created_at', 'modified_at', 'cost'],
      bodega: ['id', 'sku', 'name', 'quantity', 'cost', 'location', 'batch', 'received_date', 'modified_at'],
      finanzas: ['id', 'invoice', 'vendor', 'amount', 'status', 'due_date', 'paid_date', 'po_link', 'created_by'],
    },
    manager: {
      compras: ['id', 'po_number', 'vendor', 'amount', 'status', 'created_at'],
      bodega: ['id', 'sku', 'name', 'quantity', 'location', 'batch', 'received_date'],
      finanzas: ['id', 'invoice', 'vendor', 'amount', 'status', 'due_date'],
    },
    technician: {
      mantenimiento: ['id', 'asset', 'status', 'assigned_to', 'priority'],
      bodega: ['id', 'sku', 'name', 'quantity', 'location'],
    },
    warehouse_staff: {
      bodega: ['id', 'sku', 'name', 'quantity', 'location', 'batch', 'received_date'],
    },
  };

  return fieldVisibility[role]?.[module] ?? [];
}

export function maskSensitiveData(role: UserRole, data: Record<string, any>, module: string): Record<string, any> {
  const visibleFields = getVisibleFields(role, module);
  const masked: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (visibleFields.includes(key)) {
      masked[key] = value;
    }
  }

  return masked;
}
