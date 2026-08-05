export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const organizationId = context.organizationId;
    const intelligence = context.supabase.schema('intelligence');
    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    const status = request.nextUrl.searchParams.get('status')?.trim() || '';

    let positionsQuery = intelligence
      .from('inventory_position')
      .select('*')
      .eq('organization_id', organizationId)
      .order('stock_value', { ascending: false })
      .limit(200);

    if (status) positionsQuery = positionsQuery.eq('stock_status', status);
    if (query) positionsQuery = positionsQuery.or(`product_code.ilike.%${query}%,product_name.ilike.%${query}%`);

    const [overviewResult, positionsResult] = await Promise.all([
      intelligence.from('inventory_overview').select('*').eq('organization_id', organizationId).maybeSingle(),
      positionsQuery,
    ]);

    const error = overviewResult.error || positionsResult.error;
    if (error) throw error;

    return NextResponse.json({
      overview: overviewResult.data || null,
      positions: positionsResult.data || [],
      source: 'intelligence.inventory_position',
      canonical: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el inventario canónico';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
