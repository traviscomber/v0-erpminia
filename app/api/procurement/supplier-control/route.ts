export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const TOLERANCE = 0.01;

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const orderId = request.nextUrl.searchParams.get('orderId');

  try {
    let returnsQuery = context.supabase
      .from('procurement_supplier_returns')
      .select('*, procurement_supplier_return_lines(*)')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false })
      .limit(100);
    let invoicesQuery = context.supabase
      .from('procurement_supplier_invoices')
      .select('*, procurement_supplier_invoice_lines(*), procurement_match_exceptions(*)')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (orderId) {
      returnsQuery = returnsQuery.eq('order_id', orderId);
      invoicesQuery = invoicesQuery.eq('order_id', orderId);
    }

    const [returnsResult, invoicesResult, performanceResult] = await Promise.all([
      returnsQuery,
      invoicesQuery,
      context.supabase
        .schema('intelligence')
        .from('supplier_performance_v1')
        .select('*')
        .eq('organization_id', context.organizationId)
        .order('performance_score', { ascending: false })
        .limit(100),
    ]);

    const error = returnsResult.error || invoicesResult.error || performanceResult.error;
    if (error) throw error;

    return NextResponse.json({
      returns: returnsResult.data || [],
      invoices: invoicesResult.data || [],
      supplierPerformance: performanceResult.data || [],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el control de proveedores.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'create_return') {
      const lines = Array.isArray(body.lines) ? body.lines : [];
      if (!body.orderId || !body.supplierId || !body.reason || lines.length === 0) {
        return NextResponse.json({ error: 'Completa la orden, el proveedor, el motivo y al menos un producto.' }, { status: 400 });
      }

      const returnNumber = `DEV-${Date.now()}`;
      const { data: createdReturn, error: returnError } = await context.supabase
        .from('procurement_supplier_returns')
        .insert({
          organization_id: context.organizationId,
          return_number: returnNumber,
          order_id: body.orderId,
          receipt_id: body.receiptId || null,
          supplier_id: body.supplierId,
          reason: String(body.reason).trim(),
          resolution_type: body.resolutionType || 'pending',
          status: 'draft',
          evidence_url: body.evidenceUrl || null,
          requested_by: context.userId,
          notes: body.notes || null,
        })
        .select('id, return_number')
        .single();
      if (returnError) throw returnError;

      const normalizedLines = lines.map((line: Record<string, unknown>) => ({
        organization_id: context.organizationId,
        return_id: createdReturn.id,
        receipt_line_id: line.receiptLineId,
        order_line_id: line.orderLineId,
        canonical_product_id: line.canonicalProductId,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unitCost || 0),
      }));
      if (normalizedLines.some((line: { quantity: number }) => !Number.isFinite(line.quantity) || line.quantity <= 0)) {
        return NextResponse.json({ error: 'Las cantidades devueltas deben ser mayores que cero.' }, { status: 400 });
      }
      const { error: linesError } = await context.supabase.from('procurement_supplier_return_lines').insert(normalizedLines);
      if (linesError) throw linesError;

      return NextResponse.json({ id: createdReturn.id, returnNumber: createdReturn.return_number }, { status: 201 });
    }

    if (action === 'create_invoice') {
      const lines = Array.isArray(body.lines) ? body.lines : [];
      if (!body.orderId || !body.supplierId || !body.invoiceNumber || !body.invoiceDate || lines.length === 0) {
        return NextResponse.json({ error: 'Completa la factura y agrega al menos un producto.' }, { status: 400 });
      }

      const { data: orderLines, error: orderLinesError } = await context.supabase
        .from('procurement_operational_order_lines')
        .select('id, canonical_product_id, quantity_ordered, quantity_received, unit_cost')
        .eq('organization_id', context.organizationId)
        .eq('order_id', body.orderId);
      if (orderLinesError) throw orderLinesError;

      const { data: invoice, error: invoiceError } = await context.supabase
        .from('procurement_supplier_invoices')
        .insert({
          organization_id: context.organizationId,
          invoice_number: String(body.invoiceNumber).trim(),
          supplier_id: body.supplierId,
          order_id: body.orderId,
          invoice_date: body.invoiceDate,
          currency: body.currency || 'CLP',
          net_amount: Number(body.netAmount || 0),
          tax_amount: Number(body.taxAmount || 0),
          total_amount: Number(body.totalAmount || 0),
          status: 'pending_match',
          document_url: body.documentUrl || null,
          created_by: context.userId,
        })
        .select('id')
        .single();
      if (invoiceError) throw invoiceError;

      const invoiceLines = lines.map((line: Record<string, unknown>) => ({
        organization_id: context.organizationId,
        invoice_id: invoice.id,
        order_line_id: line.orderLineId,
        canonical_product_id: line.canonicalProductId,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unitCost),
      }));
      const { error: invoiceLinesError } = await context.supabase.from('procurement_supplier_invoice_lines').insert(invoiceLines);
      if (invoiceLinesError) throw invoiceLinesError;

      const exceptions: Array<Record<string, unknown>> = [];
      for (const line of invoiceLines) {
        const ordered = (orderLines || []).find((item) => item.id === line.order_line_id);
        if (!ordered) {
          exceptions.push({ organization_id: context.organizationId, invoice_id: invoice.id, order_line_id: line.order_line_id, exception_type: 'unknown_product' });
          continue;
        }
        const received = Number(ordered.quantity_received || 0);
        if (received + TOLERANCE < line.quantity) {
          exceptions.push({ organization_id: context.organizationId, invoice_id: invoice.id, order_line_id: line.order_line_id, exception_type: received === 0 ? 'missing_receipt' : 'quantity', expected_value: received, actual_value: line.quantity, difference: line.quantity - received });
        }
        const expectedCost = Number(ordered.unit_cost || 0);
        if (Math.abs(expectedCost - line.unit_cost) > TOLERANCE) {
          exceptions.push({ organization_id: context.organizationId, invoice_id: invoice.id, order_line_id: line.order_line_id, exception_type: 'unit_price', expected_value: expectedCost, actual_value: line.unit_cost, difference: line.unit_cost - expectedCost });
        }
      }

      if (exceptions.length > 0) {
        const { error: exceptionError } = await context.supabase.from('procurement_match_exceptions').insert(exceptions);
        if (exceptionError) throw exceptionError;
      }

      const status = exceptions.length === 0 ? 'matched' : 'exception';
      const { error: statusError } = await context.supabase
        .from('procurement_supplier_invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', invoice.id)
        .eq('organization_id', context.organizationId);
      if (statusError) throw statusError;

      return NextResponse.json({ id: invoice.id, status, exceptions: exceptions.length }, { status: 201 });
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo completar la operación.' }, { status: 500 });
  }
}
