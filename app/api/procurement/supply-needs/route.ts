export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('work_order_supply_needs')
      .select(`
        id,
        work_order_id,
        canonical_asset_id,
        canonical_product_id,
        quantity_required,
        quantity_available,
        quantity_shortage,
        priority,
        required_date,
        status,
        created_at,
        maintenance_work_orders!inner(work_order_number,title),
        canonical_product:canonical_product_id(product_code,name,unit)
      `)
      .eq('organization_id', context.organizationId)
      .in('status', ['open', 'pending', 'ready_for_procurement'])
      .gt('quantity_shortage', 0)
      .order('priority', { ascending: false })
      .order('required_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    return NextResponse.json({ needs: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las necesidades de abastecimiento';
    return NextResponse.json({ needs: [], error: message }, { status: 500 });
  }
}
