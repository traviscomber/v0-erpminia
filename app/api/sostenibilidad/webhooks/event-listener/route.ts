import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Validate webhook HMAC signature
function validateWebhookSignature(request: NextRequest, payload: string, secret: string): boolean {
  const signature = request.headers.get('x-signature');
  if (!signature) return false;

  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
  } catch {
    return false;
  }
}

// Webhook para procesar eventos
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require WEBHOOK_SECRET - no default fallback
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      console.error('[v0] WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured - WEBHOOK_SECRET required' },
        { status: 503 }
      );
    }

    const payload = await request.text();
    
    // Validar firma HMAC - REQUIRED
    if (!validateWebhookSignature(request, payload, secret)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const data = JSON.parse(payload);
    const { type, record } = data;

    if (!type || !record) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Process webhook event
    console.log('[v0] Webhook processed:', type, record.id);
    return NextResponse.json({ success: true, processed: true });
  } catch (error) {
    console.error('[v0] Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
