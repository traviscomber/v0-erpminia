export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const text = (value: unknown) => String(value ?? '').trim();

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const action = text(body?.action);
  const note = text(body?.note);
  if (!id || !['approve','reject','apply'].includes(action)) return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
  if (['approve','reject'].includes(action) && !note) return NextResponse.json({ error: 'La decisión humana requiere una nota explícita.' }, { status: 400 });

  const { data: proposal } = await context.supabase.from('maintenance_feedback_change_proposals')
    .select('id,status,feedback_id,canonical_asset_id,target_type,target_record_id,proposed_payload')
    .eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
  if (!proposal) return NextResponse.json({ error: 'Propuesta no encontrada.' }, { status: 404 });

  if (action === 'approve' || action === 'reject') {
    if (proposal.status !== 'proposed') return NextResponse.json({ error: 'Solo una propuesta pendiente puede aprobarse o rechazarse.' }, { status: 409 });
    const status = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();
    const { error } = await context.supabase.from('maintenance_feedback_change_proposals').update({ status, decided_by: context.userId, decided_at: now, decision_note: note, updated_at: now }).eq('organization_id', context.organizationId).eq('id', id).eq('status', 'proposed');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status });
  }

  if (proposal.status !== 'approved') return NextResponse.json({ error: 'Solo una propuesta aprobada puede aplicarse.' }, { status: 409 });
  const { data, error } = await context.supabase.rpc('apply_maintenance_feedback_change', { p_proposal_id: id, p_organization_id: context.organizationId, p_actor: context.userId });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, status: 'applied', resultRecordId: data });
}