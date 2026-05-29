// Notification Service for Document Approvals
export interface DocumentNotification {
  id: string;
  user_id: string;
  document_id: string;
  document_title: string;
  approval_level: number;
  approval_level_name: string;
  type: 'pending' | 'approved' | 'rejected';
  message: string;
  read: boolean;
  created_at: string;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create notification when document is submitted for approval
  static async notifyPendingApproval(
    userId: string,
    documentId: string,
    documentTitle: string,
    approvalLevel: number,
    approvalLevelName: string
  ): Promise<DocumentNotification> {
    const notification: DocumentNotification = {
      id: crypto.randomUUID(),
      user_id: userId,
      document_id: documentId,
      document_title: documentTitle,
      approval_level: approvalLevel,
      approval_level_name: approvalLevelName,
      type: 'pending',
      message: `Documento "${documentTitle}" requiere tu aprobación (${approvalLevelName})`,
      read: false,
      created_at: new Date().toISOString(),
    };

    // TODO: Save to database
    return notification;
  }

  // Create notification when document is approved
  static async notifyApprovalApproved(
    userId: string,
    documentId: string,
    documentTitle: string,
    approvalLevelName: string,
    approvedBy: string
  ): Promise<DocumentNotification> {
    const notification: DocumentNotification = {
      id: crypto.randomUUID(),
      user_id: userId,
      document_id: documentId,
      document_title: documentTitle,
      approval_level: 0,
      approval_level_name: approvalLevelName,
      type: 'approved',
      message: `Documento "${documentTitle}" fue aprobado por ${approvedBy}`,
      read: false,
      created_at: new Date().toISOString(),
    };

    // TODO: Save to database and send email
    return notification;
  }

  // Create notification when document is rejected
  static async notifyApprovalRejected(
    userId: string,
    documentId: string,
    documentTitle: string,
    approvalLevelName: string,
    rejectionReason: string,
    rejectedBy: string
  ): Promise<DocumentNotification> {
    const notification: DocumentNotification = {
      id: crypto.randomUUID(),
      user_id: userId,
      document_id: documentId,
      document_title: documentTitle,
      approval_level: 0,
      approval_level_name: approvalLevelName,
      type: 'rejected',
      message: `Documento "${documentTitle}" fue rechazado por ${rejectedBy}: ${rejectionReason}`,
      read: false,
      created_at: new Date().toISOString(),
    };

    // TODO: Save to database and send email
    return notification;
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    // TODO: Update in database
  }

  // Get pending notifications for user
  static async getPendingNotifications(userId: string): Promise<DocumentNotification[]> {
    // TODO: Fetch from database
    return [];
  }
}
