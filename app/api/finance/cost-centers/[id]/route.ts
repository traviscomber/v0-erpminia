export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, routeContext: RouteContext) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { id } = await routeContext.params;
    const intelligence = context.supabase.schema('intelligence');
    const canonical = context.supabase.schema('canonical');

    const centerResult = await intelligence
      .from('cost_center_financials')
      .select('*')
      .eq('organization_id', context.organizationId)
      .eq('canonical_cost_center_id', id)
      .maybeSingle();

    if (centerResult.error) throw centerResult.error;
    if (!centerResult.data) return NextResponse.json({ error: 'Centro de costo no encontrado' }, { status: 404 });

    const code = centerResult.data.cost_center_code;
    const publicCostCenterId = centerResult.data.public_cost_center_id;

    const [costsResult, ordersResult, workOrdersResult] = await Promise.all([
      canonical
        .from('asset_costs')
        .select('id, transaction_date, asset_code, asset_name, category, document_number, description, quantity, unit_cost, total_cost, currency, validation_status')
        .eq('organization_id', context.organizationId)
        .eq('cost_center_code', code)
        .order('transaction_date', { ascending: false })
        .limit(200),
      canonical
        .from('purchase_orders')
        .select('id, order_number, order_date, supplier_name, currency, net_amount, total_amount, status, operational_status, validation_status')
        .eq('organization_id', context.organizationId)
        .eq('cost_center_code', code)
        .order('order_date', { ascending: false })
        .limit(100),
      publicCostCenterId
        ? context.supabase
            .from('maintenance_work_orders')
            .select('id, work_order_number, title, status, priority, scheduled_date, canonical_asset_id, assigned_to_name, updated_at')
            .eq('organization_id', context.organizationId)
            .eq('cost_center_id', publicCostCenterId)
            .order('updated_at', { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const error = costsResult.error || ordersResult.error || workOrdersResult.error;
    if (error) throw error;

    const assetIds = [...new Set((workOrdersResult.data || []).map((row) => row.canonical_asset_id).filter(Boolean))];
    const assetsResult = assetIds.length
      ? await canonical.from('assets').select('id, asset_code, name, category, status').in('id', assetIds)
      : { data: [], error: null };
    if (assetsResult.error) throw assetsResult.error;

    return NextResponse.json({
      costCenter: centerResult.data,
      actualCosts: costsResult.data || [],
      purchaseOrders: ordersResult.data || [],
      workOrders: workOrdersResult.data || [],
      assets: assetsResult.data || [],
      source: 'canonical + intelligence',
      canonical: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la trazabilidad financiera';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
