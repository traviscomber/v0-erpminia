import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await resolveAuthContext(request);
    if (!auth?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cost centers for this organization
    const { data: costCenters, error } = await supabase
      .from('cost_centers')
      .select('id, code, name, description, status')
      .eq('organization_id', auth.organizationId)
      .eq('status', 'active')
      .order('code');

    if (error) {
      console.error('[API] Cost centers fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(costCenters);
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
