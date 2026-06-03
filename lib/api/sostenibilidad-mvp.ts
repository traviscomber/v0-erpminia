import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;

export type SustainabilityContext =
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
      supabase: SupabaseServerClient;
    };

export async function getSustainabilityContext(
  request: NextRequest
): Promise<SustainabilityContext> {
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return {
      ok: false,
      response:
        auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const supabase = getSupabaseServerClient();
  let userName =
    auth.user.full_name || auth.user.email || auth.user.id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, first_name, last_name')
      .eq('id', auth.user.id)
      .maybeSingle();

    const profileName =
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();

    if (profileName) {
      userName = profileName;
    }
  } catch {
    // Keep auth context usable even when profile enrichment fails.
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

export function normalizeNcStatus(status?: string | null) {
  const value = String(status || 'open').trim().toLowerCase();

  if (['abierta', 'abierto', 'open'].includes(value)) return 'open';
  if (['en_progreso', 'in_progress', 'progress'].includes(value)) return 'in_progress';
  if (['cerrada', 'closed', 'completada', 'completed'].includes(value)) return 'closed';

  return value;
}

export function normalizeCorrectiveActionStatus(status?: string | null) {
  const value = String(status || 'planned').trim().toLowerCase();

  if (['abierta', 'open', 'planned', 'planificada'].includes(value)) return 'planned';
  if (['en_progreso', 'in_progress'].includes(value)) return 'in_progress';
  if (['cerrada', 'closed', 'completed', 'completada'].includes(value)) return 'completed';
  if (['verified', 'verificada'].includes(value)) return 'verified';

  return value;
}

export function isPastDue(dateValue?: string | null) {
  if (!dateValue) return false;

  const dueDate = new Date(dateValue);
  if (Number.isNaN(dueDate.getTime())) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < now;
}

export async function buildOrgSequence(
  supabase: SupabaseServerClient,
  table: string,
  organizationId: string,
  prefix: string
) {
  const { count } = await supabase
    .from(table)
    .select('*', { head: true, count: 'exact' })
    .eq('organization_id', organizationId);

  const next = (count || 0) + 1;
  return `${prefix}-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`;
}
