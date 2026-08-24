export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { listInventoryStockAlerts } from '@/lib/api/inventory-stock-alerts';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const result = await listInventoryStockAlerts({
      organizationId: context.organizationId,
      supabase: context.supabase,
    });
    const alerts = result.items.map((item) => ({
      id: item.id,
      sku: item.part_code,
      name: item.part_name,
      quantity: item.quantity_on_hand,
      min_stock: item.reorder_level,
      category: item.category,
      location: item.location_label,
      reorder_qty: Math.max(0, item.reorder_level * 2 - item.quantity_on_hand),
      days_until_stockout: item.quantity_on_hand > 0 ? Math.ceil(item.quantity_on_hand) : 0,
    }));

    return NextResponse.json({
      items_below_min_stock: alerts,
      total_alerts: alerts.length,
      dataSource: result.dataSource,
      evaluatedItems: result.evaluatedItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron obtener las alertas de stock';
    return NextResponse.json({ items_below_min_stock: [], total_alerts: 0, error: message }, { status: 500 });
  }
}
