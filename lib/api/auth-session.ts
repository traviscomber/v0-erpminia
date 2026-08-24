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
  applicationUserId?: string;
  role?: string;
  organizationId?: string;
  fullName?: string;
};

function normalizeEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase();
}

function normalizeRole(role?: string | null) {
  return String(role || '').trim().toLowerCase();
}

function resolveEffectiveRole(profileRole?: string | null, assignedRole?: string | null) {
  const normalizedProfileRole = normalizeRole(profileRole);
  const normalizedAssignedRole = normalizeRole(assignedRole);

  if (normalizedProfileRole === 'superadmin' || normalizedProfileRole === 'super_admin') {
    return normalizedProfileRole;
  }

  return normalizedAssignedRole || normalizedProfileRole || undefined;
}

async function enrichIdentity(
  userId: string,
  email?: string | null,
  allowVerifiedEmailFallback = false
): Promise<EnrichedIdentity> {
  try {
    const adminClient = getSupabaseServerClient();
    const profileFields = 'id, organization_id, role, full_name, first_name, last_name';

    const { data: profileById } = await adminClient
      .from('profiles')
      .select(profileFields)
      .eq('id', userId)
      .maybeSingle();

    let profile = profileById;
    const normalizedEmail = normalizeEmail(email);

    if (!profile) {
      const { data: identityLink } = await adminClient
        .from('auth_profile_identity_links')
        .select('profile_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (identityLink?.profile_id) {
        const { data: linkedProfile } = await adminClient
          .from('profiles')
          .select(profileFields)
          .eq('id', identityLink.profile_id)
          .maybeSingle();
        profile = linkedProfile;
      }
    }

    // Compatibility fallback for verified Supabase users created before MOTIL
    // standardized on shared Auth/profile UUIDs. Once resolved, persist the link.
    if (!profile && allowVerifiedEmailFallback && normalizedEmail) {
      const { data: legacyProfile } = await adminClient
        .from('profiles')
        .select(profileFields)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (legacyProfile) {
        profile = legacyProfile;
        await adminClient
          .from('auth_profile_identity_links')
          .upsert(
            {
              auth_user_id: userId,
              profile_id: legacyProfile.id,
              linked_email: normalizedEmail,
              link_reason: 'verified_email_runtime_bridge',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'auth_user_id' }
          );
      }
    }

    const applicationUserId = profile?.id || userId;
    const { data: roleRows } = await adminClient
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', applicationUserId)
      .order('created_at', { ascending: false })
      .limit(1);

    const roleRow = roleRows?.[0];
    return {
      applicationUserId,
      organizationId: profile?.organization_id || roleRow?.organization_id || undefined,
      role: resolveEffectiveRole(profile?.role, roleRow?.role),
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

  const identity = await enrichIdentity(
    user.id,
    user.email,
    Boolean(user.email_confirmed_at)
  );
  const applicationUserId = identity.applicationUserId || user.id;

  return {
    user: {
      id: applicationUserId,
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
    const identity = await enrichIdentity(
      customSession.user.id,
      customSession.user.email,
      true
    );
    const applicationUserId = identity.applicationUserId || customSession.user.id;
    const organizationId = identity.organizationId || customSession.user.organization_id || undefined;
    const role = identity.role || customSession.role || undefined;

    return {
      user: {
        id: applicationUserId,
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
