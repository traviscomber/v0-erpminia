import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Guard: Require authenticated user
 * Returns 401 JSON for API routes, throws for server components
 */
export async function requireAuth(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    return {
      authorized: false,
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { authorized: true, user, response: null };
}

/**
 * Guard: Require admin role
 * Checks auth + admin role from database
 */
export async function requireAdmin(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user) {
    return { authorized: false, response: auth.response };
  }

  const supabase = getSupabaseServerClient();
  const { data: userData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', auth.user.id)
    .single();

  if (userData?.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden: Admin required' }, { status: 403 }),
    };
  }

  return { authorized: true, user: auth.user, response: null };
}

/**
 * Helper: Return error response if not authorized
 */
export function handleAuthError(authResult: any) {
  if (!authResult.authorized && authResult.response) {
    return authResult.response;
  }
  return null;
}
