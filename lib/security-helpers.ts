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
 * Validates dev write key for write operations
 * @param request - NextRequest with x-dev-write-key header
 * @returns true if valid dev write key provided
 */
export function validateDevWriteKey(request: NextRequest): boolean {
  const devWriteKey = process.env.DEV_WRITE_KEY;
  if (!devWriteKey) return false;
  
  const providedKey = request.headers.get('x-dev-write-key');
  return providedKey === devWriteKey;
}

/**
 * Validates dev admin key for sensitive operations
 * @param request - NextRequest with x-dev-admin-key header
 * @returns true if valid dev admin key provided
 */
export function validateDevAdminKey(request: NextRequest): boolean {
  const devAdminKey = process.env.DEV_ADMIN_KEY;
  if (!devAdminKey) return false;
  
  const providedKey = request.headers.get('x-dev-admin-key');
  return providedKey === devAdminKey;
}

/**
 * Checks if demo public read mode is enabled
 * @returns true if DEMO_PUBLIC_READ=true
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_PUBLIC_READ === 'true';
}

/**
 * Returns 401 No autorizado response
 */
export function unauthorizedResponse(message: string = 'No autorizado') {
  return NextResponse.json(
    { error: message },
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

/**
 * Returns 503 Service Unavailable response
 */
export function serviceUnavailableResponse(message: string = 'Service unavailable') {
  return NextResponse.json(
    { error: message },
    { status: 503 }
  );
}
