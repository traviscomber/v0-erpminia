import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Validates webhook HMAC signature
 * @param request - NextRequest with webhook payload
 * @param secret - WEBHOOK_SECRET from environment
 * @returns true if signature is valid
 */
export async function validateWebhookSignature(
  request: NextRequest,
  secret: string
): Promise<boolean> {
  const signature = request.headers.get('x-signature');
  if (!signature) return false;

  const body = await request.text();
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');

  return signature === hash;
}

/**
 * Returns 401 Unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

/**
 * Returns 403 Forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}
