import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function generatePoNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO-${year}-${random}`;
}

function normalizePurchaseOrder(row: any) {
  return {
    ...row,
    po_number: row.po_number || row.purchase_order_number || row.order_number || row.id,
    vendor_name: row.vendor_name || row.vendor || row.supplier || '',
    item_code: row.item_code || row.description || row.item || '',
    quantity: toNumber(row.quantity || row.qty || row.units || 0),
    total_amount: toNumber(row.total_amount || row.amount || row.cost || 0),
    delivery_date: row.delivery_date || row.deliveryDate || row.expected_delivery_date || '',
    status: row.status || 'draft',
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');

    let query = context.supabase
      .from('purchase_orders')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const purchaseOrders = (data || []).map(normalizePurchaseOrder);

    return NextResponse.json({
      purchase_orders: purchaseOrders,
      total: purchaseOrders.length,
      pending: purchaseOrders.filter((order: any) => order.status === 'pending').length,
      received: purchaseOrders.filter((order: any) => order.status === 'received').length,
      totalValue: purchaseOrders.reduce((sum: number, order: any) => sum + toNumber(order.total_amount), 0),
      suppliers: [...new Set(purchaseOrders.map((order: any) => order.vendor_name).filter(Boolean))],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las órdenes de compra';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const vendorName = String(body.vendor_name || body.vendor || '').trim();
    const itemCode = String(body.item_code || body.description || '').trim();
    const quantity = Math.max(1, Math.round(toNumber(body.quantity || body.qty || 1)));
    const unitPrice = toNumber(body.unit_price || body.unitPrice || body.amount || 0);
    const deliveryDate = String(body.delivery_date || body.deliveryDate || '').trim();

    if (!vendorName || !itemCode || !deliveryDate) {
      return NextResponse.json(
        { error: 'vendor_name, item_code y delivery_date son obligatorios' },
        { status: 400 }
      );
    }

    const totalAmount = quantity * unitPrice;
    const poNumber = generatePoNumber();

    const insertPayload: Record<string, any> = {
      organization_id: context.organizationId,
      po_number: poNumber,
      vendor: vendorName,
      amount: totalAmount,
      status: 'draft',
      created_by: context.userId,
    };

    const { data, error } = await context.supabase
      .from('purchase_orders')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      data: {
        ...normalizePurchaseOrder(data),
        item_code: itemCode,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        delivery_date: deliveryDate,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la orden de compra';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
