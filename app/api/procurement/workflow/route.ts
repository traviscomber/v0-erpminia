export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const resource = request.nextUrl.searchParams.get('resource');
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';

  try {
    if (resource === 'products') {
      let query = context.supabase
        .from('canonical_products_v1')
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
      let query = context.supabase
        .from('canonical_suppliers_v1')
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
      context.supabase.from('canonical_procurement_requests_v1').select('*').eq('organization_id', context.organizationId).order('created_at', { ascending: false }).limit(100),
      context.supabase.from('canonical_procurement_request_lines_v1').select('*').eq('organization_id', context.organizationId).order('created_at'),
      context.supabase.from('canonical_supplier_quotations_v1').select('*').eq('organization_id', context.organizationId).order('created_at', { ascending: false }).limit(200),
      context.supabase.from('canonical_supplier_quotation_lines_v1').select('*').eq('organization_id', context.organizationId).order('created_at'),
      context.supabase.from('canonical_purchase_orders_v1').select('id, order_number, order_date, supplier_name, total_amount, currency, operational_status, status, procurement_request_id, awarded_quotation_id, canonical_supplier_id, expected_delivery_date, created_at').eq('organization_id', context.organizationId).not('procurement_request_id', 'is', null).order('created_at', { ascending: false }).limit(100),
      context.supabase.from('canonical_purchase_order_lines_v1').select('id, purchase_order_id, order_number, line_number, product_code, description, quantity, quantity_received, unit, unit_cost, net_amount, canonical_product_id').eq('organization_id', context.organizationId).not('procurement_request_line_id', 'is', null).order('line_number'),
      context.supabase.from('canonical_goods_receipts_v1').select('*').eq('organization_id', context.organizationId).order('received_at', { ascending: false }).limit(100),
      context.supabase.from('canonical_procurement_events_v1').select('*').eq('organization_id', context.organizationId).order('event_at', { ascending: false }).limit(200),
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
    console.error('[procurement/workflow:get]', error);
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
      const lines = Array.isArray(body.lines) ? body.lines : [];
      if (!body.purchaseOrderId || lines.length === 0) {
        return NextResponse.json({ error: 'Selecciona una orden e ingresa al menos una cantidad recibida.' }, { status: 400 });
      }

      for (const line of lines) {
        const received = Number(line.quantity_received || 0);
        const accepted = Number(line.quantity_accepted || 0);
        const rejected = Number(line.quantity_rejected || 0);
        if (!Number.isFinite(received) || received <= 0) {
          return NextResponse.json({ error: 'Cada cantidad recibida debe ser mayor que cero.' }, { status: 400 });
        }
        if (![accepted, rejected].every((value) => Number.isFinite(value) && value >= 0)) {
          return NextResponse.json({ error: 'Las cantidades aceptadas y rechazadas deben ser válidas.' }, { status: 400 });
        }
        if (Math.abs(accepted + rejected - received) > 0.0001) {
          return NextResponse.json({ error: 'La cantidad aceptada más la rechazada debe coincidir con lo recibido.' }, { status: 400 });
        }
      }

      result = await context.supabase.rpc('receive_purchase_order', {
        p_purchase_order_id: body.purchaseOrderId,
        p_lines: lines,
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
    console.error('[procurement/workflow:post]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
