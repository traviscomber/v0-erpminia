export type CustomSession = {
  user: {
    id: string;
    email: string;
    full_name?: string | null;
    organization_id?: string | null;
  };
  role: string;
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Missing AUTH_SESSION_SECRET');
  return secret;
}

async function importKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signCustomSession(session: Omit<CustomSession, 'iat' | 'exp'>, ttlSeconds = 60 * 60 * 24 * 7) {
  const now = Math.floor(Date.now() / 1000);
  const payload: CustomSession = { ...session, iat: now, exp: now + ttlSeconds };
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await importKey(), encoder.encode(encodedPayload));
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyCustomSession(token?: string | null): Promise<CustomSession | null> {
  if (!token) return null;

  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await importKey(),
      base64UrlDecode(encodedSignature),
      encoder.encode(encodedPayload)
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(base64UrlDecode(encodedPayload))) as CustomSession;
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.user?.id || !payload?.user?.email || !payload.role || !payload.exp || payload.exp <= now) return null;

    return payload;
  } catch {
    return null;
  }
}
