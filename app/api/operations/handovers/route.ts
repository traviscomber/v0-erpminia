export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

async function resolvePersonByEmail(context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>) {
  if (!context.userEmail) return null;
  const { data } = await context.supabase
    .from('people')
    .select('id, full_name, email, role_title')
    .eq('organization_id', context.organizationId)
    .ilike('email', context.userEmail)
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const person = await resolvePersonByEmail(context);
  const [handoversResult, peopleResult, workOrdersResult, assetsResult] = await Promise.all([
    context.supabase
      .from('operational_shift_handovers')
      .select('id, outgoing_person_id, incoming_person_id, work_order_id, canonical_asset_id, summary, risk, status, created_at, received_at')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false })
      .limit(200),
    context.supabase
      .from('people')
      .select('id, full_name, email, role_title, employment_status')
      .eq('organization_id', context.organizationId)
      .order('full_name', { ascending: true })
      .limit(1000),
    context.supabase
      .from('maintenance_work_orders')
      .select('id, work_order_number, title, status, priority, canonical_asset_id')
      .eq('organization_id', context.organizationId)
      .order('updated_at', { ascending: false })
      .limit(300),
    context.supabase
      .from('maintenance_assets')
      .select('id, asset_code, asset_name, location, status, criticality')
      .eq('organization_id', context.organizationId)
      .order('asset_name', { ascending: true })
      .limit(1000),
  ]);

  if (handoversResult.error || peopleResult.error || workOrdersResult.error || assetsResult.error) {
    return NextResponse.json({ error: 'No se pudo cargar la entrega de turno.' }, { status: 500 });
  }

  return NextResponse.json({
    person,
    handovers: handoversResult.data || [],
    people: peopleResult.data || [],
    workOrders: workOrdersResult.data || [],
    assets: assetsResult.data || [],
    source: 'canonical',
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const outgoing = await resolvePersonByEmail(context);
  if (!outgoing) return NextResponse.json({ error: 'Tu usuario no está vinculado a una persona por email.' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const incomingPersonId = typeof body?.incomingPersonId === 'string' ? body.incomingPersonId : '';
  const workOrderId = typeof body?.workOrderId === 'string' && body.workOrderId ? body.workOrderId : null;
  const canonicalAssetId = typeof body?.canonicalAssetId === 'string' && body.canonicalAssetId ? body.canonicalAssetId : null;
  const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
  const risk = typeof body?.risk === 'string' && body.risk.trim() ? body.risk.trim() : null;

  if (!incomingPersonId || !summary || incomingPersonId === outgoing.id) {
    return NextResponse.json({ error: 'Selecciona otra persona y describe claramente lo que debe continuar.' }, { status: 400 });
  }

  const { data: incoming } = await context.supabase
    .from('people').select('id').eq('organization_id', context.organizationId).eq('id', incomingPersonId).maybeSingle();
  if (!incoming) return NextResponse.json({ error: 'La persona receptora no pertenece a la organización.' }, { status: 400 });

  let assetId = canonicalAssetId;
  if (workOrderId) {
    const { data: workOrder } = await context.supabase
      .from('maintenance_work_orders')
      .select('id, canonical_asset_id')
      .eq('organization_id', context.organizationId)
      .eq('id', workOrderId)
      .maybeSingle();
    if (!workOrder) return NextResponse.json({ error: 'La OT seleccionada no pertenece a la organización.' }, { status: 400 });
    if (!assetId) assetId = workOrder.canonical_asset_id || null;
  }

  if (assetId) {
    const { data: asset } = await context.supabase
      .from('maintenance_assets').select('id').eq('organization_id', context.organizationId).eq('id', assetId).maybeSingle();
    if (!asset) return NextResponse.json({ error: 'El equipo seleccionado no pertenece a la organización.' }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from('operational_shift_handovers')
    .insert({
      organization_id: context.organizationId,
      outgoing_person_id: outgoing.id,
      incoming_person_id: incomingPersonId,
      work_order_id: workOrderId,
      canonical_asset_id: assetId,
      summary,
      risk,
      status: 'open',
      created_by: context.userId,
    })
    .select('id, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: 'No se pudo registrar la entrega.' }, { status: 500 });
  return NextResponse.json({ handover: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const incoming = await resolvePersonByEmail(context);
  if (!incoming) return NextResponse.json({ error: 'Tu usuario no está vinculado a una persona por email.' }, { status: 400 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'Entrega inválida.' }, { status: 400 });

  const { data: handover } = await context.supabase
    .from('operational_shift_handovers')
    .select('id, status, incoming_person_id')
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .maybeSingle();

  if (!handover || handover.incoming_person_id !== incoming.id) {
    return NextResponse.json({ error: 'Solo la persona receptora puede confirmar esta entrega.' }, { status: 403 });
  }
  if (handover.status === 'received') return NextResponse.json({ ok: true, status: 'received' });

  const now = new Date().toISOString();
  const { error } = await context.supabase
    .from('operational_shift_handovers')
    .update({ status: 'received', received_by: context.userId, received_at: now, updated_at: now })
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .eq('incoming_person_id', incoming.id);

  if (error) return NextResponse.json({ error: 'No se pudo confirmar la recepción.' }, { status: 500 });
  return NextResponse.json({ ok: true, status: 'received', receivedAt: now });
}
