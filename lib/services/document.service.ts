import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { NotificationService } from '@/lib/notification-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProfileRecord {
  id: string;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface DocumentRecord {
  id: string;
  title: string;
  created_by: string;
}

function getProfileDisplayName(profile?: ProfileRecord | null, fallback?: string | null) {
  if (fallback) return fallback;
  if (profile?.full_name) return profile.full_name;

  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || profile?.email || 'Usuario';
}

async function getProfileRecord(userId?: string | null) {
  if (!userId) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, first_name, last_name')
    .eq('id', userId)
    .maybeSingle();

  return (data as ProfileRecord | null) || null;
}

async function notifyDocumentOwner(
  type: 'document_approved' | 'document_rejected',
  document: DocumentRecord,
  message: string,
  priority: 'medium' | 'high'
) {
  const ownerProfile = await getProfileRecord(document.created_by);

  await NotificationService.send(
    {
      type,
      title:
        type === 'document_approved'
          ? `Documento aprobado: ${document.title}`
          : `Documento rechazado: ${document.title}`,
      message,
      priority,
      recipient: ownerProfile?.email || document.created_by,
      data: { documentId: document.id },
      timestamp: new Date(),
    },
    {
      inApp: true,
      email: ownerProfile?.email || undefined,
    }
  );
}

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

export class DocumentService {
  static async uploadDocument(input: DocumentUploadInput) {
    try {
      const documentNumber = `DOC-${input.organizationId.slice(0, 4)}-${Date.now()}-${nanoid(4)}`;

      const fileName = `${input.organizationId}/${Date.now()}-${input.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, input.file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

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

      if (input.templateId) {
        const template = await supabase
          .from('document_templates')
          .select('required_approvers')
          .eq('id', input.templateId)
          .single();

        const requiredApprovers = template.data?.required_approvers || 1;

        for (let level = 1; level <= requiredApprovers; level += 1) {
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

  static async getDocument(documentId: string) {
    const { data: document, error } = await supabase
      .from('documents')
      .select('*, document_versions(*), document_approvals(*)')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return document;
  }

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

    if (filters?.status === 'pending') {
      query = query.in('status', ['draft', 'submitted', 'under_review']);
    } else if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.search) {
      query = query.ilike('search_text', `%${filters.search}%`);
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return { documents: data, total: count };
  }

  static async getPendingApprovals(userId: string) {
    const { data } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('assigned_to', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return data || [];
  }

  static async approveDocument(
    documentId: string,
    approvalLevelId: string,
    approvedBy: string,
    comments?: string
  ) {
    try {
      const [approverProfile, approvalResult, documentResult] = await Promise.all([
        getProfileRecord(approvedBy),
        supabase
          .from('document_approvals')
          .select('*')
          .eq('id', approvalLevelId)
          .eq('document_id', documentId)
          .maybeSingle(),
        supabase
          .from('documents')
          .select('id, title, created_by')
          .eq('id', documentId)
          .maybeSingle(),
      ]);

      const currentApproval = approvalResult.data;
      const document = documentResult.data as DocumentRecord | null;

      if (!currentApproval || !document) {
        throw new Error('Document approval context not found');
      }

      const { error: updateError } = await supabase
        .from('document_approvals')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_by_name: getProfileDisplayName(approverProfile),
          approved_at: new Date().toISOString(),
          comments,
        })
        .eq('id', approvalLevelId);

      if (updateError) throw updateError;

      const { data: approvals } = await supabase
        .from('document_approvals')
        .select('*')
        .eq('document_id', documentId);

      const allApproved = approvals?.every((approval) => approval.status === 'approved');

      if (allApproved) {
        await supabase
          .from('documents')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: approvedBy,
          })
          .eq('id', documentId);

        await notifyDocumentOwner(
          'document_approved',
          document,
          `El documento ${document.title} completo su flujo de aprobacion.`,
          'medium'
        );
      } else {
        await supabase
          .from('documents')
          .update({ status: 'under_review' })
          .eq('id', documentId);

        const nextPendingApproval = approvals
          ?.filter((approval) => approval.status === 'pending')
          .sort((left, right) => left.approval_level - right.approval_level)[0];

        if (nextPendingApproval) {
          const nextApproverProfile = await getProfileRecord(nextPendingApproval.assigned_to);

          await NotificationService.send(
            {
              type: 'document_pending_approval',
              title: `Nueva aprobacion pendiente: ${document.title}`,
              message: `El documento ${document.title} requiere revision en ${nextPendingApproval.approval_level_name || `nivel ${nextPendingApproval.approval_level}`}.`,
              priority: 'high',
              recipient:
                nextApproverProfile?.email ||
                nextPendingApproval.assigned_to ||
                documentId,
              data: { documentId, approvalId: nextPendingApproval.id },
              timestamp: new Date(),
            },
            {
              inApp: true,
              email: nextApproverProfile?.email || undefined,
            }
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[DocumentService] Approval error:', error);
      throw error;
    }
  }

  static async rejectDocument(
    documentId: string,
    approvalLevelId: string,
    rejectedBy: string,
    rejectionReason: string
  ) {
    try {
      const [rejectedByProfile, approvalResult, documentResult] = await Promise.all([
        getProfileRecord(rejectedBy),
        supabase
          .from('document_approvals')
          .select('*')
          .eq('id', approvalLevelId)
          .eq('document_id', documentId)
          .maybeSingle(),
        supabase
          .from('documents')
          .select('id, title, created_by')
          .eq('id', documentId)
          .maybeSingle(),
      ]);

      const currentApproval = approvalResult.data;
      const document = documentResult.data as DocumentRecord | null;

      if (!currentApproval || !document) {
        throw new Error('Document rejection context not found');
      }

      await supabase
        .from('document_approvals')
        .update({
          status: 'rejected',
          approved_by: rejectedBy,
          approved_by_name: getProfileDisplayName(rejectedByProfile),
          rejection_reason: rejectionReason,
          approved_at: new Date().toISOString(),
        })
        .eq('id', approvalLevelId);

      await supabase
        .from('documents')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      await supabase
        .from('document_approvals')
        .update({ status: 'pending' })
        .eq('document_id', documentId)
        .gt('approval_level', currentApproval.approval_level);

      await notifyDocumentOwner(
        'document_rejected',
        document,
        `El documento ${document.title} fue rechazado. Motivo: ${rejectionReason}`,
        'high'
      );

      return { success: true };
    } catch (error) {
      console.error('[DocumentService] Rejection error:', error);
      throw error;
    }
  }

  static async checkAndProcessExpiry(organizationId: string) {
    try {
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

          await supabase.from('document_expiry_alerts').insert({
            organization_id: organizationId,
            document_id: doc.id,
            alert_type: 'expiry_approaching',
            days_until_expiry: daysUntilExpiry,
          });
        }
      }

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
        .in('status', ['draft', 'submitted', 'under_review']),
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
