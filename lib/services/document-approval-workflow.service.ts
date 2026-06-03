/**
 * Document Approval Workflow Service
 * Gestiona el flujo de 3 niveles de aprobación
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars");
  return createClient(supabaseUrl, supabaseKey);
}

export interface ApprovalWorkflowStep {
  level: number;
  role: string;
  levelName: string;
  description: string;
}

export class DocumentApprovalWorkflowService {
  private static readonly WORKFLOW_STEPS: ApprovalWorkflowStep[] = [
    {
      level: 1,
      role: 'reviewer',
      levelName: 'Reviewer',
      description: 'Revisión técnica del documento',
    },
    {
      level: 2,
      role: 'validator',
      levelName: 'Validator',
      description: 'Validación de cumplimiento',
    },
    {
      level: 3,
      role: 'approver',
      levelName: 'Final Approver',
      description: 'Aprobación final',
    },
  ];

  /**
   * Obtener el flujo de aprobación para un documento
   */
  static async getWorkflowStatus(documentId: string) {
    const supabase = getSupabaseClient();
    const { data: approvals } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', documentId)
      .order('approval_level', { ascending: true });

    return approvals || [];
  }

  /**
   * Asignar aprobador a un nivel específico
   */
  static async assignApprover(
    documentId: string,
    approvalLevelId: string,
    userId: string,
    userEmail: string,
    userName: string
  ) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('document_approvals')
      .update({
        assigned_to: userId,
        assigned_to_name: userName,
      })
      .eq('id', approvalLevelId)
      .eq('document_id', documentId);

    if (error) throw error;

    // TODO: Enviar notificación por email
    // await sendNotification(userEmail, `Se te ha asignado una aprobación de documento`);

    return { success: true };
  }

  /**
   * Obtener el siguiente nivel de aprobación
   */
  static async getNextApprovalLevel(documentId: string) {
    const supabase = getSupabaseClient();
    const { data: approvals } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', documentId)
      .eq('status', 'pending')
      .order('approval_level', { ascending: true })
      .limit(1)
      .single();

    return approvals || null;
  }

  /**
   * Obtener historial de aprobaciones
   */
  static async getApprovalHistory(documentId: string) {
    const supabase = getSupabaseClient();
    const { data: approvals } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('document_id', documentId)
      .order('approval_level', { ascending: true });

    return (approvals || []).map((approval: any) => ({
      level: approval.approval_level,
      levelName: approval.approval_level_name,
      status: approval.status,
      assignedTo: approval.assigned_to_name,
      approvedBy: approval.approved_by_name,
      comments: approval.comments,
      rejectionReason: approval.rejection_reason,
      approvedAt: approval.approved_at,
      submittedAt: approval.submitted_for_review_at,
    }));
  }

  /**
   * Obtener resumen del estado del workflow
   */
  static getWorkflowSummary(approvals: any[]) {
    const summary = {
      totalSteps: 3,
      completedSteps: 0,
      currentStep: 0,
      status: 'pending' as 'pending' | 'in_progress' | 'approved' | 'rejected',
      progress: 0,
      steps: [] as any[],
    };

    for (const approval of approvals) {
      if (approval.status === 'approved') {
        summary.completedSteps++;
      }
      if (approval.status === 'pending' && summary.currentStep === 0) {
        summary.currentStep = approval.approval_level;
      }
    }

    // Calcular estado general
    if (approvals.some((a: any) => a.status === 'rejected')) {
      summary.status = 'rejected';
    } else if (summary.completedSteps === 3) {
      summary.status = 'approved';
    } else if (summary.completedSteps > 0) {
      summary.status = 'in_progress';
    }

    summary.progress = Math.round((summary.completedSteps / 3) * 100);

    return summary;
  }

  /**
   * Re-iniciar flujo de aprobación (después de rechazo)
   */
  static async restartApprovalWorkflow(documentId: string) {
    try {
      const supabase = getSupabaseClient();
      // Resetear todas las aprobaciones a pending
      const { error } = await supabase
        .from('document_approvals')
        .update({ status: 'pending', approved_by: null, approved_at: null })
        .eq('document_id', documentId);

      if (error) throw error;

      // Actualizar documento a 'submitted'
      await supabase
        .from('documents')
        .update({ status: 'submitted' })
        .eq('id', documentId);

      return { success: true };
    } catch (error) {
      console.error('[WorkflowService] Restart failed:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de aprobaciones
   */
  static async getApprovalStats(organizationId: string) {
    const supabase = getSupabaseClient();
    const [totalDocuments, approvedCount, pendingCount, rejectedCount] = await Promise.all([
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'approved'),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['draft', 'submitted', 'under_review']),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'rejected'),
    ]);

    return {
      total: totalDocuments.count || 0,
      approved: approvedCount.count || 0,
      pending: pendingCount.count || 0,
      rejected: rejectedCount.count || 0,
      approvalRate:
        (totalDocuments.count || 0) > 0
          ? Math.round(((approvedCount.count || 0) / (totalDocuments.count || 0)) * 100)
          : 0,
    };
  }
}
