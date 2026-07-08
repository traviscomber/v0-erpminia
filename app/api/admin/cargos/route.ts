import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request);

    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS (cargos is a reference table with no SELECT policy)
    const supabase = getServiceSupabase();

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
