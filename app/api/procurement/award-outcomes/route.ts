export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [{ data: outcomes, error: outcomesError }, { data: summary, error: summaryError }] = await Promise.all([
      context.supabase
        .from('procurement_award_outcomes_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .order('decided_at', { ascending: false })
        .limit(100),
      context.supabase
        .from('procurement_award_outcome_summary_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .order('primary_reason'),
    ]);

    if (outcomesError) throw outcomesError;
    if (summaryError) throw summaryError;

    return NextResponse.json({ outcomes: outcomes || [], summary: summary || [] });
  } catch (error) {
    console.error('[procurement/award-outcomes]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar aprendizaje de adjudicaciones.' }, { status: 500 });
  }
}
