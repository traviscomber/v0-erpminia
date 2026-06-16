export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

async function getOrganizationBins(supabase: any, organizationId: string) {
  const { data: zones, error: zonesError } = await supabase
    .from('warehouse_zones')
    .select('id')
    .eq('organization_id', organizationId);

  if (zonesError) throw zonesError;

  const zoneIds = (zones || []).map((zone: any) => zone.id);
  if (zoneIds.length === 0) return [];

  const { data: racks, error: racksError } = await supabase
    .from('warehouse_racks')
    .select('id')
    .in('zone_id', zoneIds);

  if (racksError) throw racksError;

  const rackIds = (racks || []).map((rack: any) => rack.id);
  if (rackIds.length === 0) return [];

  const { data: bins, error: binsError } = await supabase
    .from('warehouse_bins')
    .select('id')
    .in('rack_id', rackIds);

  if (binsError) throw binsError;
  return (bins || []).map((bin: any) => bin.id);
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const stockId = body.stockId || body.stock_id;
    const toBinId = body.toBinId || body.to_bin_id;
    const quantity = Number(body.quantity || 0);
    const reason = String(body.reason || '').trim() || null;

    if (!stockId || !toBinId || quantity <= 0) {
      return NextResponse.json(
        { error: 'stockId, toBinId and a positive quantity are required' },
        { status: 400 }
      );
    }

    const validBinIds = await getOrganizationBins(context.supabase, context.organizationId);
    if (!validBinIds.includes(toBinId)) {
      return NextResponse.json({ error: 'Destination bin not found' }, { status: 404 });
    }

    const { data: sourceStock, error: sourceError } = await context.supabase
      .from('warehouse_stock')
      .select('*')
      .eq('id', stockId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!sourceStock) {
      return NextResponse.json({ error: 'Source stock not found' }, { status: 404 });
    }

    if (sourceStock.bin_id === toBinId) {
      return NextResponse.json(
        { error: 'Destination bin must be different from source bin' },
        { status: 400 }
      );
    }

    if (quantity > Number(sourceStock.quantity_available || sourceStock.quantity_on_hand || 0)) {
      return NextResponse.json({ error: 'Insufficient available stock' }, { status: 400 });
    }

    const movingAll = quantity === Number(sourceStock.quantity_on_hand || 0);

    let destinationStock = null;
    if (!movingAll) {
      const { data: existingDest, error: destError } = await context.supabase
        .from('warehouse_stock')
        .select('*')
        .eq('organization_id', context.organizationId)
        .eq('bin_id', toBinId)
        .eq('part_code', sourceStock.part_code)
        .is('batch_number', sourceStock.batch_number || null)
        .maybeSingle();

      if (destError) throw destError;
      destinationStock = existingDest;
    }

    if (movingAll) {
      const { error: moveError } = await context.supabase
        .from('warehouse_stock')
        .update({
          bin_id: toBinId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sourceStock.id);

      if (moveError) throw moveError;
    } else {
      const sourceNewQuantity = Number(sourceStock.quantity_on_hand || 0) - quantity;

      const { error: sourceUpdateError } = await context.supabase
        .from('warehouse_stock')
        .update({
          quantity_on_hand: sourceNewQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sourceStock.id);

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
            part_id: sourceStock.part_id,
            part_code: sourceStock.part_code,
            part_name: sourceStock.part_name,
            bin_id: toBinId,
            quantity_on_hand: quantity,
            quantity_reserved: 0,
            reorder_level: sourceStock.reorder_level,
            reorder_quantity: sourceStock.reorder_quantity,
            unit_cost: sourceStock.unit_cost,
            last_counted_date: sourceStock.last_counted_date,
            expiry_date: sourceStock.expiry_date,
            batch_number: sourceStock.batch_number,
            supplier_lot: sourceStock.supplier_lot,
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }
    }

    return NextResponse.json({
      success: true,
      transfer: {
        stockId,
        fromBinId: sourceStock.bin_id,
        toBinId,
        quantity,
        reason,
        movedBy: context.userName || context.userEmail || context.userId,
        movedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to transfer stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
