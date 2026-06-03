import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type OrganizationContext =
  | {
      ok: false;
      response: NextResponse;
    }
  | {
      ok: true;
      organizationId: string;
      userId: string;
      userEmail?: string;
      userName?: string;
      supabase: ReturnType<typeof getSupabaseServerClient>;
    };

export async function getOrganizationContext(
  request: NextRequest
): Promise<OrganizationContext> {
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return {
      ok: false,
      response:
        auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
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
    userEmail: auth.user.email,
    userName,
    supabase,
  };
}
