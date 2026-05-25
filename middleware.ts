import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

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

  // Protected API routes - require authentication
  if (request.nextUrl.pathname.startsWith('/api/admin') || 
      request.nextUrl.pathname.startsWith('/api/sostenibilidad')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Protected admin/setup routes - require admin role
  if (request.nextUrl.pathname.startsWith('/setup') || 
      request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    // Check server-side role (don't trust client metadata)
    const { data: userData } = await supabase
      .from('auth.users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (userData?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protected routes - require authentication
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Protected routes - setup only accessible before auth
  if (request.nextUrl.pathname === '/setup') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Auth routes - redirect to dashboard if already logged in
  if (
    request.nextUrl.pathname === '/auth/login' ||
    request.nextUrl.pathname === '/auth/register'
  ) {
    if (user) {
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
