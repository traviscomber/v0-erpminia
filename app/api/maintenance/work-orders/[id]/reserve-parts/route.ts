export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type IssuePartPayload = {
  partId?: string;
  quantity?: number | string;
  notes?: string | null;
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workOrderId } = await params;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = (await request.json()) as IssuePartPayload;
    const quantity = Number(body.quantity || 0);
    if (!body.partId || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Selecciona un repuesto y una cantidad entera mayor que cero' }, { status: 400 });
    }

    const { data, error } = await context.supabase.rpc('issue_work_order_part', {
      p_work_order_id: workOrderId,
      p_warehouse_stock_id: body.partId,
      p_quantity: quantity,
      p_notes: body.notes || null,
    });

    if (error) throw error;
    return NextResponse.json({ data: { id: data }, issued: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo entregar el repuesto';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: workOrderId } = await params;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [{ data: parts, error: partsError }, { data: movements, error: movementError }] = await Promise.all([
      context.supabase
        .from('work_order_parts')
        .select('id, canonical_product_id, warehouse_stock_id, quantity_requested, quantity_reserved, quantity_issued, quantity_installed, quantity_returned, unit_cost, total_cost, status, notes, created_at')
        .eq('organization_id', context.organizationId)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false }),
      context.supabase
        .from('stock_movements')
        .select('id, stock_id, movement_type, quantity, unit_cost, total_cost, notes, created_at')
        .eq('organization_id', context.organizationId)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false }),
    ]);

    if (partsError) throw partsError;
    if (movementError) throw movementError;

    const productIds = [...new Set((parts || []).map((row) => row.canonical_product_id).filter(Boolean))];
    const stockIds = [...new Set([
      ...(parts || []).map((row) => row.warehouse_stock_id),
      ...(movements || []).map((row) => row.stock_id),
    ].filter(Boolean))];

    const [{ data: products }, { data: stock }] = await Promise.all([
      productIds.length
        ? context.supabase.schema('canonical').from('products').select('id, product_code, name, unit').in('id', productIds)
        : Promise.resolve({ data: [] }),
      stockIds.length
        ? context.supabase.from('warehouse_stock').select('id, part_code, part_name, quantity_on_hand, quantity_available, unit_cost').in('id', stockIds)
        : Promise.resolve({ data: [] }),
    ]);

    const productMap = new Map((products || []).map((item) => [item.id, item]));
    const stockMap = new Map((stock || []).map((item) => [item.id, item]));

    return NextResponse.json({
      reservedParts: (parts || []).map((row) => ({
        ...row,
        quantity: row.quantity_issued,
        part: productMap.get(row.canonical_product_id) || stockMap.get(row.warehouse_stock_id) || null,
      })),
      movements: (movements || []).map((row) => ({
        ...row,
        stock: stockMap.get(row.stock_id) || null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la trazabilidad de repuestos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
