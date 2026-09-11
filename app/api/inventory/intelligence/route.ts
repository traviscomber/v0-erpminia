export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.BODEGA_INVENTARIO);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const organizationId = context.organizationId;
    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    const status = request.nextUrl.searchParams.get('status')?.trim() || '';

    let positionsQuery = context.supabase
      .from('inventory_intelligence_position_v1')
      .select('*')
      .eq('organization_id', organizationId)
      .order('stock_value', { ascending: false })
      .limit(200);

    if (status) positionsQuery = positionsQuery.eq('stock_status', status);
    if (query) positionsQuery = positionsQuery.or(`product_code.ilike.%${query}%,product_name.ilike.%${query}%`);

    const [overviewResult, positionsResult, dieselResult] = await Promise.all([
      context.supabase.from('inventory_intelligence_overview_v1').select('*').eq('organization_id', organizationId).maybeSingle(),
      positionsQuery,
      context.supabase
        .from('inventory_intelligence_position_v1')
        .select('stock_id,product_id,product_code,product_name,family,unit,quantity_available,quantity_reserved,unit_cost,stock_value,stock_status,last_counted_date,warehouse_code,validation_status')
        .eq('organization_id', organizationId)
        .eq('product_code', 'Combustible001')
        .maybeSingle(),
    ]);

    const error = overviewResult.error || positionsResult.error || dieselResult.error;
    if (error) throw error;

    return NextResponse.json({
      overview: overviewResult.data || null,
      positions: positionsResult.data || [],
      diesel: dieselResult.data || null,
      source: 'public.inventory_intelligence_position_v1',
      canonical: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el inventario canónico';
    console.error('[inventory/intelligence]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
