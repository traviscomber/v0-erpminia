import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataType = searchParams.get('type') || 'summary';

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all HSE canonical data
    const [
      { data: roles, count: rolesCount, error: rolesError },
      { data: commitments, count: commitmentsCount, error: commitmentsError },
      { data: facilities, count: facilitiesCount, error: facilitiesError }
    ] = await Promise.all([
      sb
        .from('hse_roles')
        .select('id, name, description, permissions, is_active', { count: 'exact' })
        .eq('organization_id', ORG_ID)
        .order('name', { ascending: true }),
      sb
        .from('hse_commitments')
        .select('id, commitment_id, description, requirement, responsible, due_date, status', { count: 'exact' })
        .eq('organization_id', ORG_ID)
        .order('due_date', { ascending: true }),
      sb
        .from('hse_facilities')
        .select('id, code, name, location, type, risk_level', { count: 'exact' })
        .eq('organization_id', ORG_ID)
        .order('name', { ascending: true }),
    ]);

    if (rolesError || commitmentsError || facilitiesError) {
      throw new Error('Error fetching HSE data');
    }

    const summary = {
      totalRoles: rolesCount || 0,
      totalCommitments: commitmentsCount || 0,
      totalFacilities: facilitiesCount || 0,
      activeRoles: (roles || []).filter(r => r.is_active).length,
      pendingCommitments: (commitments || []).filter(c => c.status === 'Pendiente').length,
      highRiskFacilities: (facilities || []).filter(f => f.risk_level === 'Crítico').length,
    };

    if (dataType === 'summary') {
      return NextResponse.json(summary);
    }

    if (dataType === 'roles') {
      return NextResponse.json({ data: roles, count: rolesCount });
    }

    if (dataType === 'commitments') {
      return NextResponse.json({ data: commitments, count: commitmentsCount });
    }

    if (dataType === 'facilities') {
      return NextResponse.json({ data: facilities, count: facilitiesCount });
    }

    // Return all data
    return NextResponse.json({
      summary,
      roles: { data: roles, count: rolesCount },
      commitments: { data: commitments, count: commitmentsCount },
      facilities: { data: facilities, count: facilitiesCount },
    });

  } catch (error) {
    console.error('[HSE Data API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HSE data' },
      { status: 500 }
    );
  }
}
