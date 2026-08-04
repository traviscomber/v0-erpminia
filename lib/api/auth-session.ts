import { type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { verifyCustomSession } from '@/lib/auth/signed-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export interface AuthSessionUser {
  id: string;
  email?: string;
  full_name?: string;
  organization_id?: string;
}

export interface AuthContext {
  user: AuthSessionUser;
  role?: string;
  organizationId?: string;
  source: 'custom-cookie' | 'supabase';
}

type EnrichedIdentity = {
  role?: string;
  organizationId?: string;
  fullName?: string;
};

async function enrichIdentity(userId: string): Promise<EnrichedIdentity> {
  try {
    const adminClient = getSupabaseServerClient();
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      adminClient
        .from('profiles')
        .select('organization_id, role, full_name, first_name, last_name')
        .eq('id', userId)
        .maybeSingle(),
      adminClient
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const roleRow = roleRows?.[0];
    return {
      organizationId: profile?.organization_id || roleRow?.organization_id || undefined,
      role: profile?.role || roleRow?.role || undefined,
      fullName:
        profile?.full_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
        undefined,
    };
  } catch {
    return {};
  }
}

async function resolveSupabaseAuth(request: NextRequest): Promise<AuthContext | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

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

  if (error || !user) return null;

  const identity = await enrichIdentity(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: identity.fullName,
      organization_id: identity.organizationId,
    },
    role: identity.role,
    organizationId: identity.organizationId,
    source: 'supabase',
  };
}

export async function resolveAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const customSession = await verifyCustomSession(request.cookies.get('auth_token')?.value);

  if (customSession) {
    const identity = await enrichIdentity(customSession.user.id);
    const organizationId = identity.organizationId || customSession.user.organization_id || undefined;
    const role = identity.role || customSession.role || undefined;

    return {
      user: {
        id: customSession.user.id,
        email: customSession.user.email,
        full_name: identity.fullName || customSession.user.full_name || undefined,
        organization_id: organizationId,
      },
      role,
      organizationId,
      source: 'custom-cookie',
    };
  }

  return resolveSupabaseAuth(request);
}
