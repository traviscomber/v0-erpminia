export const dynamic = 'force-dynamic';

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
      return NextResponse.json({ error: 'partId y quantity son obligatorios' }, { status: 400 });
    }

    const { data: stock, error: stockError } = await context.supabase
      .from('warehouse_stock')
      .select('id, quantity_on_hand, quantity_reserved, quantity_available, part_code, part_name')
      .eq('id', partId)
      .eq('organization_id', context.organizationId)
      .single();

    if (stockError || !stock) {
      return NextResponse.json({ error: 'No se encontró la pieza' }, { status: 404 });
    }

    const available = stock.quantity_available ?? Math.max(0, (stock.quantity_on_hand || 0) - (stock.quantity_reserved || 0));
    if (available < quantity) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${available}` },
        { status: 400 }
      );
    }

    const { data: updatedStock, error: updateError } = await context.supabase
      .from('warehouse_stock')
      .update({
        quantity_reserved: (stock.quantity_reserved || 0) + quantity,
      })
      .eq('id', partId)
      .eq('organization_id', context.organizationId)
      .select()
      .single();

    if (updateError) throw updateError;

    const { data: reservation, error: reserveError } = await context.supabase
      .from('order_wear_parts')
      .insert({
        organization_id: context.organizationId,
        maintenance_order_id: workOrderId,
        part_id: partId,
        quantity,
        status: 'reserved',
        created_by: context.userId,
      })
      .select()
      .single();

    if (reserveError) throw reserveError;

    await context.supabase.from('stock_movements').insert({
      organization_id: context.organizationId,
      warehouse_stock_id: partId,
      movement_type: 'reservation',
      quantity: -quantity,
      reference_id: workOrderId,
      reference_type: 'maintenance_work_order',
      notes: `Reservado para orden de trabajo`,
      created_by: context.userId,
    });

    return NextResponse.json({ data: reservation, stock: updatedStock }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron reservar las piezas';
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
    const [{ data, error }, { data: movements, error: movementError }] = await Promise.all([
      context.supabase
      .from('order_wear_parts')
      .select('*, part:warehouse_stock(id, part_code, part_name, unit_cost, quantity_on_hand, quantity_reserved)')
      .eq('maintenance_order_id', workOrderId)
      .eq('organization_id', context.organizationId),
      context.supabase
        .from('stock_movements')
        .select('id, movement_type, quantity, notes, created_at, stock:warehouse_stock(id, part_code, part_name)')
        .eq('organization_id', context.organizationId)
        .eq('reference_id', workOrderId)
        .eq('reference_type', 'maintenance_work_order')
        .order('created_at', { ascending: false }),
    ]);

    if (error) throw error;
    if (movementError) throw movementError;

    return NextResponse.json({ reservedParts: data || [], movements: movements || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las piezas reservadas';
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
    const { data: reservation, error: fetchError } = await context.supabase
      .from('order_wear_parts')
      .select('id, maintenance_order_id, part_id, quantity, part:warehouse_stock(quantity_reserved)')
      .eq('id', reservationId)
      .eq('organization_id', context.organizationId)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'No se encontró la reserva' }, { status: 404 });
    }

    const { error: deleteError } = await context.supabase
      .from('order_wear_parts')
      .delete()
      .eq('id', reservationId);

    if (deleteError) throw deleteError;

    await context.supabase
      .from('warehouse_stock')
      .update({
        quantity_reserved: Math.max(
          0,
          (((reservation.part as Array<{ quantity_reserved?: number }> | undefined)?.[0]?.quantity_reserved) || 0) -
            (reservation.quantity || 0),
        ),
      })
      .eq('id', reservation.part_id)
      .eq('organization_id', context.organizationId);

    await context.supabase.from('stock_movements').insert({
      organization_id: context.organizationId,
      warehouse_stock_id: reservation.part_id,
      movement_type: 'reservation_cancel',
      quantity: reservation.quantity,
      reference_id: reservation.maintenance_order_id,
      reference_type: 'maintenance_work_order',
      notes: `Reserva cancelada`,
      created_by: context.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cancelar la reserva';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
