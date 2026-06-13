import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const reference_id = searchParams.get('reference_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

    let query = context.supabase
      .from('stock_movements')
      .select('*, performed_by:profiles(full_name)')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (reference_id) {
      query = query.eq('reference_id', reference_id);
    }

    const { data: movements, error } = await query;

    if (error) throw error;

    // Also get incident investigations for HSE audit
    const { data: incidents } = await context.supabase
      .from('incidents')
      .select('*, investigation:incident_investigations(investigation_notes, status)')
      .order('date_reported', { ascending: false })
      .limit(50);

    return NextResponse.json({
      stock_movements: movements || [],
      incidents: incidents || [],
      total_records: (movements.length || 0) + ((incidents || []).length || 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch audit log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
