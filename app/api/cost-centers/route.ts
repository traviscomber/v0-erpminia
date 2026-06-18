import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get user's organization from user_roles
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization_id from user_roles
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userRole) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    // Get cost centers for this organization
    const { data: costCenters, error } = await supabase
      .from('cost_centers')
      .select('id, code, name, description, status')
      .eq('organization_id', userRole.organization_id)
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
