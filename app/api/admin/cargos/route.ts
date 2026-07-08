import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request);

    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Get all cargos ordered by display_order
    const { data: cargos, error } = await supabase
      .from('cargos')
      .select('id, name, display_order')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[v0] Error fetching cargos:', error);
      return NextResponse.json({ error: 'Failed to fetch cargos' }, { status: 500 });
    }

    return NextResponse.json({ cargos: cargos || [] });
  } catch (error) {
    console.error('[v0] Unexpected error in GET /api/admin/cargos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
