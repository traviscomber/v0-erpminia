import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  buildAuthCookiePayload,
  createAuthCookieValue,
  verifyAuthCookieValue,
} from '@/lib/auth-cookie';

describe('auth cookie helpers', () => {
  const previousSecret = process.env.AUTH_COOKIE_SECRET;

  beforeEach(() => {
    process.env.AUTH_COOKIE_SECRET = 'test-auth-cookie-secret';
  });

  afterEach(() => {
    process.env.AUTH_COOKIE_SECRET = previousSecret;
  });

  it('round-trips a signed auth cookie payload', async () => {
    const payload = buildAuthCookiePayload({
      user: {
        id: 'user-123',
        email: 'juan@example.com',
        full_name: 'Juan Perez',
        organization_id: 'org-1',
      },
      role: 'admin',
      sessionToken: 'user-123-1700000000000',
      maxAgeSeconds: 60,
    });

    const token = await createAuthCookieValue(payload);
    const parsed = await verifyAuthCookieValue(token);

    expect(parsed).not.toBeNull();
    expect(parsed?.user.id).toBe('user-123');
    expect(parsed?.user.email).toBe('juan@example.com');
    expect(parsed?.role).toBe('admin');
    expect(parsed?.session_token).toBe('user-123-1700000000000');
  });
});
