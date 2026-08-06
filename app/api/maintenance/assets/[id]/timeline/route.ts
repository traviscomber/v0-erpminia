export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const { id } = await params;

  try {
    const { data: asset, error: assetError } = await context.supabase
      .schema('canonical')
      .from('assets')
      .select('id, asset_code, name, asset_type, category, manufacturer, model, serial_number, license_plate, is_active')
      .eq('organization_id', context.organizationId)
      .eq('id', id)
      .maybeSingle();

    if (assetError) throw assetError;
    if (!asset) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

    const [eventsResult, ordersResult, costsResult, partsResult] = await Promise.all([
      context.supabase
        .from('work_order_events')
        .select('id, work_order_id, event_type, event_at, actor_name, summary, payload')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('event_at', { ascending: false })
        .limit(250),
      context.supabase
        .from('maintenance_work_orders')
        .select('id, work_order_number, title, status, priority, work_type, scheduled_date, start_date, completion_date, meter_reading, meter_unit')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .order('created_at', { ascending: false }),
      context.supabase
        .from('work_order_cost_summary')
        .select('work_order_id, parts_cost, labor_cost, external_cost, total_cost')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id),
      context.supabase
        .from('work_order_parts')
        .select('id, work_order_id, canonical_product_id, quantity_installed, unit_cost, installed_at, installed_by, notes')
        .eq('organization_id', context.organizationId)
        .eq('canonical_asset_id', id)
        .gt('quantity_installed', 0)
        .order('installed_at', { ascending: false, nullsFirst: false }),
    ]);

    const firstError = eventsResult.error || ordersResult.error || costsResult.error || partsResult.error;
    if (firstError) throw firstError;

    const productIds = Array.from(new Set((partsResult.data || []).map((row) => row.canonical_product_id).filter(Boolean)));
    const productsResult = productIds.length > 0
      ? await context.supabase
          .schema('canonical')
          .from('products')
          .select('id, product_code, name, unit')
          .eq('organization_id', context.organizationId)
          .in('id', productIds)
      : { data: [], error: null };
    if (productsResult.error) throw productsResult.error;

    const productsById = new Map((productsResult.data || []).map((product) => [product.id, product]));
    const ordersById = new Map((ordersResult.data || []).map((order) => [order.id, order]));
    const installedParts = (partsResult.data || []).map((part) => ({
      ...part,
      product: productsById.get(part.canonical_product_id) || null,
      workOrder: ordersById.get(part.work_order_id) || null,
      installedCost: Number(part.quantity_installed || 0) * Number(part.unit_cost || 0),
    }));

    const costs = costsResult.data || [];
    const totals = costs.reduce(
      (sum, row) => ({
        partsCost: sum.partsCost + Number(row.parts_cost || 0),
        laborCost: sum.laborCost + Number(row.labor_cost || 0),
        externalCost: sum.externalCost + Number(row.external_cost || 0),
        totalCost: sum.totalCost + Number(row.total_cost || 0),
      }),
      { partsCost: 0, laborCost: 0, externalCost: 0, totalCost: 0 },
    );

    return NextResponse.json({
      asset,
      workOrders: ordersResult.data || [],
      events: eventsResult.data || [],
      costs,
      totals,
      installedParts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la actividad del equipo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
