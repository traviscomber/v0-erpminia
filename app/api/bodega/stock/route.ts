import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: stock, error } = await context.supabase
      .from('warehouse_stock')
      .select('*, bin:warehouse_bins(bin_code, bin_location)')
      .eq('organization_id', context.organizationId)
      .order('part_code');

    if (error) throw error;

    const items = (stock || []).map((item: any) => ({
      id: item.id,
      part_code: item.part_code,
      part_name: item.part_name,
      quantity_on_hand: item.quantity_on_hand || 0,
      quantity_reserved: item.quantity_reserved || 0,
      quantity_available: (item.quantity_on_hand || 0) - (item.quantity_reserved || 0),
      reorder_level: item.reorder_level || 0,
      reorder_quantity: item.reorder_quantity || 0,
      unit_cost: item.unit_cost || 0,
      total_value: (item.quantity_on_hand || 0) * (item.unit_cost || 0),
      bin_location: item.bin?.bin_location || 'N/A',
      is_low_stock: (item.quantity_on_hand || 0) <= (item.reorder_level || 0),
      is_critical: (item.quantity_on_hand || 0) === 0,
    }));

    const summary = {
      total_items: items.length,
      total_quantity: items.reduce((sum: number, i: any) => sum + i.quantity_on_hand, 0),
      total_value: items.reduce((sum: number, i: any) => sum + i.total_value, 0),
      low_stock_count: items.filter((i: any) => i.is_low_stock).length,
      critical_count: items.filter((i: any) => i.is_critical).length,
    };

    return NextResponse.json({ items, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
