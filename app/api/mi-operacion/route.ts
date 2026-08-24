export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { GET as getProductionOverview } from '@/app/api/produccion/canonical-overview/route';

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, role, status')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const isPedro = profile?.full_name === 'Pedro Pablo Zegers' && profile?.role === 'gerente_operaciones' && profile?.status === 'active';
  if (!isPedro) {
    return NextResponse.json({ error: 'Vista ejecutiva no disponible para este usuario' }, { status: 403 });
  }

  return getProductionOverview(request);
}
