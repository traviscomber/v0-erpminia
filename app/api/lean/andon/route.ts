export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const allowedStatuses = new Set(['abierta', 'reconocida', 'en_contencion', 'resuelta', 'cerrada']);
const allowedSeverities = new Set(['critica', 'alta', 'media', 'baja', 'info']);
const allowedTypes = new Set(['documento', 'mantenimiento', 'inventario', 'sostenibilidad', 'contrato', 'produccion', 'telemetria', 'otro']);

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
    }));

  const { error } = await context.supabase
    .from('lean_andon_events')
    .upsert(rows, { onConflict: 'organization_id,source_alert_id', ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ synced: rows.length });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_by: context.userId };
  if (body.status && allowedStatuses.has(body.status)) {
    patch.status = body.status;
    const now = new Date().toISOString();
    if (body.status === 'reconocida') patch.acknowledged_at = now;
    if (body.status === 'en_contencion') patch.contained_at = now;
    if (body.status === 'resuelta') patch.resolved_at = now;
    if (body.status === 'cerrada') patch.closed_at = now;
  }
  if (typeof body.owner_name === 'string') patch.owner_name = body.owner_name.trim() || null;
  if (typeof body.root_cause === 'string') patch.root_cause = body.root_cause.trim() || null;
  if (typeof body.countermeasure === 'string') patch.countermeasure = body.countermeasure.trim() || null;

  const { data, error } = await context.supabase
    .from('lean_andon_events')
    .update(patch)
    .eq('id', body.id)
    .eq('organization_id', context.organizationId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
