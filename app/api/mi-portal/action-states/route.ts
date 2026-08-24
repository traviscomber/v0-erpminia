export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const ALLOWED = new Set(['pending', 'read', 'snoozed']);
const CHILE_TIME_ZONE = 'America/Santiago';

function chileDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CHILE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

function chileOffsetMs(date: Date) {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone: CHILE_TIME_ZONE,
    timeZoneName: 'longOffset',
  }).formatToParts(date).find((item) => item.type === 'timeZoneName')?.value || 'GMT+00:00';
  const match = part.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3])) * 60 * 1000;
}

function nextChileMorningIso(now = new Date()) {
  const local = chileDateParts(now);
  const nextDate = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = nextDate.getUTCMonth();
  const nextDay = nextDate.getUTCDate();
  const localEightAmAsUtc = Date.UTC(nextYear, nextMonth, nextDay, 8, 0, 0);
  const offset = chileOffsetMs(new Date(localEightAmAsUtc));
  return new Date(localEightAmAsUtc - offset).toISOString();
}

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

  const snoozedUntil = status === 'snoozed' ? nextChileMorningIso() : null;

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
