/**
 * Document Expiry Tracking Service
 * Gestiona alertas de documentos próximos a expirar
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars");
  return createClient(supabaseUrl, supabaseKey);
}

export class DocumentExpiryService {
  /**
   * Obtener documentos próximos a expirar (30, 14, 7, 1 día)
   */
  static async getExpiringDocuments(organizationId: string, daysThreshold: number = 30) {
    const supabase = getSupabaseClient();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'approved')
      .eq('expired', false)
      .lte('expiry_date', thresholdDate.toISOString().split('T')[0])
      .gt('expiry_date', new Date().toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    // Calcular días hasta expiración
    return (documents || []).map((doc) => ({
      ...doc,
      daysUntilExpiry: Math.floor(
        (new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
      urgency: this.getUrgencyLevel(
        Math.floor(
          (new Date(doc.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
      ),
    }));
  }

  /**
   * Obtener documentos vencidos
   */
  static async getExpiredDocuments(organizationId: string) {
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'expired')
      .order('expiry_date', { ascending: false });

    return documents || [];
  }

  /**
   * Crear alerta de vencimiento
   */
  static async createExpiryAlert(
    organizationId: string,
    documentId: string,
    recipientEmails: string[]
  ) {
    const { error } = await supabase
      .from('document_expiry_alerts')
      .insert({
        organization_id: organizationId,
        document_id: documentId,
        alert_type: 'expiry_approaching',
        alert_recipients: recipientEmails,
      });

    if (error) throw error;

    // TODO: Enviar emails a recipientEmails
    // await sendExpiryAlert(recipientEmails, document);

    return { success: true };
  }

  /**
   * Marcar documento como expirado
   */
  static async markAsExpired(documentId: string) {
    const { error } = await supabase
      .from('documents')
      .update({
        status: 'expired',
        expired: true,
      })
      .eq('id', documentId);

    if (error) throw error;

    // Crear alerta de vencimiento
    await supabase.from('document_expiry_alerts').insert({
      document_id: documentId,
      alert_type: 'expired',
    });

    return { success: true };
  }

  /**
   * Crear recordatorio de renovación
   */
  static async createRenewalReminder(
    documentId: string,
    renewalDays: number = 30
  ) {
    const { data: document } = await supabase
      .from('documents')
      .select('expiry_date')
      .eq('id', documentId)
      .single();

    if (!document) throw new Error('Document not found');

    const renewalDate = new Date(document.expiry_date);
    renewalDate.setDate(renewalDate.getDate() - renewalDays);

    // Crear evento en base de datos para recordatorio
    // Este evento podría ser procesado por un job scheduled
    const reminder = {
      documentId,
      renewalDate: renewalDate.toISOString(),
      type: 'renewal_reminder',
    };

    return reminder;
  }

  /**
   * Procesar vencimientos programados (ejecutar diariamente)
   */
  static async processDailyExpiryCheck(organizationId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Marcar documentos expirados
      const { error: expireError } = await supabase
        .from('documents')
        .update({
          status: 'expired',
          expired: true,
        })
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .eq('expired', false)
        .lt('expiry_date', today);

      if (expireError) throw expireError;

      // 2. Buscar documentos próximos a expirar
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: expiringDocuments } = await supabase
        .from('documents')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .eq('expired', false)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gt('expiry_date', today);

      // 3. Crear alertas para documentos próximos a expirar
      for (const doc of expiringDocuments || []) {
        const existingAlert = await supabase
          .from('document_expiry_alerts')
          .select('id')
          .eq('document_id', doc.id)
          .eq('alert_type', 'expiry_approaching')
          .eq('alert_sent', false)
          .single();

        // Solo crear si no existe alerta no enviada
        if (!existingAlert.data) {
          await supabase.from('document_expiry_alerts').insert({
            organization_id: organizationId,
            document_id: doc.id,
            alert_type: 'expiry_approaching',
          });
        }
      }

      return { success: true, processedCount: expiringDocuments?.length || 0 };
    } catch (error) {
      console.error('[ExpiryService] Daily check failed:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de expiración
   */
  static async getExpiryStats(organizationId: string) {
    const [expiring30, expiring7, expiring1, expired] = await Promise.all([
      this.getExpiringDocuments(organizationId, 30),
      this.getExpiringDocuments(organizationId, 7),
      this.getExpiringDocuments(organizationId, 1),
      this.getExpiredDocuments(organizationId),
    ]);

    return {
      expiringIn30Days: expiring30.length,
      expiringIn7Days: expiring7.length,
      expiringToday: expiring1.length,
      alreadyExpired: expired.length,
      criticalCount: expiring1.length + expired.length,
    };
  }

  /**
   * Determinar nivel de urgencia
   */
  private static getUrgencyLevel(daysUntilExpiry: number): string {
    if (daysUntilExpiry <= 0) return 'critical';
    if (daysUntilExpiry <= 1) return 'critical';
    if (daysUntilExpiry <= 7) return 'high';
    if (daysUntilExpiry <= 14) return 'medium';
    return 'low';
  }
}
