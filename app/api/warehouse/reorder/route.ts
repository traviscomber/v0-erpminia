import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: stock, error } = await context.supabase
      .from('warehouse_stock')
      .select('*, bin:warehouse_bins(id, bin_code, bin_location)')
      .eq('organization_id', context.organizationId)
      .order('quantity_on_hand', { ascending: true });

    if (error) throw error;

    const lowStock = (stock || []).filter(
      (item: any) =>
        item.reorder_level !== null &&
        item.reorder_level !== undefined &&
        Number(item.quantity_on_hand || 0) <= Number(item.reorder_level || 0)
    );

    const alerts = lowStock.map((item: any) => ({
      id: item.id,
      stock_id: item.id,
      alert_type: 'low_stock',
      threshold_value: Number(item.reorder_level || 0),
      current_value: Number(item.quantity_on_hand || 0),
      status: 'active',
      stock: item,
    }));
    const criticalAlerts = alerts.filter((alert: any) => alert.current_value === 0).length;

    return NextResponse.json({
      alerts,
      stats: {
        activeAlerts: alerts.length,
        lowStockItems: alerts.length,
        criticalAlerts,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch reorder alerts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
