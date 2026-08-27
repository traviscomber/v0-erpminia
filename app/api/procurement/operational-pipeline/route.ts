export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type JsonObject = Record<string, unknown>;

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: pipeline, error: pipelineError } = await context.supabase
      .from('operational_procurement_pipeline')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('required_date', { ascending: true, nullsFirst: false });
    if (pipelineError) {
      console.error('[procurement/operational-pipeline:view]', pipelineError);
      return NextResponse.json({ pipeline: [], requestLines: [], orderLines: [], invoiceMatchSummary: [], invoiceMatchLines: [], unavailable: true });
    }

    const requestIds = (pipeline || []).map((row) => row.intake_request_id).filter(Boolean);
    const orderIds = (pipeline || []).map((row) => row.order_id).filter(Boolean);
    const workOrderIds = (pipeline || []).map((row) => row.work_order_id).filter(Boolean);
    const [
      { data: requestLines, error: requestLinesError },
      { data: orderLines, error: orderLinesError },
      { data: workOrders, error: workOrdersError },
      { data: invoiceMatchSummary, error: invoiceSummaryError },
      { data: invoiceMatchLines, error: invoiceLinesError },
    ] = await Promise.all([
      requestIds.length ? context.supabase.from('procurement_intake_request_lines').select('*').in('intake_request_id', requestIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? context.supabase.from('procurement_operational_order_lines').select('*').in('order_id', orderIds) : Promise.resolve({ data: [], error: null }),
      workOrderIds.length ? context.supabase.from('maintenance_work_orders').select('id,cost_center_id').in('id', workOrderIds).eq('organization_id', context.organizationId) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? context.supabase.schema('intelligence').from('procurement_three_way_match_summary_v1').select('*').eq('organization_id', context.organizationId).in('order_id', orderIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? context.supabase.schema('intelligence').from('procurement_three_way_match_lines_v1').select('*').eq('organization_id', context.organizationId).in('order_id', orderIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (requestLinesError) throw requestLinesError;
    if (orderLinesError) throw orderLinesError;
    if (workOrdersError) throw workOrdersError;
    if (invoiceSummaryError) throw invoiceSummaryError;
    if (invoiceLinesError) throw invoiceLinesError;

    const costCenterIds = (workOrders || []).map((row) => row.cost_center_id).filter(Boolean);
    const { data: costCenters, error: costCentersError } = costCenterIds.length
      ? await context.supabase.from('cost_centers').select('id,code,name,status').in('id', costCenterIds).eq('organization_id', context.organizationId)
      : { data: [], error: null };
    if (costCentersError) throw costCentersError;

    const workOrderById = new Map((workOrders || []).map((row) => [row.id, row]));
    const costCenterById = new Map((costCenters || []).map((row) => [row.id, row]));
    const pipelineWithFinance = (pipeline || []).map((row) => {
      const workOrder = row.work_order_id ? workOrderById.get(row.work_order_id) : null;
      const costCenter = workOrder?.cost_center_id ? costCenterById.get(workOrder.cost_center_id) : null;
      const ready = !row.work_order_id || Boolean(costCenter && !['inactive', 'disabled', 'closed'].includes(String(costCenter.status || 'active')));
      return {
        ...row,
        finance_ready: ready,
        finance_blocker: ready ? null : 'Asigne un centro de costo válido a la OT antes de adjudicar',
        cost_center_id: costCenter?.id || null,
        cost_center_code: costCenter?.code || null,
        cost_center_name: costCenter?.name || null,
      };
    });

    return NextResponse.json({
      pipeline: pipelineWithFinance,
      requestLines: requestLines || [],
      orderLines: orderLines || [],
      invoiceMatchSummary: invoiceMatchSummary || [],
      invoiceMatchLines: invoiceMatchLines || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'No se pudo cargar el pipeline operativo';
    console.error('[procurement/operational-pipeline]', error);
    return NextResponse.json({ pipeline: [], requestLines: [], orderLines: [], invoiceMatchSummary: [], invoiceMatchLines: [], error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = (await request.json()) as JsonObject;
    const action = String(body.action || '');
    if (action === 'create_quotation') {
      const { data, error } = await context.supabase.rpc('create_intake_quotation', { p_intake_request_id: body.intakeRequestId, p_supplier_id: body.supplierId, p_lead_time_days: body.leadTimeDays ?? null, p_payment_terms: body.paymentTerms ?? null, p_valid_until: body.validUntil ?? null, p_lines: body.lines });
      if (error) throw error;
      return NextResponse.json({ quotationId: data });
    }
    if (action === 'award_quotation') {
      const { data, error } = await context.supabase.rpc('award_intake_quotation', { p_quotation_id: body.quotationId });
      if (error) throw error;
      return NextResponse.json({ orderId: data });
    }
    if (action === 'receive_order') {
      const { data, error } = await context.supabase.rpc('receive_operational_order', { p_order_id: body.orderId, p_lines: body.lines, p_notes: body.notes ?? null });
      if (error) throw error;
      return NextResponse.json({ receiptId: data });
    }
    if (action === 'create_supplier_invoice') {
      const { data, error } = await context.supabase.rpc('create_supplier_invoice_v1', {
        p_order_id: body.orderId,
        p_invoice_number: body.invoiceNumber,
        p_invoice_date: body.invoiceDate,
        p_net_amount: body.netAmount,
        p_tax_amount: body.taxAmount,
        p_total_amount: body.totalAmount,
        p_lines: body.lines,
        p_document_url: body.documentUrl ?? null,
      });
      if (error) throw error;
      const { data: matchStatus, error: matchError } = await context.supabase.rpc('refresh_supplier_invoice_match_v1', { p_invoice_id: data });
      if (matchError) throw matchError;
      return NextResponse.json({ invoiceId: data, matchStatus });
    }
    if (action === 'refresh_supplier_invoice_match') {
      const { data, error } = await context.supabase.rpc('refresh_supplier_invoice_match_v1', { p_invoice_id: body.invoiceId });
      if (error) throw error;
      return NextResponse.json({ matchStatus: data });
    }
    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'No se pudo completar la operación';
    const status = message.startsWith('Imputación contable') || message.includes('inválida') || message.includes('requerid') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
