// FASE 1: RBAC Service - Gestión de roles y permisos

import { createClient } from '@/lib/supabase/client';
import type { RBACContext, Permission, Role, UserRole } from '@/lib/types/rbac';

export class RBACService {
  private static supabase = createClient();

  /**
   * Obtener contexto RBAC del usuario actual
   */
  static async getUserRBACContext(userId: string, organizationId: string): Promise<RBACContext> {
    try {
      // Obtener roles del usuario en la organización
      const { data: userRoles, error: rolesError } = await this.supabase
        .from('user_roles')
        .select(`
          role_id,
          roles(name)
        `)
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (rolesError) throw rolesError;

      const roleIds = userRoles?.map(ur => ur.role_id) || [];
      const roleNames = userRoles?.map((ur: any) => ur.roles?.name).filter(Boolean) || [];

      // Obtener permisos para esos roles
      const { data: permissions, error: permError } = await this.supabase
        .from('role_permissions')
        .select(`
          permission_id,
          permissions(resource, action, description)
        `)
        .in('role_id', roleIds);

      if (permError) throw permError;

      const permissionList = permissions?.map((p: any) => p.permissions).filter(Boolean) || [];

      return {
        user_id: userId,
        organization_id: organizationId,
        roles: roleNames,
        permissions: permissionList,
      };
    } catch (error) {
      console.error('[v0] Error getting RBAC context:', error);
      throw error;
    }
  }

  /**
   * Verificar si usuario tiene un permiso específico
   */
  static async hasPermission(
    userId: string,
    organizationId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      const context = await this.getUserRBACContext(userId, organizationId);
      return context.permissions.some(
        p => p.resource === resource && p.action === action
      );
    } catch (error) {
      console.error('[v0] Error checking permission:', error);
      return false;
    }
  }

  /**
   * Verificar si usuario tiene algún rol específico
   */
  static async hasRole(
    userId: string,
    organizationId: string,
    roleNames: string[]
  ): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('user_roles')
        .select(`roles(name)`)
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      const userRoles = data?.map((ur: any) => ur.roles?.name).filter(Boolean) || [];
      return roleNames.some(role => userRoles.includes(role));
    } catch (error) {
      console.error('[v0] Error checking role:', error);
      return false;
    }
  }

  /**
   * Crear nuevo rol
   */
  static async createRole(organizationId: string, role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await this.supabase
        .from('roles')
        .insert({
          ...role,
          organization_id: organizationId,
        })
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('[v0] Error creating role:', error);
      throw error;
    }
  }

  /**
   * Asignar permiso a rol
   */
  static async assignPermissionToRole(roleId: string, permissionId: string) {
    try {
      const { data, error } = await this.supabase
        .from('role_permissions')
        .insert({
          role_id: roleId,
          permission_id: permissionId,
        })
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('[v0] Error assigning permission to role:', error);
      throw error;
    }
  }

  /**
   * Asignar rol a usuario
   */
  static async assignRoleToUser(userId: string, roleId: string, organizationId: string, assignedBy: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          organization_id: organizationId,
          assigned_by: assignedBy,
        })
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('[v0] Error assigning role to user:', error);
      throw error;
    }
  }

  /**
   * Remover rol de usuario
   */
  static async removeRoleFromUser(userId: string, roleId: string, organizationId: string) {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('organization_id', organizationId);

      if (error) throw error;
    } catch (error) {
      console.error('[v0] Error removing role from user:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los roles de una organización
   */
  static async getOrganizationRoles(organizationId: string) {
    try {
      const { data, error } = await this.supabase
        .from('roles')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[v0] Error getting organization roles:', error);
      throw error;
    }
  }

  /**
   * Obtener permisos de un rol
   */
  static async getRolePermissions(roleId: string) {
    try {
      const { data, error } = await this.supabase
        .from('role_permissions')
        .select(`
          permission_id,
          permissions(*)
        `)
        .eq('role_id', roleId);

      if (error) throw error;
      return data?.map((rp: any) => rp.permissions) || [];
    } catch (error) {
      console.error('[v0] Error getting role permissions:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los permisos disponibles
   */
  static async getAllPermissions() {
    try {
      const { data, error } = await this.supabase
        .from('permissions')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[v0] Error getting all permissions:', error);
      throw error;
    }
  }

  /**
   * Inicializar roles estándar para nueva organización
   */
  static async initializeDefaultRoles(organizationId: string, createdBy: string) {
    const defaultRoles = [
      { name: 'admin', description: 'Acceso total a la plataforma' },
      { name: 'manager', description: 'Gestor de operaciones' },
      { name: 'operator', description: 'Operador de equipos' },
      { name: 'viewer', description: 'Solo lectura' },
    ];

    try {
      for (const role of defaultRoles) {
        await this.createRole(organizationId, {
          ...role,
          organization_id: organizationId,
          status: 'active',
          created_by: createdBy,
        });
      }
    } catch (error) {
      console.error('[v0] Error initializing default roles:', error);
      throw error;
    }
  }

  /**
   * Verificar permisos múltiples (AND logic)
   */
  static async hasAllPermissions(
    userId: string,
    organizationId: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    try {
      const context = await this.getUserRBACContext(userId, organizationId);
      return permissions.every(perm =>
        context.permissions.some(
          p => p.resource === perm.resource && p.action === perm.action
        )
      );
    } catch (error) {
      console.error('[v0] Error checking all permissions:', error);
      return false;
    }
  }

  /**
   * Verificar permisos múltiples (OR logic)
   */
  static async hasAnyPermission(
    userId: string,
    organizationId: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    try {
      const context = await this.getUserRBACContext(userId, organizationId);
      return permissions.some(perm =>
        context.permissions.some(
          p => p.resource === perm.resource && p.action === perm.action
        )
      );
    } catch (error) {
      console.error('[v0] Error checking any permission:', error);
      return false;
    }
  }
}

export default RBACService;
