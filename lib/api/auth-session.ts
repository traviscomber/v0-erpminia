import { type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export interface AuthSessionUser {
  id: string;
  email?: string;
  full_name?: string;
  organization_id?: string;
}

export interface AuthSessionData {
  user: AuthSessionUser;
  role?: string;
  session_token: string;
}

export interface AuthContext {
  user: AuthSessionUser;
  role?: string;
  organizationId?: string;
  sessionToken?: string;
  source: 'custom-cookie' | 'supabase';
}

function parseAuthToken(token?: string | null): AuthSessionData | null {
  if (!token) return null;

  try {
    const parsed = JSON.parse(token) as Partial<AuthSessionData>;
    if (!parsed.user?.id || !parsed.session_token) {
      return null;
    }

    return {
      user: parsed.user,
      role: parsed.role,
      session_token: parsed.session_token,
    };
  } catch {
    return null;
  }
}

async function resolveSupabaseAuth(request: NextRequest): Promise<AuthContext | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  let organizationId: string | undefined;
  let role: string | undefined;
  let fullName: string | undefined;

  try {
    const adminClient = getSupabaseServerClient();
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      adminClient
        .from('profiles')
        .select('organization_id, role, full_name, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle(),
      adminClient
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .limit(1),
    ]);

    organizationId =
      profile?.organization_id || roleRows?.[0]?.organization_id || undefined;
    role = profile?.role || roleRows?.[0]?.role || undefined;
    fullName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      undefined;
  } catch {
    // Keep auth working even if profile enrichment fails.
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: fullName,
      organization_id: organizationId,
    },
    role,
    organizationId,
    source: 'supabase',
  };
}

export async function resolveAuthContext(
  request: NextRequest
): Promise<AuthContext | null> {
  const customSession = parseAuthToken(request.cookies.get('auth_token')?.value);

  if (customSession) {
    return {
      user: customSession.user,
      role: customSession.role,
      organizationId: customSession.user.organization_id,
      sessionToken: customSession.session_token,
      source: 'custom-cookie',
    };
  }

  return resolveSupabaseAuth(request);
}
