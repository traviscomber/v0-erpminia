export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext, type OrganizationSuccessContext } from '@/lib/api/organization-context';

type WarehouseZoneRow = {
  id: string;
};

type WarehouseRackRow = {
  id: string;
};

type WarehouseBinRow = {
  id: string;
};

type WarehouseStockRow = {
  id: string;
  organization_id: string;
  part_id: string | null;
  part_code: string | null;
  part_name: string | null;
  quantity_on_hand: number | string | null;
  quantity_reserved: number | string | null;
  quantity_available: number | string | null;
  reorder_level: number | string | null;
  reorder_quantity: number | string | null;
  unit_cost: number | string | null;
  last_counted_date: string | null;
  expiry_date: string | null;
  batch_number: string | null;
  supplier_lot: string | null;
  bin_id: string | null;
};

async function getOrganizationBins(
  supabase: OrganizationSuccessContext['supabase'],
  organizationId: string
): Promise<string[]> {
  const { data: zones, error: zonesError } = await supabase
    .from('warehouse_zones')
    .select('id')
    .eq('organization_id', organizationId);

  if (zonesError) throw zonesError;

  const zoneRows = Array.isArray(zones) ? (zones as WarehouseZoneRow[]) : [];
  const zoneIds = zoneRows.map((zone) => zone.id);
  if (zoneIds.length === 0) return [];

  const { data: racks, error: racksError } = await supabase
    .from('warehouse_racks')
    .select('id')
    .in('zone_id', zoneIds);

  if (racksError) throw racksError;

  const rackRows = Array.isArray(racks) ? (racks as WarehouseRackRow[]) : [];
  const rackIds = rackRows.map((rack) => rack.id);
  if (rackIds.length === 0) return [];

  const { data: bins, error: binsError } = await supabase
    .from('warehouse_bins')
    .select('id')
    .in('rack_id', rackIds);

  if (binsError) throw binsError;

  const binRows = Array.isArray(bins) ? (bins as WarehouseBinRow[]) : [];
  return binRows.map((bin) => bin.id);
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = (await request.json()) as {
      stockId?: string;
      stock_id?: string;
      toBinId?: string;
      to_bin_id?: string;
      quantity?: number | string;
      reason?: string;
    };

    const stockId = body.stockId || body.stock_id;
    const toBinId = body.toBinId || body.to_bin_id;
    const quantity = Number(body.quantity || 0);
    const reason = String(body.reason || '').trim() || null;

    if (!stockId || !toBinId || quantity <= 0) {
      return NextResponse.json(
        { error: 'stockId, toBinId y una cantidad positiva son obligatorios' },
        { status: 400 }
      );
    }

    const validBinIds = await getOrganizationBins(context.supabase, context.organizationId);
    if (!validBinIds.includes(toBinId)) {
      return NextResponse.json({ error: 'No se encontró el bin de destino' }, { status: 404 });
    }

    const { data: sourceStock, error: sourceError } = await context.supabase
      .from('warehouse_stock')
      .select('*')
      .eq('id', stockId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    if (sourceError) throw sourceError;

    const source = sourceStock as WarehouseStockRow | null;
    if (!source) {
      return NextResponse.json({ error: 'No se encontró el stock de origen' }, { status: 404 });
    }

    if (source.bin_id === toBinId) {
      return NextResponse.json(
        { error: 'El bin de destino debe ser diferente al bin de origen' },
        { status: 400 }
      );
    }

    const sourceAvailable = Number(source.quantity_available || source.quantity_on_hand || 0);
    if (quantity > sourceAvailable) {
      return NextResponse.json({ error: 'Stock disponible insuficiente' }, { status: 400 });
    }

    const sourceOnHand = Number(source.quantity_on_hand || 0);
    const movingAll = quantity === sourceOnHand;

    let destinationStock: WarehouseStockRow | null = null;
    if (!movingAll) {
      const { data: existingDest, error: destError } = await context.supabase
        .from('warehouse_stock')
        .select('*')
        .eq('organization_id', context.organizationId)
        .eq('bin_id', toBinId)
        .eq('part_code', source.part_code)
        .is('batch_number', source.batch_number || null)
        .maybeSingle();

      if (destError) throw destError;
      destinationStock = (existingDest as WarehouseStockRow | null) || null;
    }

    if (movingAll) {
      const { error: moveError } = await context.supabase
        .from('warehouse_stock')
        .update({
          bin_id: toBinId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id);

      if (moveError) throw moveError;
    } else {
      const sourceNewQuantity = sourceOnHand - quantity;

      const { error: sourceUpdateError } = await context.supabase
        .from('warehouse_stock')
        .update({
          quantity_on_hand: sourceNewQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id);

      if (sourceUpdateError) throw sourceUpdateError;

      if (destinationStock) {
        const { error: destUpdateError } = await context.supabase
          .from('warehouse_stock')
          .update({
            quantity_on_hand: Number(destinationStock.quantity_on_hand || 0) + quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', destinationStock.id);

        if (destUpdateError) throw destUpdateError;
      } else {
        const { error: insertError } = await context.supabase
          .from('warehouse_stock')
          .insert({
            organization_id: context.organizationId,
            part_id: source.part_id,
            part_code: source.part_code,
            part_name: source.part_name,
            bin_id: toBinId,
            quantity_on_hand: quantity,
            quantity_reserved: 0,
            reorder_level: source.reorder_level,
            reorder_quantity: source.reorder_quantity,
            unit_cost: source.unit_cost,
            last_counted_date: source.last_counted_date,
            expiry_date: source.expiry_date,
            batch_number: source.batch_number,
            supplier_lot: source.supplier_lot,
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }
    }

    return NextResponse.json({
      success: true,
      transfer: {
        stockId,
        fromBinId: source.bin_id,
        toBinId,
        quantity,
        reason,
        movedBy: context.userName || context.userEmail || context.userId,
        movedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo transferir el stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
