import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const maintenanceWriteRoles = new Set([
  'superadmin',
  'admin',
  'operaciones-supervisor',
  'jefe_mantencion',
]);

const productionWriteRoles = new Set([
  'superadmin',
  'admin',
  'operaciones-supervisor',
]);

export type OrganizationContext =
  | {
      ok: false;
      response: NextResponse;
    }
  | {
      ok: true;
      organizationId: string;
      userId: string;
      role?: string;
      userEmail?: string;
      userName?: string;
      supabase: ReturnType<typeof getSupabaseServerClient>;
    };

export type OrganizationSuccessContext = Extract<OrganizationContext, { ok: true }>;

export function isOrganizationSuccessContext(
  context: OrganizationContext
): context is OrganizationSuccessContext {
  return context.ok;
}

function normalizeRole(role?: string | null) {
  return String(role || '').trim().toLowerCase();
}

function isMutation(request: NextRequest, prefix: string) {
  return (
    request.nextUrl.pathname.startsWith(prefix) &&
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())
  );
}

export async function getOrganizationContext(
  request: NextRequest
): Promise<OrganizationContext> {
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return {
      ok: false,
      response:
        auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    };
  }

  const role = normalizeRole(auth.role);
  if (isMutation(request, '/api/maintenance/') && !maintenanceWriteRoles.has(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: maintenance write role required' },
        { status: 403 }
      ),
    };
  }

  if (isMutation(request, '/api/produccion/') && !productionWriteRoles.has(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: production write role required' },
        { status: 403 }
      ),
    };
  }

  const supabase = getSupabaseServerClient();
  let userName = auth.user.full_name || auth.user.email || auth.user.id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, first_name, last_name')
      .eq('id', auth.user.id)
      .maybeSingle();

    const profileName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();

    if (profileName) userName = profileName;
  } catch {
    // Keep APIs usable even when profile enrichment fails.
  }

  return {
    ok: true,
    organizationId: auth.organizationId,
    userId: auth.user.id,
    role: auth.role || undefined,
    userEmail: auth.user.email,
    userName,
    supabase,
  };
}
