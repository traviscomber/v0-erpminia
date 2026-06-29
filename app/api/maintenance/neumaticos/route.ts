export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { normalizeText } from '@/lib/bodega-normalization';

type WarehouseStockRow = {
  id: string;
  part_code: string | null;
  part_name: string | null;
  quantity_on_hand: number | string | null;
  quantity_reserved: number | string | null;
  quantity_available: number | string | null;
  reorder_level: number | string | null;
  reorder_quantity: number | string | null;
  unit_cost: number | string | null;
  bin?: Array<{
    bin_code: string | null;
    bin_location: string | null;
  }> | null;
};

type TireItem = {
  id: string;
  partCode: string | null;
  partName: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderLevel: number;
  reorderQuantity: number;
  unitCost: number;
  binCode: string | null;
  binLocation: string | null;
  totalValue: number;
  lowStock: boolean;
  isTire: boolean;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('warehouse_stock')
      .select('id, part_code, part_name, quantity_on_hand, quantity_reserved, quantity_available, reorder_level, reorder_quantity, unit_cost, bin:warehouse_bins(bin_code, bin_location)')
      .eq('organization_id', context.organizationId)
      .order('part_name', { ascending: true });

    if (error) throw error;

    const items = (Array.isArray(data) ? (data as WarehouseStockRow[]) : [])
      .map<TireItem>((item) => {
        const searchable = normalizeText(`${item.part_code || ''} ${item.part_name || ''}`);
        const isTire =
          searchable.includes('neumatic') ||
          searchable.includes('llanta') ||
          searchable.startsWith('neu') ||
          searchable.includes('rodado');

        const quantityOnHand = Number(item.quantity_on_hand || 0);
        const quantityReserved = Number(item.quantity_reserved || 0);
        const quantityAvailable = Number(item.quantity_available ?? Math.max(0, quantityOnHand - quantityReserved));

        return {
          id: item.id,
          partCode: item.part_code,
          partName: item.part_name,
          quantityOnHand,
          quantityReserved,
          quantityAvailable,
          reorderLevel: Number(item.reorder_level || 0),
          reorderQuantity: Number(item.reorder_quantity || 0),
          unitCost: Number(item.unit_cost || 0),
          binCode: item.bin?.[0]?.bin_code || null,
          binLocation: item.bin?.[0]?.bin_location || null,
          totalValue: Number((quantityOnHand * Number(item.unit_cost || 0)).toFixed(2)),
          lowStock: quantityAvailable <= Number(item.reorder_level || 0),
          isTire,
        };
      })
      .filter((item) => item.isTire);

    const summary = {
      totalItems: items.length,
      lowStock: items.filter((item) => item.lowStock).length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantityOnHand, 0),
      totalValue: items.reduce((sum, item) => sum + item.totalValue, 0),
    };

    return NextResponse.json({ items, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la gestion de neumaticos';
    return NextResponse.json({ items: [], summary: { totalItems: 0, lowStock: 0, totalQuantity: 0, totalValue: 0 }, error: message }, { status: 500 });
  }
}
