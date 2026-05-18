// Role-Based Access Control Engine
// Supports: Admin, Manager, Operator, Viewer roles with granular permissions

export type Role = 'admin' | 'manager' | 'operator' | 'viewer';
export type Permission = 
  | 'create:nc'
  | 'edit:nc'
  | 'approve:nc'
  | 'delete:nc'
  | 'create:ca'
  | 'assign:ca'
  | 'close:ca'
  | 'view:reports'
  | 'export:data'
  | 'manage:users';

interface RolePermissions {
  [key in Role]: Permission[];
}

const ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    'create:nc',
    'edit:nc',
    'approve:nc',
    'delete:nc',
    'create:ca',
    'assign:ca',
    'close:ca',
    'view:reports',
    'export:data',
    'manage:users',
  ],
  manager: [
    'create:nc',
    'edit:nc',
    'approve:nc',
    'create:ca',
    'assign:ca',
    'view:reports',
    'export:data',
  ],
  operator: ['create:nc', 'edit:nc', 'create:ca', 'assign:ca'],
  viewer: ['view:reports'],
};

export class RBACEngine {
  static hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  }

  static hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(perm => this.hasPermission(role, perm));
  }

  static hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(perm => this.hasPermission(role, perm));
  }

  static getPermissionDescription(permission: Permission): string {
    const descriptions: Record<Permission, string> = {
      'create:nc': 'Crear No-Conformidades',
      'edit:nc': 'Editar No-Conformidades',
      'approve:nc': 'Aprobar No-Conformidades',
      'delete:nc': 'Eliminar No-Conformidades',
      'create:ca': 'Crear Acciones Correctivas',
      'assign:ca': 'Asignar Acciones Correctivas',
      'close:ca': 'Cerrar Acciones Correctivas',
      'view:reports': 'Ver Reportes',
      'export:data': 'Exportar Datos',
      'manage:users': 'Gestionar Usuarios',
    };
    return descriptions[permission] || permission;
  }
}

export function withPermission(permission: Permission) {
  return function decorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (userRole: Role, ...args: any[]) {
      if (!RBACEngine.hasPermission(userRole, permission)) {
        throw new Error(`Acceso denegado: requiere permiso '${permission}'`);
      }
      return originalMethod.apply(this, [userRole, ...args]);
    };

    return descriptor;
  };
}
