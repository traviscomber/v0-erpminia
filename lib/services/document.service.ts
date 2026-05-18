import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DocumentUploadInput {
  organizationId: string;
  templateId?: string;
  title: string;
  description?: string;
  documentType: string;
  category: string;
  file: File;
  expiryDate?: Date;
  sernageominRequired?: boolean;
  createdBy: string;
}

export interface DocumentApprovalInput {
  documentId: string;
  approvalLevel: number;
  assignedTo: string;
  requiredRole: string;
  levelName: string;
}

/**
 * Document Service: Gestión completa de documentos
 */
export class DocumentService {
  /**
   * Upload de documento con versionado automático
   */
  static async uploadDocument(input: DocumentUploadInput) {
    try {
      // 1. Generar número único de documento
      const documentNumber = `DOC-${input.organizationId.slice(0, 4)}-${Date.now()}-${nanoid(4)}`;

      // 2. Subir archivo a Supabase Storage
      const fileName = `${input.organizationId}/${Date.now()}-${input.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, input.file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 3. Crear registro en documents
      const documentId = nanoid();
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          id: documentId,
          organization_id: input.organizationId,
          template_id: input.templateId,
          document_number: documentNumber,
          title: input.title,
          description: input.description,
          document_type: input.documentType,
          category: input.category,
          status: 'draft',
          current_file_url: uploadData.path,
          current_file_path: fileName,
          file_size_mb: input.file.size / (1024 * 1024),
          file_mime_type: input.file.type,
          expiry_date: input.expiryDate ? input.expiryDate.toISOString().split('T')[0] : null,
          sernageomin_requirement: input.sernageominRequired || false,
          created_by: input.createdBy,
          search_text: `${input.title} ${input.description || ''} ${input.category}`,
        })
        .select()
        .single();

      if (docError) throw new Error(`Document creation failed: ${docError.message}`);

      // 4. Crear version inicial
      await supabase.from('document_versions').insert({
        document_id: documentId,
        version_number: 1,
        file_url: uploadData.path,
        file_path: fileName,
        file_size_mb: input.file.size / (1024 * 1024),
        file_mime_type: input.file.type,
        change_notes: 'Initial upload',
        created_by: input.createdBy,
      });

      // 5. Si tiene template, crear approvals automáticamente
      if (input.templateId) {
        const template = await supabase
          .from('document_templates')
          .select('required_approvers')
          .eq('id', input.templateId)
          .single();

        const requiredApprovers = template.data?.required_approvers || 1;
        
        for (let level = 1; level <= requiredApprovers; level++) {
          const roleMap = {
            1: { role: 'reviewer', name: 'Reviewer' },
            2: { role: 'validator', name: 'Validator' },
            3: { role: 'approver', name: 'Final Approver' },
          };

          const roleInfo = roleMap[level as keyof typeof roleMap];
          
          await supabase.from('document_approvals').insert({
            document_id: documentId,
            approval_level: level,
            approval_level_name: roleInfo.name,
            required_role: roleInfo.role,
            status: 'pending',
          });
        }
      }

      return { success: true, document, documentId };
    } catch (error) {
      console.error('[DocumentService] Upload error:', error);
      throw error;
    }
  }

  /**
   * Obtener documento con todas las relaciones
   */
  static async getDocument(documentId: string) {
    const { data: document, error } = await supabase
      .from('documents')
      .select(`
        *,
        document_versions(*),
        document_approvals(*),
        created_by_user:users(id, email, name),
        approved_by_user:users(id, email, name)
      `)
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return document;
  }

  /**
   * Listar documentos con filtros
   */
  static async listDocuments(
    organizationId: string,
    filters?: {
      status?: string;
      category?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let query = supabase
      .from('documents')
      .select('*, document_approvals(*)', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.search) {
      query = query.ilike('search_text', `%${filters.search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    const { data, count, error } = await query;
    if (error) throw error;

    return { documents: data, total: count };
  }

  /**
   * Obtener documentos pendientes de aprobación
   */
  static async getPendingApprovals(userId: string, organizationId: string) {
    const { data } = await supabase
      .from('document_approvals')
      .select(`
        *,
        document:documents(
          id, title, document_number, category, created_at,
          created_by_user:users(name, email)
        )
      `)
      .eq('assigned_to', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Aprobar documento (workflow: 3 niveles)
   */
  static async approveDocument(
    documentId: string,
    approvalLevelId: string,
    approvedBy: string,
    comments?: string
  ) {
    try {
      // 1. Actualizar aprobación
      const { error: updateError } = await supabase
        .from('document_approvals')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          comments,
        })
        .eq('id', approvalLevelId);

      if (updateError) throw updateError;

      // 2. Verificar si todas las aprobaciones están completas
      const { data: approvals } = await supabase
        .from('document_approvals')
        .select('status')
        .eq('document_id', documentId);

      const allApproved = approvals?.every((a) => a.status === 'approved');

      // 3. Si todas aprobadas, marcar documento como approved
      if (allApproved) {
        await supabase
          .from('documents')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: approvedBy,
          })
          .eq('id', documentId);
      }

      return { success: true };
    } catch (error) {
      console.error('[DocumentService] Approval error:', error);
      throw error;
    }
  }

  /**
   * Rechazar documento
   */
  static async rejectDocument(
    documentId: string,
    approvalLevelId: string,
    rejectedBy: string,
    rejectionReason: string
  ) {
    try {
      // 1. Actualizar aprobación como rechazada
      await supabase
        .from('document_approvals')
        .update({
          status: 'rejected',
          approved_by: rejectedBy,
          rejection_reason: rejectionReason,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approvalLevelId);

      // 2. Marcar documento como rechazado
      await supabase
        .from('documents')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      // 3. Resetear todas las aprobaciones posteriores a pending
      await supabase
        .from('document_approvals')
        .update({ status: 'pending' })
        .eq('document_id', documentId)
        .gt('id', approvalLevelId);

      return { success: true };
    } catch (error) {
      console.error('[DocumentService] Rejection error:', error);
      throw error;
    }
  }

  /**
   * Procesar expiry - marcar como expirado y crear alertas
   */
  static async checkAndProcessExpiry(organizationId: string) {
    try {
      // 1. Encontrar documentos a punto de expirar (30 días)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: expiringDocs } = await supabase
        .from('documents')
        .select('id, expiry_date, organization_id')
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .lt('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gt('expiry_date', new Date().toISOString().split('T')[0]);

      if (expiringDocs) {
        for (const doc of expiringDocs) {
          const daysUntilExpiry = Math.floor(
            (new Date(doc.expiry_date).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          );

          // Crear alerta
          await supabase.from('document_expiry_alerts').insert({
            organization_id: organizationId,
            document_id: doc.id,
            alert_type: 'expiry_approaching',
            days_until_expiry: daysUntilExpiry,
          });
        }
      }

      // 2. Marcar documentos ya expirados
      await supabase
        .from('documents')
        .update({
          status: 'expired',
          expired: true,
        })
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .lt('expiry_date', new Date().toISOString().split('T')[0]);

      return { success: true };
    } catch (error) {
      console.error('[DocumentService] Expiry processing error:', error);
      throw error;
    }
  }

  /**
   * Obtener resumen de documentos para dashboard
   */
  static async getDashboardStats(organizationId: string) {
    const [total, approved, pending, expired] = await Promise.all([
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
        .eq('status', 'submitted'),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'expired'),
    ]);

    return {
      total: total.count || 0,
      approved: approved.count || 0,
      pending: pending.count || 0,
      expired: expired.count || 0,
    };
  }
}
