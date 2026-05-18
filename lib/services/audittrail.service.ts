// FASE 1: Audit Trail Service - Centralizado logging de todos los cambios

import { createClient } from '@/lib/supabase/client';
import type { AuditLog } from '@/lib/types/rbac';

export interface AuditLogEntry {
  organizationId: string;
  userId?: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'archive';
  resourceType: string; // 'document', 'maintenance_order', 'inventory_item', etc
  resourceId?: string;
  resourceIdentifier?: string; // Si no hay UUID
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditTrailService {
  private static supabase = createClient();

  /**
   * Registrar acción en audit log
   */
  static async logAction(entry: AuditLogEntry): Promise<AuditLog> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .insert({
          organization_id: entry.organizationId,
          user_id: entry.userId,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          resource_identifier: entry.resourceIdentifier,
          old_values: entry.oldValues || null,
          new_values: entry.newValues || null,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          status: 'completed',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[v0] Error logging action:', error);
      throw error;
    }
  }

  /**
   * Registrar acción fallida
   */
  static async logFailedAction(
    entry: Omit<AuditLogEntry, 'newValues'> & { errorMessage: string }
  ): Promise<AuditLog> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .insert({
          organization_id: entry.organizationId,
          user_id: entry.userId,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          resource_identifier: entry.resourceIdentifier,
          old_values: entry.oldValues || null,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          status: 'failed',
          error_message: entry.errorMessage,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[v0] Error logging failed action:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de auditoría de un recurso
   */
  static async getResourceHistory(
    organizationId: string,
    resourceType: string,
    resourceId: string
  ): Promise<AuditLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[v0] Error fetching resource history:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de auditoría de un usuario
   */
  static async getUserHistory(
    organizationId: string,
    userId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[v0] Error fetching user history:', error);
      throw error;
    }
  }

  /**
   * Obtener auditoría de organización (todos los eventos)
   */
  static async getOrganizationAudit(
    organizationId: string,
    filters?: {
      resourceType?: string;
      userId?: string;
      action?: string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    }
  ): Promise<AuditLog[]> {
    try {
      let query = this.supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId);

      if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate.toISOString());
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate.toISOString());
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 1000);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[v0] Error fetching organization audit:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de auditoría
   */
  static async getAuditStats(organizationId: string, days: number = 30) {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('audit_log')
        .select('action, status, resource_type')
        .eq('organization_id', organizationId)
        .gte('created_at', fromDate.toISOString());

      if (error) throw error;

      const logs = data || [];
      const stats = {
        total_actions: logs.length,
        by_action: {} as Record<string, number>,
        by_status: { completed: 0, failed: 0 },
        by_resource: {} as Record<string, number>,
        failed_percentage: 0,
      };

      logs.forEach(log => {
        // Contar por action
        stats.by_action[log.action] = (stats.by_action[log.action] || 0) + 1;

        // Contar por status
        if (log.status === 'completed') stats.by_status.completed++;
        else stats.by_status.failed++;

        // Contar por resource
        stats.by_resource[log.resource_type] = (stats.by_resource[log.resource_type] || 0) + 1;
      });

      stats.failed_percentage = stats.total_actions > 0
        ? Math.round((stats.by_status.failed / stats.total_actions) * 100)
        : 0;

      return stats;
    } catch (error) {
      console.error('[v0] Error fetching audit stats:', error);
      throw error;
    }
  }

  /**
   * Detectar cambios sospechosos
   * Retorna eventos que podrían ser anomalías
   */
  static async detectAnomalies(organizationId: string, days: number = 7) {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'failed')
        .gte('created_at', fromDate.toISOString());

      if (error) throw error;

      // Detectar patrones sospechosos
      const anomalies = [];
      const logs = data || [];

      // 1. Múltiples fallos del mismo usuario en corto tiempo
      const userFailures = new Map<string, number>();
      logs.forEach(log => {
        if (log.user_id) {
          userFailures.set(log.user_id, (userFailures.get(log.user_id) || 0) + 1);
        }
      });

      userFailures.forEach((count, userId) => {
        if (count > 10) {
          anomalies.push({
            type: 'HIGH_FAILURE_RATE',
            severity: 'high',
            user_id: userId,
            failure_count: count,
            message: `Usuario ${userId} tuvo ${count} intentos fallidos en ${days} días`,
          });
        }
      });

      // 2. Múltiples deletes en corto tiempo
      const deleteActions = logs.filter(log => log.action === 'delete');
      if (deleteActions.length > 5) {
        anomalies.push({
          type: 'BULK_DELETE_ACTIVITY',
          severity: 'medium',
          action_count: deleteActions.length,
          message: `Se detectaron ${deleteActions.length} operaciones de eliminación`,
        });
      }

      return anomalies;
    } catch (error) {
      console.error('[v0] Error detecting anomalies:', error);
      throw error;
    }
  }

  /**
   * Obtener cambios realizados por usuario en un período
   */
  static async getUserChangelog(
    organizationId: string,
    userId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<AuditLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[v0] Error fetching user changelog:', error);
      throw error;
    }
  }

  /**
   * Exportar auditoría a CSV
   */
  static async exportAuditToCSV(
    organizationId: string,
    filters?: Record<string, any>
  ): Promise<string> {
    try {
      const logs = await this.getOrganizationAudit(organizationId, filters);

      const headers = [
        'Timestamp',
        'User ID',
        'Action',
        'Resource Type',
        'Resource ID',
        'Status',
        'Error Message',
      ];

      const rows = logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.user_id || 'System',
        log.action,
        log.resource_type,
        log.resource_id || log.resource_identifier || 'N/A',
        log.status,
        log.error_message || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return csv;
    } catch (error) {
      console.error('[v0] Error exporting audit:', error);
      throw error;
    }
  }

  /**
   * Obtener impacto de cambio (antes y después)
   */
  static async getChangeImpact(
    organizationId: string,
    resourceType: string,
    resourceId: string
  ) {
    try {
      const history = await this.getResourceHistory(
        organizationId,
        resourceType,
        resourceId
      );

      if (history.length === 0) {
        return { initial: null, current: null, changes: [] };
      }

      const changes = [];
      for (let i = history.length - 1; i > 0; i--) {
        const before = history[i];
        const after = history[i - 1];

        if (before.new_values && after.new_values) {
          const changedFields = Object.keys(after.new_values).filter(
            key => JSON.stringify(before.new_values?.[key]) !== JSON.stringify(after.new_values?.[key])
          );

          changes.push({
            timestamp: after.created_at,
            action: after.action,
            user_id: after.user_id,
            changed_fields: changedFields.map(field => ({
              field,
              before: before.new_values?.[field],
              after: after.new_values?.[field],
            })),
          });
        }
      }

      return {
        initial: history[history.length - 1].new_values,
        current: history[0].new_values,
        changes,
      };
    } catch (error) {
      console.error('[v0] Error getting change impact:', error);
      throw error;
    }
  }

  /**
   * Configurar alertas de auditoría
   * Retorna si cierta acción debería generar alert
   */
  static shouldAlert(log: AuditLog): boolean {
    // Alertar en acciones críticas
    const criticalActions = ['delete', 'approve', 'reject'];
    const criticalResources = ['document', 'maintenance_order', 'contract'];

    return (
      criticalActions.includes(log.action) &&
      criticalResources.includes(log.resource_type)
    ) ||
      log.status === 'failed';
  }
}

export default AuditTrailService;
