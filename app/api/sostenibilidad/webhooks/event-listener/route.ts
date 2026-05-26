import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Validate webhook HMAC signature
function validateWebhookSignature(request: NextRequest, payload: string): boolean {
  const signature = request.headers.get('x-signature');
  if (!signature) return false;

  const secret = process.env.WEBHOOK_SECRET || 'default-secret-dev-only';
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
}

// Webhook para procesar eventos
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    
    // Validar firma HMAC - REQUIRED
    if (!validateWebhookSignature(request, payload)) {
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
