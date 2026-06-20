export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

async function getOrganizationBins(supabase: any, organizationId: string) {
  const { data: zones, error: zonesError } = await supabase
    .from('warehouse_zones')
    .select('id, zone_code, zone_name')
    .eq('organization_id', organizationId)
    .order('zone_code', { ascending: true });

  if (zonesError) throw zonesError;

  const zoneIds = (zones || []).map((zone: any) => zone.id);
  if (zoneIds.length === 0) return [];

  const { data: racks, error: racksError } = await supabase
    .from('warehouse_racks')
    .select('id, zone_id, rack_code, rack_name')
    .in('zone_id', zoneIds)
    .order('rack_code', { ascending: true });

  if (racksError) throw racksError;

  const rackIds = (racks || []).map((rack: any) => rack.id);
  if (rackIds.length === 0) return [];

  const { data: bins, error: binsError } = await supabase
    .from('warehouse_bins')
    .select('id, rack_id, bin_code, bin_location, current_stock, capacity_units')
    .in('rack_id', rackIds)
    .order('bin_location', { ascending: true });

  if (binsError) throw binsError;

  const zonesById = new Map((zones || []).map((zone: any) => [zone.id, zone]));
  const racksById = new Map((racks || []).map((rack: any) => [rack.id, rack]));

  return (bins || []).map((bin: any) => {
    const rack = racksById.get(bin.rack_id) as any;
    const zone = (rack ? zonesById.get(rack.zone_id) : null) as any;

    return {
      ...bin,
      rack_code: rack.rack_code || null,
      rack_name: rack.rack_name || null,
      zone_code: zone.zone_code || null,
      zone_name: zone.zone_name || null,
      label:
        bin.bin_location ||
        [zone.zone_code, rack.rack_code, bin.bin_code].filter(Boolean).join('-'),
    };
  });
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const binId = searchParams.get('binId');
    const partCode = searchParams.get('partCode');

    let query = context.supabase
      .from('warehouse_stock')
      .select('*, bin:warehouse_bins(id, bin_code, bin_location)')
      .eq('organization_id', context.organizationId)
      .order('part_name', { ascending: true });

    if (binId) query = query.eq('bin_id', binId);
    if (partCode) query = query.ilike('part_code', `%${partCode}%`);

    const [{ data: stock, error: stockError }, bins] = await Promise.all([
      query,
      getOrganizationBins(context.supabase, context.organizationId),
    ]);

    if (stockError) throw stockError;

    const rows = (stock || []).map((item: any) => ({
      ...item,
      unit_cost: Number(item.unit_cost || 0),
      quantity_on_hand: Number(item.quantity_on_hand || 0),
      quantity_reserved: Number(item.quantity_reserved || 0),
      quantity_available: Number(item.quantity_available || 0),
      reorder_level: Number(item.reorder_level || 0),
      reorder_quantity: Number(item.reorder_quantity || 0),
    }));
    const stockRows = rows;

    const summary = {
      totalItems: stockRows.length,
      totalQuantity: stockRows.reduce((sum: number, item: any) => sum + item.quantity_on_hand, 0),
      totalValue: stockRows.reduce(
        (sum: number, item: any) => sum + item.quantity_on_hand * item.unit_cost,
        0
      ),
    };

    return NextResponse.json({
      stock: stockRows,
      bins,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo obtener el stock de bodega';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext(request);
    if (!context.ok) {
      return context.response;
    }

    const { organizationId, supabase } = context;
    const body = await request.json();
    const { part_code, part_name, quantity_on_hand, reorder_level, reorder_quantity, unit_cost } = body;

    // Obtener la primera ubicación para nuevos ítems
    const { data: bins } = await supabase
      .from('warehouse_bins')
      .select('id')
      .limit(1);

    const bin_id = bins?.[0]?.id || null;

    const { data: newItem, error } = await supabase
      .from('warehouse_stock')
      .insert({
        organization_id: organizationId,
        part_code,
        part_name,
        quantity_on_hand: quantity_on_hand || 0,
        reorder_level: reorder_level || 0,
        reorder_quantity: reorder_quantity || 0,
        unit_cost: unit_cost || 0,
        bin_id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo agregar el stock de bodega';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
