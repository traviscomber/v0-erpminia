export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import {
  listInventoryStockAlerts,
  type InventoryStockAlertItem,
} from '@/lib/api/inventory-stock-alerts';

type ReorderAlert = {
  id: string;
  stock_id: string;
  alert_type: 'low_stock';
  threshold_value: number;
  current_value: number;
  status: 'active';
  stock: InventoryStockAlertItem;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const result = await listInventoryStockAlerts({
      organizationId: context.organizationId,
      supabase: context.supabase,
    });

    const alerts: ReorderAlert[] = result.items.map((item) => ({
      id: item.id,
      stock_id: item.id,
      alert_type: 'low_stock',
      threshold_value: Number(item.reorder_level || 0),
      current_value: Number(item.quantity_on_hand || 0),
      status: 'active',
      stock: item,
    }));
    const criticalAlerts = alerts.filter((alert) => alert.current_value === 0).length;

    return NextResponse.json({
      alerts,
      stats: {
        activeAlerts: alerts.length,
        lowStockItems: alerts.length,
        criticalAlerts,
      },
      dataSource: result.dataSource,
      evaluatedItems: result.evaluatedItems,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudieron obtener las alertas de reposición';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
