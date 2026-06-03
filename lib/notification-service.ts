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
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  recipient: string;
  data?: Record<string, any>;
  timestamp: Date;
}

interface NotificationChannel {
  inApp: boolean;
  slack?: string;
  email?: string;
  push?: boolean;
}

export class NotificationService {
  private static queue: NotificationPayload[] = [];
  private static channels: Map<string, NotificationChannel> = new Map();

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

    if (channels.inApp) {
      this.sendInApp(payload);
    }
    if (channels.slack) {
      await this.sendSlack(payload, channels.slack);
    }
    if (channels.email) {
      await this.queueEmail(payload, channels.email);
    }
    if (channels.push) {
      await this.sendPush(payload);
    }
  }

  private static sendInApp(payload: NotificationPayload) {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') {
      return;
    }

    const event = new CustomEvent('notification', { detail: payload });
    window.dispatchEvent(event);
  }

  private static async sendSlack(payload: NotificationPayload, webhookUrl: string) {
    try {
      const message = {
        text: payload.title,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: payload.title },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: payload.message },
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `Priority: *${payload.priority.toUpperCase()}*` },
            ],
          },
        ],
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('[v0] Slack notification failed:', error);
    }
  }

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
  }

  private static async sendPush(payload: NotificationPayload) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(payload.title, {
        body: payload.message,
        badge: '/badge.png',
        tag: payload.type,
      });
    }
  }

  static getQueue() {
    return this.queue;
  }

  static clearQueue() {
    this.queue = [];
  }
}
