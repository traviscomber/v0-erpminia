export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [{ data: returnable, error: returnableError }, { data: returns, error: returnsError }] = await Promise.all([
    context.supabase
      .from('procurement_supplier_returnable_lines_v1')
      .select('*')
      .eq('organization_id', context.organizationId)
      .gt('quantity_returnable', 0)
      .order('received_at', { ascending: true }),
    context.supabase
      .from('procurement_supplier_returns')
      .select('id,organization_id,return_number,order_id,receipt_id,supplier_id,reason,resolution_type,status,credit_note_number,evidence_url,requested_at,resolved_at,notes')
      .eq('organization_id', context.organizationId)
      .order('requested_at', { ascending: false })
      .limit(100),
  ]);

  if (returnableError || returnsError) {
    console.error('[procurement/returns]', returnableError || returnsError);
    return NextResponse.json({ returnable: [], returns: [], canEdit: access.canWrite, error: 'No se pudo cargar devoluciones' }, { status: 500 });
  }

  return NextResponse.json({ returnable: returnable || [], returns: returns || [], canEdit: access.canWrite });
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.FIN_COMPRAS, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    if (String(body.action || '') !== 'create_return') {
      return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
    }
    const quantity = Number(body.quantity || 0);
    if (!body.receiptId || !body.receiptLineId || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Recepción, línea y cantidad válidas son requeridas' }, { status: 400 });
    }
    if (!String(body.reason || '').trim()) {
      return NextResponse.json({ error: 'Motivo de devolución requerido' }, { status: 400 });
    }

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
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'No se pudo registrar la devolución';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
