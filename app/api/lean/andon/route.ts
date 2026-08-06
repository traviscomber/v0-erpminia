export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const allowedStatuses = new Set(['abierta', 'reconocida', 'en_contencion', 'resuelta', 'cerrada']);
const allowedSeverities = new Set(['critica', 'alta', 'media', 'baja', 'info']);
const allowedTypes = new Set(['documento', 'mantenimiento', 'inventario', 'sostenibilidad', 'contrato', 'produccion', 'telemetria', 'otro']);

const allowedTransitions: Record<string, string[]> = {
  abierta: ['reconocida', 'en_contencion'],
  reconocida: ['en_contencion', 'resuelta'],
  en_contencion: ['resuelta'],
  resuelta: ['cerrada'],
  cerrada: [],
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const status = request.nextUrl.searchParams.get('status');
  let query = context.supabase
    .from('lean_andon_events')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('opened_at', { ascending: false })
    .limit(200);

  if (status && allowedStatuses.has(status)) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'No fue posible cargar las alertas operacionales.' }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const alerts = Array.isArray(body?.alerts) ? body.alerts : [];
  if (alerts.length === 0) return NextResponse.json({ synced: 0 });

  const rows = alerts
    .filter((alert: Record<string, unknown>) => typeof alert.id === 'string' && typeof alert.title === 'string')
    .map((alert: Record<string, unknown>) => ({
      organization_id: context.organizationId,
      source_alert_id: String(alert.id),
      source_type: allowedTypes.has(String(alert.type)) ? String(alert.type) : 'otro',
      title: String(alert.title),
      description: typeof alert.description === 'string' ? alert.description : null,
      severity: allowedSeverities.has(String(alert.severity)) ? String(alert.severity) : 'media',
      action_url: typeof alert.actionUrl === 'string' ? alert.actionUrl : null,
      opened_at: typeof alert.timestamp === 'string' ? alert.timestamp : new Date().toISOString(),
      created_by: context.userId,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    }));

  const { error } = await context.supabase
    .from('lean_andon_events')
    .upsert(rows, { onConflict: 'organization_id,source_alert_id', ignoreDuplicates: false });

  if (error) return NextResponse.json({ error: 'No fue posible actualizar las alertas operacionales.' }, { status: 500 });
  return NextResponse.json({ synced: rows.length });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const id = cleanText(body?.id);
  if (!id) return NextResponse.json({ error: 'Selecciona una alerta válida.' }, { status: 400 });

  const { data: current, error: currentError } = await context.supabase
    .from('lean_andon_events')
    .select('*')
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .single();

  if (currentError || !current) {
    return NextResponse.json({ error: 'La alerta ya no está disponible.' }, { status: 404 });
  }

  const requestedStatus = body?.status ? String(body.status) : null;
  if (requestedStatus && !allowedStatuses.has(requestedStatus)) {
    return NextResponse.json({ error: 'El estado seleccionado no es válido.' }, { status: 400 });
  }
  if (
    requestedStatus &&
    requestedStatus !== current.status &&
    !(allowedTransitions[current.status] || []).includes(requestedStatus)
  ) {
    return NextResponse.json({ error: 'Completa el paso anterior antes de continuar.' }, { status: 409 });
  }

  const ownerWasProvided = typeof body?.owner_name === 'string';
  let nextOwner = ownerWasProvided ? cleanText(body.owner_name) : cleanText(current.owner_name);
  const nextCause = typeof body?.root_cause === 'string' ? cleanText(body.root_cause) : cleanText(current.root_cause);
  const nextAction = typeof body?.countermeasure === 'string' ? cleanText(body.countermeasure) : cleanText(current.countermeasure);
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = {
    updated_by: context.userId,
    updated_at: now,
  };

  if (ownerWasProvided) {
    patch.owner_name = nextOwner || null;
    patch.owner_id = null;
  }
  if (typeof body?.root_cause === 'string') patch.root_cause = nextCause || null;
  if (typeof body?.countermeasure === 'string') patch.countermeasure = nextAction || null;

  if (requestedStatus) {
    if (['reconocida', 'en_contencion'].includes(requestedStatus) && !nextOwner) {
      nextOwner = context.userName || context.userEmail || 'Responsable asignado';
      patch.owner_name = nextOwner;
      patch.owner_id = context.userId;
    }

    if (['resuelta', 'cerrada'].includes(requestedStatus)) {
      if (!nextOwner) return NextResponse.json({ error: 'Asigna un responsable antes de resolver.' }, { status: 400 });
      if (!nextCause) return NextResponse.json({ error: 'Registra la causa principal antes de resolver.' }, { status: 400 });
      if (!nextAction) return NextResponse.json({ error: 'Registra la acción preventiva antes de resolver.' }, { status: 400 });
    }

    patch.status = requestedStatus;
    if (requestedStatus === 'reconocida' && !current.acknowledged_at) patch.acknowledged_at = now;
    if (requestedStatus === 'en_contencion') {
      if (!current.acknowledged_at) patch.acknowledged_at = now;
      if (!current.contained_at) patch.contained_at = now;
    }
    if (requestedStatus === 'resuelta' && !current.resolved_at) patch.resolved_at = now;
    if (requestedStatus === 'cerrada' && !current.closed_at) patch.closed_at = now;
  }

  const { data, error } = await context.supabase
    .from('lean_andon_events')
    .update(patch)
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'No fue posible guardar los cambios.' }, { status: 500 });
  return NextResponse.json({ data });
}
