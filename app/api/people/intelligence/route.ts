export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const intelligence = context.supabase.schema('intelligence');
    const query = request.nextUrl.searchParams.get('q')?.trim() || '';

    let peopleQuery = intelligence
      .from('person_profiles')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('full_name')
      .limit(250);

    if (query) peopleQuery = peopleQuery.ilike('full_name', `%${query}%`);

    const [overviewResult, peopleResult] = await Promise.all([
      intelligence.from('people_overview').select('*').eq('organization_id', context.organizationId).maybeSingle(),
      peopleQuery,
    ]);

    const error = overviewResult.error || peopleResult.error;
    if (error) throw error;

    return NextResponse.json({
      overview: overviewResult.data || null,
      people: peopleResult.data || [],
      source: 'public.people + intelligence.person_profiles',
      canonicalReadOnly: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar Personas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
