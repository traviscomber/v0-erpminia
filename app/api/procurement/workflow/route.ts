export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const resource = request.nextUrl.searchParams.get('resource');
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  const canonical = context.supabase.schema('canonical');

  try {
    if (resource === 'products') {
      let query = canonical
        .from('products')
        .select('id, product_code, name, unit, standard_cost, family')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .eq('is_purchasable', true)
        .order('name')
        .limit(30);
      if (q) query = query.or(`product_code.ilike.%${q}%,name.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ products: data || [] });
    }

    if (resource === 'suppliers') {
      let query = canonical
        .from('suppliers')
        .select('id, tax_id, legal_name, trade_name, payment_terms')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true)
        .order('legal_name')
        .limit(30);
      if (q) query = query.or(`tax_id.ilike.%${q}%,legal_name.ilike.%${q}%,trade_name.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ suppliers: data || [] });
    }

    const [requestsResult, requestLinesResult, quotationsResult, quotationLinesResult, ordersResult, orderLinesResult, receiptsResult, eventsResult] = await Promise.all([
      canonical.from('procurement_requests').select('*').eq('organization_id', context.organizationId).order('created_at', { ascending: false }).limit(100),
      canonical.from('procurement_request_lines').select('*').eq('organization_id', context.organizationId).order('created_at'),
      canonical.from('supplier_quotations').select('*').eq('organization_id', context.organizationId).order('created_at', { ascending: false }).limit(200),
      canonical.from('supplier_quotation_lines').select('*').eq('organization_id', context.organizationId).order('created_at'),
      canonical.from('purchase_orders').select('id, order_number, order_date, supplier_name, total_amount, currency, operational_status, status, procurement_request_id, awarded_quotation_id, canonical_supplier_id, expected_delivery_date, created_at').eq('organization_id', context.organizationId).not('procurement_request_id', 'is', null).order('created_at', { ascending: false }).limit(100),
      canonical.from('purchase_order_lines').select('id, purchase_order_id, order_number, line_number, product_code, description, quantity, quantity_received, unit, unit_cost, net_amount, canonical_product_id').eq('organization_id', context.organizationId).not('procurement_request_line_id', 'is', null).order('line_number'),
      canonical.from('goods_receipts').select('*').eq('organization_id', context.organizationId).order('received_at', { ascending: false }).limit(100),
      canonical.from('procurement_events').select('*').eq('organization_id', context.organizationId).order('event_at', { ascending: false }).limit(200),
    ]);

    const firstError = [requestsResult, requestLinesResult, quotationsResult, quotationLinesResult, ordersResult, orderLinesResult, receiptsResult, eventsResult].find((result) => result.error)?.error;
    if (firstError) throw firstError;

    return NextResponse.json({
      requests: requestsResult.data || [],
      requestLines: requestLinesResult.data || [],
      quotations: quotationsResult.data || [],
      quotationLines: quotationLinesResult.data || [],
      purchaseOrders: ordersResult.data || [],
      purchaseOrderLines: orderLinesResult.data || [],
      receipts: receiptsResult.data || [],
      events: eventsResult.data || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el flujo de abastecimiento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const action = String(body.action || '');
    let result;

    if (action === 'create_request') {
      result = await context.supabase.rpc('create_procurement_request', {
        p_payload: { ...(body.payload || {}), organization_id: context.organizationId },
        p_actor_id: context.userId,
        p_actor_name: body.actorName || null,
      });
    } else if (action === 'create_quotation') {
      result = await context.supabase.rpc('create_supplier_quotation', {
        p_payload: { ...(body.payload || {}), organization_id: context.organizationId },
        p_actor_id: context.userId,
      });
    } else if (action === 'award_quotation') {
      result = await context.supabase.rpc('award_supplier_quotation', {
        p_quotation_id: body.quotationId,
        p_actor_id: context.userId,
      });
    } else if (action === 'receive_purchase_order') {
      result = await context.supabase.rpc('receive_purchase_order', {
        p_purchase_order_id: body.purchaseOrderId,
        p_lines: body.lines || [],
        p_warehouse_code: body.warehouseCode || null,
        p_received_by: context.userId,
        p_received_by_name: body.receivedByName || null,
        p_notes: body.notes || null,
      });
    } else {
      return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
    }

    if (result.error) throw result.error;
    return NextResponse.json({ id: result.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar la operación';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
