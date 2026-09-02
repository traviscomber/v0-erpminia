import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { verifyCustomSession } from '@/lib/auth/signed-session';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live wss://ws-us3.pusher.com https://*.blob.vercel-storage.com https://*.private.blob.vercel-storage.com https://*.public.blob.vercel-storage.com https://blob.vercel-storage.com",
].join('; ');

const PUBLIC_API_ROUTES = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
]);

function isPublicApiRoute(pathname: string) {
  return (
    PUBLIC_API_ROUTES.has(pathname) ||
    pathname === '/api/portal/subcontratistas' ||
    pathname.startsWith('/api/portal/subcontratistas/')
  );
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  return response;
}

function clearCustomSession(response: NextResponse) {
  for (const name of ['auth_token', 'user_role', 'user_email', 'user_cargo']) {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      httpOnly: name === 'auth_token',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
    });
  }
  return response;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  if (request.nextUrl.pathname === '/auth/callback') {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');
    const errorDescription = request.nextUrl.searchParams.get('error_description');

    if (error) {
      return withSecurityHeaders(
        NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, request.url))
      );
    }

    if (code) {
      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          return withSecurityHeaders(
            NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, request.url))
          );
        }
        return withSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
      } catch {
        return withSecurityHeaders(
          NextResponse.redirect(new URL('/auth/login?error=authentication_failed', request.url))
        );
      }
    }
  }

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/debug') || pathname.startsWith('/api/test')) {
    return withSecurityHeaders(NextResponse.json({ error: 'Debug endpoints disabled in production' }, { status: 404 }));
  }

  // Public auth endpoints must run before custom-session validation. If an old
  // auth_token is invalid, clearing it in middleware on the login request can
  // conflict with the fresh Set-Cookie emitted by the login route.
  if (pathname.startsWith('/api/') && isPublicApiRoute(pathname)) {
    return withSecurityHeaders(response);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authToken = request.cookies.get('auth_token')?.value;
  const customSession = await verifyCustomSession(authToken);
  const isAuthenticated = Boolean(user || customSession);

  if (authToken && !customSession) {
    response = clearCustomSession(response);
  }

  if (pathname.startsWith('/api/')) {
    const isDemoMode = process.env.DEMO_PUBLIC_READ === 'true';
    const isReadRequest = request.method === 'GET';

    // Admin canonical import is guarded by ADMIN_INIT_TOKEN instead of a session.
    if (pathname.startsWith('/api/admin/canonical-import') || pathname.startsWith('/api/admin/hse-canonical-import') || pathname.startsWith('/api/admin/hse-workbooks-import')) {
      const adminToken = process.env.ADMIN_INIT_TOKEN;
      const authHeader = request.headers.get('authorization') || '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const providedToken = request.headers.get('x-admin-token') || bearer;
      if (adminToken && providedToken === adminToken) {
        return withSecurityHeaders(response);
      }
    }

    if (isDemoMode && isReadRequest) {
      return withSecurityHeaders(response);
    }

    if (!isAuthenticated) {
      return withSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    return withSecurityHeaders(response);
  }

  const protectedPaths = ['/dashboard', '/admin', '/setup'];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`);
    return withSecurityHeaders(clearCustomSession(NextResponse.redirect(loginUrl)));
  }

  return withSecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
