import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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

function withSecurityHeaders(response: NextResponse) {
  response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
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
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  if (request.nextUrl.pathname === '/auth/callback') {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');
    const error_description = request.nextUrl.searchParams.get('error_description');

    if (error) {
      console.error('[v0] Auth callback error:', error, error_description);
      return withSecurityHeaders(
        NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error_description || error)}`, request.url))
      );
    }

    if (code) {
      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('[v0] Code exchange error:', exchangeError);
          return withSecurityHeaders(
            NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, request.url))
          );
        }

        return withSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
      } catch (err) {
        console.error('[v0] Callback error:', err);
        return withSecurityHeaders(
          NextResponse.redirect(new URL('/auth/login?error=authentication_failed', request.url))
        );
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authToken = request.cookies.get('auth_token')?.value;
  let customAuthValid = false;

  if (authToken) {
    try {
      const sessionData = JSON.parse(authToken);
      customAuthValid = !!(sessionData?.user?.id && sessionData?.session_token);
    } catch {
      customAuthValid = false;
    }
  }

  const isAuthenticated = !!user || customAuthValid;

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const publicApiRoutes = ['/api/health', '/api/auth/login', '/api/auth/register', '/api/auth/logout'];
    const isPublicRoute = publicApiRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

    const isDemoMode = process.env.DEMO_PUBLIC_READ === 'true';
    const isReadRequest = request.method === 'GET';
    const isWriteRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

    if (request.nextUrl.pathname.startsWith('/api/debug') || request.nextUrl.pathname.startsWith('/api/test')) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Debug endpoints disabled in production' }, { status: 404 })
      );
    }

    if (isPublicRoute) {
      return withSecurityHeaders(response);
    }

    if (isDemoMode && isReadRequest && !isWriteRequest) {
      return withSecurityHeaders(response);
    }

    if (!isAuthenticated) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }

    return withSecurityHeaders(response);
  }

  const protectedPaths = ['/dashboard', '/admin', '/api/admin', '/setup'];
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return withSecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
