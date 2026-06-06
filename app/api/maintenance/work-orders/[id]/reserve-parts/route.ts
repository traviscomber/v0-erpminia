import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workOrderId } = await params;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const { partId, quantity } = body;

    if (!partId || !quantity) {
      return NextResponse.json(
        { error: 'partId and quantity required' },
        { status: 400 }
      );
    }

    // Check current stock
    const { data: stock, error: stockError } = await context.supabase
      .from('warehouse_stock')
      .select('id, quantity_on_hand, quantity_available')
      .eq('id', partId)
      .eq('organization_id', context.organizationId)
      .single();

    if (stockError || !stock) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }

    if (stock.quantity_available < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${stock.quantity_available}` },
        { status: 400 }
      );
    }

    // Insert order_wear_parts record (links OT to parts)
    const { data: reservation, error: reserveError } = await context.supabase
      .from('order_wear_parts')
      .insert({
        organization_id: context.organizationId,
        maintenance_order_id: workOrderId,
        part_id: partId,
        quantity: quantity,
        status: 'reserved',
        created_by: context.userId,
      })
      .select()
      .single();

    if (reserveError) throw reserveError;

    // Create movement log
    await context.supabase
      .from('stock_movements')
      .insert({
        organization_id: context.organizationId,
        warehouse_stock_id: partId,
        movement_type: 'reservation',
        quantity: -quantity,
        reference_id: workOrderId,
        reference_type: 'maintenance_work_order',
        notes: `Reserved for work order`,
        created_by: context.userId,
      });

    return NextResponse.json({ data: reservation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reserve parts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workOrderId } = await params;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('order_wear_parts')
      .select(
        '*, part:warehouse_stock(id, part_code, part_name, unit_cost, quantity_on_hand)'
      )
      .eq('maintenance_order_id', workOrderId)
      .eq('organization_id', context.organizationId);

    if (error) throw error;

    return NextResponse.json({ reservedParts: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reserved parts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reservationId } = await params;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    // Get reservation to get quantity for reversal
    const { data: reservation, error: fetchError } = await context.supabase
      .from('order_wear_parts')
      .select()
      .eq('id', reservationId)
      .eq('organization_id', context.organizationId)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Delete reservation
    const { error: deleteError } = await context.supabase
      .from('order_wear_parts')
      .delete()
      .eq('id', reservationId);

    if (deleteError) throw deleteError;

    // Reverse movement log
    await context.supabase
      .from('stock_movements')
      .insert({
        organization_id: context.organizationId,
        warehouse_stock_id: reservation.part_id,
        movement_type: 'reservation_cancel',
        quantity: reservation.quantity,
        reference_id: reservation.maintenance_order_id,
        reference_type: 'maintenance_work_order',
        notes: `Cancelled reservation`,
        created_by: context.userId,
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel reservation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
