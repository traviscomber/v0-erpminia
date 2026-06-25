export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

function normalizeOrder(row: any) {
  return {
    id: row.id,
    po_number: row.po_number || row.purchase_order_number || row.number || row.code || row.id,
    vendor_name: row.vendor_name || row.vendor || row.supplier_name || row.supplier || 'Proveedor',
    item_code: row.item_code || row.reference || row.description || '',
    status: row.status || 'draft',
    total_amount: Number(row.total_amount || row.amount || row.cost || 0),
    delivery_date: row.delivery_date || row.expected_delivery_date || row.created_at || '',
    quantity: Number(row.quantity || row.qty || 0),
    unit_price: Number(row.unit_price || row.price || 0),
    created_at: row.created_at,
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const status = searchParams.get('status') || '';

    const validPageSize = Math.min(Math.max(pageSize, 10), 500);
    const validPage = Math.max(page, 0);
    const offset = validPage * validPageSize;

    let query = context.supabase
      .from('purchase_orders')
      .select('*', { count: 'exact' })
      .eq('organization_id', context.organizationId);

    if (search) {
      query = query.or(`po_number.ilike.%${search}%,vendor_name.ilike.%${search}%,item_code.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('delivery_date', { ascending: false })
      .range(offset, offset + validPageSize - 1);

    if (error) throw error;

    return NextResponse.json({
      orders: (data || []).map(normalizeOrder),
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / validPageSize),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las ordenes de compra';
    return NextResponse.json({ error: message, orders: [], pagination: { page: 0, pageSize: 50, total: 0, totalPages: 0 } }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const vendor_name = String(body.vendor_name || body.vendor || '').trim();
    const item_code = String(body.item_code || body.item || '').trim();
    const quantity = Number(body.quantity || 0);
    const unit_price = Number(body.unit_price || body.price || 0);
    const delivery_date = String(body.delivery_date || '').trim() || null;

    if (!vendor_name || !item_code || quantity <= 0 || unit_price <= 0 || !delivery_date) {
      return NextResponse.json(
        { error: 'vendor_name, item_code, quantity, unit_price y delivery_date son requeridos' },
        { status: 400 }
      );
    }

    const total_amount = quantity * unit_price;
    const { count } = await context.supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId);
    const po_number = `PO-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data, error } = await context.supabase
      .from('purchase_orders')
      .insert({
        organization_id: context.organizationId,
        po_number,
        vendor_name,
        item_code,
        quantity,
        unit_price,
        total_amount,
        delivery_date,
        status: 'draft',
        created_by: context.userId,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data: normalizeOrder(data) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear la orden de compra';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
