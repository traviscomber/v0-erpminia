export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const ALLOWED = new Set(['pending', 'read', 'snoozed']);

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('user_action_states')
    .select('source_key,status,snoozed_until,updated_at')
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ states: data || [] });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null) as { sourceKey?: string; status?: string } | null;
  const sourceKey = String(body?.sourceKey || '').trim();
  const status = String(body?.status || '').trim().toLowerCase();

  if (!sourceKey || sourceKey.length > 180 || !ALLOWED.has(status)) {
    return NextResponse.json({ error: 'Estado de prioridad inválido' }, { status: 400 });
  }

  const snoozedUntil = status === 'snoozed'
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await context.supabase
    .from('user_action_states')
    .upsert({
      organization_id: context.organizationId,
      user_id: context.userId,
      source_key: sourceKey,
      status,
      snoozed_until: snoozedUntil,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,user_id,source_key' })
    .select('source_key,status,snoozed_until,updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ state: data });
}
