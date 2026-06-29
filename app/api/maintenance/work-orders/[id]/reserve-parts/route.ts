export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type WarehouseStockRow = {
  id: string;
  quantity_on_hand: number | string | null;
  quantity_reserved: number | string | null;
  quantity_available: number | string | null;
};

type OrderWearPartRow = {
  id: string;
  maintenance_order_id: string;
  part_id: string | null;
  quantity: number | string | null;
  part?: Array<{
    quantity_reserved?: number | string | null;
  }> | null;
};

type StockMovementRow = {
  id: string;
  movement_type: string | null;
  quantity: number | string | null;
  notes: string | null;
  created_at: string | null;
  stock?: Array<{
    id: string;
    part_code: string | null;
    part_name: string | null;
  }> | null;
};

type ReservePartsPayload = {
  partId?: string;
  quantity?: number | string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workOrderId } = await params;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = (await request.json()) as ReservePartsPayload;
    const partId = body.partId;
    const quantity = Number(body.quantity || 0);

    if (!partId || quantity <= 0) {
      return NextResponse.json({ error: 'partId y quantity son obligatorios' }, { status: 400 });
    }

    const { data: stock, error: stockError } = await context.supabase
      .from('warehouse_stock')
      .select('id, quantity_on_hand, quantity_reserved, quantity_available, part_code, part_name')
      .eq('id', partId)
      .eq('organization_id', context.organizationId)
      .single();

    const typedStock = stock as WarehouseStockRow | null;
    if (stockError || !typedStock) {
      return NextResponse.json({ error: 'No se encontró la pieza' }, { status: 404 });
    }

    const available = Number(
      typedStock.quantity_available ??
        Math.max(0, Number(typedStock.quantity_on_hand || 0) - Number(typedStock.quantity_reserved || 0))
    );
    if (available < quantity) {
      return NextResponse.json(
        { error: `Stock insuficiente. Disponible: ${available}` },
        { status: 400 }
      );
    }

    const { data: updatedStock, error: updateError } = await context.supabase
      .from('warehouse_stock')
      .update({
        quantity_reserved: Number(typedStock.quantity_reserved || 0) + quantity,
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

    const typedReservation = reservation as OrderWearPartRow | null;
    if (!typedReservation) {
      return NextResponse.json({ error: 'No se pudo crear la reserva' }, { status: 500 });
    }

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

    return NextResponse.json({ data: typedReservation, stock: updatedStock }, { status: 201 });
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

    return NextResponse.json({
      reservedParts: Array.isArray(data) ? (data as OrderWearPartRow[]) : [],
      movements: Array.isArray(movements) ? (movements as StockMovementRow[]) : [],
    });
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

    const typedReservation = reservation as OrderWearPartRow | null;
    if (fetchError || !typedReservation) {
      return NextResponse.json({ error: 'No se encontró la reserva' }, { status: 404 });
    }

    const { error: deleteError } = await context.supabase
      .from('order_wear_parts')
      .delete()
      .eq('id', reservationId);

    if (deleteError) throw deleteError;

    const reservedQuantity = Number(typedReservation.part?.[0]?.quantity_reserved ?? 0);
    const releasedQuantity = Number(typedReservation.quantity || 0);

    await context.supabase
      .from('warehouse_stock')
      .update({
        quantity_reserved: Math.max(0, reservedQuantity - releasedQuantity),
      })
      .eq('id', typedReservation.part_id)
      .eq('organization_id', context.organizationId);

    await context.supabase.from('stock_movements').insert({
      organization_id: context.organizationId,
      warehouse_stock_id: typedReservation.part_id,
      movement_type: 'reservation_cancel',
      quantity: typedReservation.quantity,
      reference_id: typedReservation.maintenance_order_id,
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
