export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type WarehouseBinRow = {
  bin_code: string | null;
  bin_location: string | null;
};

type WarehouseStockRow = {
  id: string;
  part_code: string | null;
  part_name: string | null;
  quantity_on_hand: number | string | null;
  quantity_reserved: number | string | null;
  reorder_level: number | string | null;
  reorder_quantity: number | string | null;
  unit_cost: number | string | null;
  bin_location: string | null;
  bin?: WarehouseBinRow | null;
};

type WarehouseStockItem = {
  id: string;
  part_code: string | null;
  part_name: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_level: number;
  reorder_quantity: number;
  unit_cost: number;
  total_value: number;
  bin_location: string;
  is_low_stock: boolean;
  is_critical: boolean;
};

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

    const rows = Array.isArray(stock) ? (stock as WarehouseStockRow[]) : [];
    const items: WarehouseStockItem[] = rows.map((item) => {
      const quantityOnHand = Number(item.quantity_on_hand || 0);
      const quantityReserved = Number(item.quantity_reserved || 0);
      const reorderLevel = Number(item.reorder_level || 0);
      const reorderQuantity = Number(item.reorder_quantity || 0);
      const unitCost = Number(item.unit_cost || 0);

      return {
        id: item.id,
        part_code: item.part_code,
        part_name: item.part_name,
        quantity_on_hand: quantityOnHand,
        quantity_reserved: quantityReserved,
        quantity_available: quantityOnHand - quantityReserved,
        reorder_level: reorderLevel,
        reorder_quantity: reorderQuantity,
        unit_cost: unitCost,
        total_value: quantityOnHand * unitCost,
        bin_location: item.bin?.bin_location || item.bin_location || 'N/A',
        is_low_stock: quantityOnHand <= reorderLevel,
        is_critical: quantityOnHand === 0,
      };
    });

    const summary = {
      total_items: items.length,
      total_quantity: items.reduce((sum, i) => sum + i.quantity_on_hand, 0),
      total_value: items.reduce((sum, i) => sum + i.total_value, 0),
      low_stock_count: items.filter((i) => i.is_low_stock).length,
      critical_count: items.filter((i) => i.is_critical).length,
    };

    return NextResponse.json({ items, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo obtener el stock';
    return NextResponse.json({
      items: [],
      summary: {
        total_items: 0,
        total_quantity: 0,
        total_value: 0,
        low_stock_count: 0,
        critical_count: 0,
      },
      warning: message,
    });
  }
}
