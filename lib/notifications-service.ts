import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Credenciales de Supabase no configuradas');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'document_submitted' | 'document_approved' | 'document_rejected' | 'document_expiring';
  title: string;
  message: string;
  document_id?: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

/**
 * Send notification when document is submitted for approval
 */
export async function notifyDocumentSubmitted(
  documentId: string,
  documentTitle: string,
  submittedBy: string,
  approverIds: string[]
) {
  try {
    const supabase = getSupabaseClient();
    const notifications = approverIds.map(approverId => ({
      user_id: approverId,
      type: 'document_submitted',
      title: 'Documento pendiente de aprobación',
      message: `${submittedBy} ha enviado "${documentTitle}" para tu aprobación`,
      document_id: documentId,
      read: false,
      action_url: `/dashboard/sostenibilidad/documentos-flujo?id=${documentId}`,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('[v0] Error creating notifications:', error);
    }

    // TODO: Send email notifications
    console.log('[v0] Notifications sent for document:', documentId);
  } catch (error) {
    console.error('[v0] Error in notifyDocumentSubmitted:', error);
  }
}

/**
 * Send notification when document is approved
 */
export async function notifyDocumentApproved(
  documentId: string,
  documentTitle: string,
  approvedBy: string,
  submittedBy: string
) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: submittedBy,
        type: 'document_approved',
        title: 'Documento aprobado',
        message: `${approvedBy} ha aprobado "${documentTitle}"`,
        document_id: documentId,
        read: false,
        action_url: `/dashboard/sostenibilidad/documentos-flujo?id=${documentId}`,
      });

    if (error) {
      console.error('[v0] Error creating notification:', error);
    }

    console.log('[v0] Approval notification sent for document:', documentId);
  } catch (error) {
    console.error('[v0] Error in notifyDocumentApproved:', error);
  }
}

/**
 * Send notification when document is rejected
 */
export async function notifyDocumentRejected(
  documentId: string,
  documentTitle: string,
  rejectedBy: string,
  submittedBy: string,
  reason?: string
) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: submittedBy,
        type: 'document_rejected',
        title: 'Documento rechazado',
        message: `${rejectedBy} ha rechazado "${documentTitle}"${reason ? `: ${reason}` : ''}`,
        document_id: documentId,
        read: false,
        action_url: `/dashboard/sostenibilidad/documentos-flujo?id=${documentId}`,
      });

    if (error) {
      console.error('[v0] Error creating notification:', error);
    }

    console.log('[v0] Rejection notification sent for document:', documentId);
  } catch (error) {
    console.error('[v0] Error in notifyDocumentRejected:', error);
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string, limit = 10) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[v0] Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[v0] Error in getUserNotifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[v0] Error marking notification as read:', error);
    }

    return !error;
  } catch (error) {
    console.error('[v0] Error in markNotificationAsRead:', error);
    return false;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('[v0] Error deleting notification:', error);
    }

    return !error;
  } catch (error) {
    console.error('[v0] Error in deleteNotification:', error);
    return false;
  }
}
