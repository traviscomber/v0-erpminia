import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { verifyAuthCookieValue } from '@/lib/auth-cookie';

export async function middleware(request: NextRequest) {
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

  // Handle Supabase auth callback from email links
  if (request.nextUrl.pathname === '/auth/callback') {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');
    const error_description = request.nextUrl.searchParams.get('error_description');

    if (error) {
      console.error('[v0] Auth callback error:', error, error_description);
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error_description || error)}`, request.url)
      );
    }

    if (code) {
      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('[v0] Code exchange error:', exchangeError);
          return NextResponse.redirect(
            new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
          );
        }

        // Session established successfully
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch (err) {
        console.error('[v0] Callback error:', err);
        return NextResponse.redirect(
          new URL('/auth/login?error=authentication_failed', request.url)
        );
      }
    }
  }

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Also check for custom auth_token cookie (from our login API)
  const authToken = request.cookies.get('auth_token')?.value;
  const customSession = await verifyAuthCookieValue(authToken);
  const customAuthValid = !!customSession?.user?.id && !!customSession?.session_token;

  const isAuthenticated = !!user || customAuthValid;

  // Protected API routes - Dev-friendly security
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Explicit public routes (don't require any auth)
    const publicApiRoutes = ['/api/health', '/api/auth/login', '/api/auth/register', '/api/auth/logout'];
    const isPublicRoute = publicApiRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    
    // Demo mode: Allow GET requests for public read access
    const isDemoMode = process.env.DEMO_PUBLIC_READ === 'true';
    const isReadRequest = request.method === 'GET';
    const isWriteRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    
    // Block dangerous debug/test endpoints in production
    if (request.nextUrl.pathname.startsWith('/api/debug') || 
        request.nextUrl.pathname.startsWith('/api/test-')) {
      const devAdminKey = process.env.DEV_ADMIN_KEY;
      const providedKey = request.headers.get('x-dev-admin-key');
      
      if (!devAdminKey || providedKey !== devAdminKey) {
        return NextResponse.json(
          { error: 'Not found' },
          { status: 404 }
        );
      }
    }
    
    // For write operations, require either auth OR dev write key
    if (isWriteRequest && !isPublicRoute) {
      const devWriteKey = process.env.DEV_WRITE_KEY;
      const providedWriteKey = request.headers.get('x-dev-write-key');
      const hasValidDevKey = devWriteKey && providedWriteKey === devWriteKey;
      
      if (!isAuthenticated && !hasValidDevKey) {
        return NextResponse.json(
          { error: 'Unauthorized - Write operations require authentication or dev key' },
          { status: 401 }
        );
      }
    }
    
    // For read operations in non-demo mode, require auth
    if (isReadRequest && !isPublicRoute && !isDemoMode && !isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  // Protected admin/setup routes - redirect to login
  if (request.nextUrl.pathname.startsWith('/setup') || 
      request.nextUrl.pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Protected dashboard - redirect to login
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Protected routes - setup only accessible before auth
  if (request.nextUrl.pathname === '/setup') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Auth routes - redirect to dashboard if already logged in
  if (
    request.nextUrl.pathname === '/auth/login' ||
    request.nextUrl.pathname === '/auth/register'
  ) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|icon).*)',
  ],
};
