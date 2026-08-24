import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveAuthContext } from '@/lib/api/auth-session';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin']);

function normalizeRole(role?: string | null) {
  return String(role || '').trim().toLowerCase();
}

/**
 * Guard: Require authenticated user
 * Returns 401 JSON for API routes, throws for server components
 */
export async function requireAuth(request: NextRequest) {
  const authContext = await resolveAuthContext(request);

  if (!authContext?.user) {
    return {
      authorized: false,
      user: null,
      role: null,
      organizationId: null,
      source: null,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  return {
    authorized: true,
    user: authContext.user,
    role: authContext.role || null,
    organizationId: authContext.organizationId || authContext.user.organization_id || null,
    source: authContext.source,
    response: null,
  };
}

/**
 * Guard: Require an administrative role.
 * Superadmin is intentionally a superset of admin.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ authorized: boolean; user: any; organizationId: string | null; source: 'custom-cookie' | 'supabase' | null; response: any }> {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.user) {
    return { authorized: false, user: null, organizationId: null, source: null, response: auth.response };
  }

  if (ADMIN_ROLES.has(normalizeRole(auth.role))) {
    return { authorized: true, user: auth.user, organizationId: auth.organizationId, source: auth.source, response: null };
  }

  const supabase = getSupabaseServerClient();
  const { data: userData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ADMIN_ROLES.has(normalizeRole(userData?.role))) {
    return {
      authorized: false,
      user: null,
      organizationId: null,
      source: null,
      response: NextResponse.json({ error: 'Forbidden: Admin required' }, { status: 403 }),
    };
  }

  return { authorized: true, user: auth.user, organizationId: auth.organizationId, source: auth.source, response: null };
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
