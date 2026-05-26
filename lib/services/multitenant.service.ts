// FASE 1: Multi-Tenant Service - Organization management y isolation

import { createClient } from '@/lib/supabase/client';
import type { Organization } from '@/lib/types/rbac';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  industry?: string;
  country?: string;
  timezone?: string;
  logo_url?: string;
}

export class MultiTenantService {
  private static supabase = createClient();

  /**
   * Crear nueva organización
   */
  static async createOrganization(
    input: CreateOrganizationInput,
    userId: string
  ): Promise<Organization> {
    try {
      // Validar slug únique
      const { data: existing } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('slug', input.slug)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error('Organization slug already exists');
      }

      const { data, error } = await this.supabase
        .from('organizations')
        .insert({
          ...input,
          country: input.country || 'CL',
          timezone: input.timezone || 'America/Santiago',
          status: 'active',
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-crear admin role para la nueva org
      await this.supabase
        .from('roles')
        .insert({
          organization_id: data.id,
          name: 'admin',
          description: 'Administrator access',
          status: 'active',
          created_by: userId,
        });

      // Asignar creador como admin
      const { data: adminRole } = await this.supabase
        .from('roles')
        .select('id')
        .eq('organization_id', data.id)
        .eq('name', 'admin')
        .limit(1);

      if (adminRole && adminRole.length > 0) {
        await this.supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role_id: adminRole[0].id,
            organization_id: data.id,
            assigned_by: userId,
          });
      }

      console.log('[v0] Organization created:', data.id);
      return data;
    } catch (error) {
      console.error('[v0] Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Obtener organización por ID
   */
  static async getOrganization(organizationId: string): Promise<Organization | null> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('[v0] Error fetching organization:', error);
      return null;
    }
  }

  /**
   * Obtener organización por slug
   */
  static async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('[v0] Error fetching organization by slug:', error);
      return null;
    }
  }

  /**
   * Obtener todas las organizaciones del usuario actual
   */
  static async getUserOrganizations(userId: string): Promise<Organization[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .select(`
          organizations(*)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Deduplicate organizations
      const orgs = data?.map((ur: any) => ur.organizations).filter(Boolean) || [];
      const uniqueOrgs = Array.from(
        new Map(orgs.map(org => [org.id, org])).values()
      );

      return uniqueOrgs;
    } catch (error) {
      console.error('[v0] Error fetching user organizations:', error);
      throw error;
    }
  }

  /**
   * Actualizar información de organización
   */
  static async updateOrganization(
    organizationId: string,
    updates: Partial<Organization>
  ): Promise<Organization | null> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)
        .select()
        .single();

      if (error) throw error;
      console.log('[v0] Organization updated:', organizationId);
      return data;
    } catch (error) {
      console.error('[v0] Error updating organization:', error);
      throw error;
    }
  }

  /**
   * Verificar acceso del usuario a una organización
   */
  static async verifyUserAccess(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .limit(1);

      return !!(data && data.length > 0);
    } catch (error) {
      console.error('[v0] Error verifying user access:', error);
      return false;
    }
  }

  /**
   * Invitar usuario a organización
   */
  static async inviteUserToOrganization(
    organizationId: string,
    userEmail: string,
    roleId: string,
    invitedBy: string
  ) {
    try {
      // Obtener usuario por email
      const { data: { users }, error: userError } = await this.supabase.auth.admin.listUsers();

      if (userError) throw userError;

      const targetUser = users?.find(u => u.email === userEmail);
      if (!targetUser) {
        throw new Error('User not found');
      }

      // Asignar rol
      const { data, error } = await this.supabase
        .from('user_roles')
        .insert({
          user_id: targetUser.id,
          role_id: roleId,
          organization_id: organizationId,
          assigned_by: invitedBy,
        })
        .select();

      if (error) throw error;
      console.log('[v0] User invited to organization:', targetUser.id);
      return data?.[0];
    } catch (error) {
      console.error('[v0] Error inviting user:', error);
      throw error;
    }
  }

  /**
   * Remover usuario de organización
   */
  static async removeUserFromOrganization(
    userId: string,
    organizationId: string
  ) {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      console.log('[v0] User removed from organization');
    } catch (error) {
      console.error('[v0] Error removing user:', error);
      throw error;
    }
  }

  /**
   * Obtener miembros de organización
   */
  static async getOrganizationMembers(organizationId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .select(`
          user_id,
          role_id,
          roles(name),
          assigned_at
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[v0] Error fetching organization members:', error);
      throw error;
    }
  }

  /**
   * Cambiar rol de usuario en organización
   */
  static async changeUserRole(
    userId: string,
    organizationId: string,
    newRoleId: string,
    changedBy: string
  ) {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .update({ role_id: newRoleId })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .select();

      if (error) throw error;

      // Log to audit
      await this.supabase
        .from('audit_log')
        .insert({
          organization_id: organizationId,
          user_id: changedBy,
          action: 'update',
          resource_type: 'user_role',
          resource_id: userId,
          new_values: { role_id: newRoleId },
        });

      console.log('[v0] User role changed');
      return data?.[0];
    } catch (error) {
      console.error('[v0] Error changing user role:', error);
      throw error;
    }
  }

  /**
   * Suspender organización
   */
  static async suspendOrganization(organizationId: string, reason: string) {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .update({
          status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)
        .select()
        .single();

      if (error) throw error;

      // Log suspension
      await this.supabase
        .from('audit_log')
        .insert({
          organization_id: organizationId,
          action: 'update',
          resource_type: 'organization',
          resource_id: organizationId,
          new_values: { status: 'suspended', reason },
        });

      console.log('[v0] Organization suspended:', organizationId);
      return data;
    } catch (error) {
      console.error('[v0] Error suspending organization:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de organización
   */
  static async getOrganizationStats(organizationId: string) {
    try {
      const [
        { data: members },
        { data: departments },
        { data: costCenters },
        { data: suppliers },
      ] = await Promise.all([
        this.supabase
          .from('user_roles')
          .select('user_id', { count: 'exact' })
          .eq('organization_id', organizationId),
        this.supabase
          .from('departments')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .eq('status', 'active'),
        this.supabase
          .from('cost_centers')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .eq('status', 'active'),
        this.supabase
          .from('suppliers')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .eq('status', 'active'),
      ]);

      return {
        members_count: members?.length || 0,
        departments_count: departments?.length || 0,
        cost_centers_count: costCenters?.length || 0,
        suppliers_count: suppliers?.length || 0,
      };
    } catch (error) {
      console.error('[v0] Error fetching organization stats:', error);
      throw error;
    }
  }
}

export default MultiTenantService;
