<<<<<<< HEAD
// Notification Service for Document Approvals
export interface DocumentNotification {
  id: string;
  user_id: string;
  document_id: string;
  document_title: string;
  approval_level: number;
  approval_level_name: string;
  type: 'pending' | 'approved' | 'rejected';
=======
// Notification Service - Handles in-app and external notifications
// Supports: In-app alerts, Slack webhooks, Email queue

interface NotificationPayload {
  type:
    | 'nc_created'
    | 'nc_approved'
    | 'ca_assigned'
    | 'ca_overdue'
    | 'compliance_alert'
    | 'document_pending_approval'
    | 'document_approved'
    | 'document_rejected';
  title: string;
>>>>>>> main
  message: string;
  read: boolean;
  created_at: string;
}

export class NotificationService {
  private static instance: NotificationService;

<<<<<<< HEAD
  private constructor() {}
=======
  private static resolveApiUrl(path: string) {
    if (typeof window !== 'undefined') {
      return path;
    }

    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

    return baseUrl ? new URL(path, baseUrl).toString() : null;
  }

  static async send(payload: NotificationPayload, channels: NotificationChannel) {
    this.queue.push(payload);
>>>>>>> main

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

<<<<<<< HEAD
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
=======
  private static sendInApp(payload: NotificationPayload) {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') {
      return;
    }

    const event = new CustomEvent('notification', { detail: payload });
    window.dispatchEvent(event);
>>>>>>> main
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

<<<<<<< HEAD
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
=======
  private static async queueEmail(payload: NotificationPayload, email: string) {
    try {
      const endpoint = this.resolveApiUrl('/api/sostenibilidad/notifications/email');

      if (!endpoint) {
        console.warn('[v0] Email queue skipped: missing APP_URL/NEXT_PUBLIC_APP_URL/VERCEL_URL');
        return;
      }

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: payload.title,
          body: payload.message,
          type: payload.type,
        }),
      });
    } catch (error) {
      console.error('[v0] Email queue failed:', error);
    }
>>>>>>> main
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
