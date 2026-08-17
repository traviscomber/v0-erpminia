export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type JsonObject = Record<string, unknown>;

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: pipeline, error: pipelineError } = await context.supabase
      .from('operational_procurement_pipeline')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('required_date', { ascending: true, nullsFirst: false });
    if (pipelineError) throw pipelineError;

    const requestIds = (pipeline || []).map((row) => row.intake_request_id).filter(Boolean);
    const orderIds = (pipeline || []).map((row) => row.order_id).filter(Boolean);
    const [{ data: requestLines, error: requestLinesError }, { data: orderLines, error: orderLinesError }] = await Promise.all([
      requestIds.length ? context.supabase.from('procurement_intake_request_lines').select('*').in('intake_request_id', requestIds) : Promise.resolve({ data: [], error: null }),
      orderIds.length ? context.supabase.from('procurement_operational_order_lines').select('*').in('order_id', orderIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (requestLinesError) throw requestLinesError;
    if (orderLinesError) throw orderLinesError;
    return NextResponse.json({ pipeline: pipeline || [], requestLines: requestLines || [], orderLines: orderLines || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el pipeline operativo';
    console.error('[procurement/operational-pipeline]', error);
    return NextResponse.json({ pipeline: [], requestLines: [], orderLines: [], error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo completar la operación';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
