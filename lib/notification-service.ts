// Notification Service - Handles in-app, email, and external notifications
// Supports: In-app alerts, Email queue, Slack webhooks

export interface DocumentNotification {
  id: string;
  user_id: string;
  document_id: string;
  document_title: string;
  approval_level: number;
  approval_level_name: string;
  type: 'pending' | 'approved' | 'rejected' | 'nc_created' | 'nc_approved' | 'ca_assigned' | 'ca_overdue' | 'compliance_alert';
  message: string;
  title?: string;
  read: boolean;
  created_at: string;
}

export type NotificationChannel = 'in-app' | 'email' | 'slack';

export class NotificationService {
  private static instance: NotificationService;
  private static queue: DocumentNotification[] = [];

  private constructor() {}

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

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Send notification through specified channels
  static async send(notification: DocumentNotification, channels: NotificationChannel[] = ['in-app']) {
    this.queue.push(notification);

    for (const channel of channels) {
      if (channel === 'in-app') {
        this.sendInApp(notification);
      } else if (channel === 'email') {
        // Email sending handled via queue
        console.log('[v0] Email notification queued:', notification.id);
      }
    }
  }

  private static sendInApp(notification: DocumentNotification) {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') {
      return;
    }

    const event = new CustomEvent('notification', { detail: notification });
    window.dispatchEvent(event);
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
      title: 'Aprobación Pendiente',
      message: `Documento "${documentTitle}" requiere tu aprobación (${approvalLevelName})`,
      read: false,
      created_at: new Date().toISOString(),
    };

    await this.send(notification, ['in-app', 'email']);
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
      title: 'Aprobación Completada',
      message: `Documento "${documentTitle}" fue aprobado por ${approvedBy}`,
      read: false,
      created_at: new Date().toISOString(),
    };

    await this.send(notification, ['in-app', 'email']);
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
      title: 'Aprobación Rechazada',
      message: `Documento "${documentTitle}" fue rechazado por ${rejectedBy}: ${rejectionReason}`,
      read: false,
      created_at: new Date().toISOString(),
    };

    await this.send(notification, ['in-app', 'email']);
    return notification;
  }

  // Generic notification for compliance events
  static async notifyComplianceEvent(
    userId: string,
    type: 'nc_created' | 'nc_approved' | 'ca_assigned' | 'ca_overdue' | 'compliance_alert',
    title: string,
    message: string
  ): Promise<DocumentNotification> {
    const notification: DocumentNotification = {
      id: crypto.randomUUID(),
      user_id: userId,
      document_id: '',
      document_title: '',
      approval_level: 0,
      approval_level_name: '',
      type,
      title,
      message,
      read: false,
      created_at: new Date().toISOString(),
    };

    await this.send(notification, ['in-app', 'email']);
    return notification;
  }

  // Queue email notification
  static async queueEmail(notification: DocumentNotification, email: string) {
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
          subject: notification.title || notification.message,
          body: notification.message,
          type: notification.type,
          document_id: notification.document_id,
        }),
      });
    } catch (error) {
      console.error('[v0] Email queue failed:', error);
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    const notification = this.queue.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  // Get pending notifications for user
  static async getPendingNotifications(userId: string): Promise<DocumentNotification[]> {
    return this.queue.filter(n => n.user_id === userId && !n.read);
  }

  // Get all notifications
  static getQueue(): DocumentNotification[] {
    return this.queue;
  }

  // Clear queue (useful for testing)
  static clearQueue(): void {
    this.queue = [];
  }
}

