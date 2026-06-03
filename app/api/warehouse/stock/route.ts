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
    const rack = racksById.get(bin.rack_id);
    const zone = rack ? zonesById.get(rack.zone_id) : null;

    return {
      ...bin,
      rack_code: rack?.rack_code || null,
      rack_name: rack?.rack_name || null,
      zone_code: zone?.zone_code || null,
      zone_name: zone?.zone_name || null,
      label:
        bin.bin_location ||
        [zone?.zone_code, rack?.rack_code, bin.bin_code].filter(Boolean).join('-'),
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

    return NextResponse.json({
      stock: rows,
      bins,
      summary: {
        totalItems: rows.length,
        totalQuantity: rows.reduce((sum: number, item: any) => sum + item.quantity_on_hand, 0),
        totalValue: rows.reduce(
          (sum: number, item: any) => sum + item.quantity_on_hand * item.unit_cost,
          0
        ),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch warehouse stock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
