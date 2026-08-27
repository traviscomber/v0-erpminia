export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [returnableResult, resolutionResult, receiptsResult] = await Promise.all([
    context.supabase.from('procurement_supplier_returnable_lines_v1').select('*').eq('organization_id', context.organizationId).gt('quantity_returnable', 0).order('received_at', { ascending: true }),
    context.supabase.from('procurement_supplier_return_resolution_v1').select('*').eq('organization_id', context.organizationId).order('requested_at', { ascending: false }).limit(100),
    context.supabase.from('procurement_operational_receipts').select('id,organization_id,order_id,receipt_number,received_at').eq('organization_id', context.organizationId).order('received_at', { ascending: false }).limit(200),
  ]);

  const error = returnableResult.error || resolutionResult.error || receiptsResult.error;
  if (error) {
    console.error('[procurement/returns]', error);
    return NextResponse.json({ returnable: [], returns: [], receipts: [], canEdit: access.canWrite, error: 'No se pudo cargar devoluciones' }, { status: 500 });
  }

  return NextResponse.json({ returnable: returnableResult.data || [], returns: resolutionResult.data || [], receipts: receiptsResult.data || [], canEdit: access.canWrite });
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'create_return') {
      const quantity = Number(body.quantity || 0);
      if (!body.receiptId || !body.receiptLineId || !Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: 'Recepción, línea y cantidad válidas son requeridas' }, { status: 400 });
      if (!String(body.reason || '').trim()) return NextResponse.json({ error: 'Motivo de devolución requerido' }, { status: 400 });
      const { data, error } = await context.supabase.rpc('create_supplier_return_v1', {
        p_organization_id: context.organizationId,
        p_receipt_id: body.receiptId,
        p_reason: String(body.reason).trim(),
        p_resolution_type: body.resolutionType || 'pending',
        p_lines: [{ receipt_line_id: body.receiptLineId, quantity }],
        p_evidence_url: body.evidenceUrl || null,
        p_notes: body.notes || null,
      });
      if (error) throw error;
      return NextResponse.json({ returnId: data }, { status: 201 });
    }

    if (action === 'mark_received_by_supplier') {
      const { error } = await context.supabase.rpc('mark_supplier_return_received_v1', {
        p_organization_id: context.organizationId,
        p_return_id: body.returnId,
        p_reference: body.reference || null,
        p_notes: body.notes || null,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'resolve_replacement') {
      const { error } = await context.supabase.rpc('resolve_supplier_return_replacement_v1', {
        p_organization_id: context.organizationId,
        p_return_id: body.returnId,
        p_replacement_receipt_id: body.replacementReceiptId,
        p_notes: body.notes || null,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === 'resolve_credit_note') {
      const amount = Number(body.amount || 0);
      if (!body.invoiceId || !String(body.creditNoteNumber || '').trim() || !body.creditNoteDate || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Factura, número, fecha y monto de nota de crédito son requeridos' }, { status: 400 });
      const { data, error } = await context.supabase.rpc('resolve_supplier_return_credit_note_v1', {
        p_organization_id: context.organizationId,
        p_return_id: body.returnId,
        p_invoice_id: body.invoiceId,
        p_credit_note_number: String(body.creditNoteNumber).trim(),
        p_credit_note_date: body.creditNoteDate,
        p_amount: amount,
        p_notes: body.notes || null,
      });
      if (error) throw error;
      return NextResponse.json({ creditNoteId: data });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'No se pudo completar la devolución';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
