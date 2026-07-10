import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { createClient } from '@supabase/supabase-js';

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

    // Check role for maintenance access (técnico, jefe técnico, admin, superadmin)
    const allowedRoles = ['admin', 'superadmin', 'manager', 'technician'];
    if (!allowedRoles.includes(auth.role?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getServiceSupabase();

    // Get all equipment with full details
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select('id, code, name, model, serial_number, type, status, criticality, location, purchase_date, last_maintenance, next_maintenance, specs')
      .order('criticality', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.log('[v0] Equipment fetch error:', error);
      throw error;
    }

    return NextResponse.json({ equipment: equipment || [] });
  } catch (error) {
    console.error('[v0] Maintenance equipment API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
