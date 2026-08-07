export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const categories = new Set(['maintenance', 'preventive', 'inventory', 'documents', 'finance']);
const severities = new Set(['critical', 'warning', 'info']);

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [{ data: rules, error: rulesError }, { data: runs, error: runsError }] = await Promise.all([
    context.supabase
      .from('automation_rules')
      .select('id, name, category, severity, enabled, action_type, created_by, created_at, updated_at')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false }),
    context.supabase
      .from('automation_rule_runs')
      .select('id, rule_id, source_key, source_id, category, action_type, created_at')
      .eq('organization_id', context.organizationId)
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  if (rulesError || runsError) return NextResponse.json({ error: 'No se pudieron cargar las reglas automáticas' }, { status: 500 });
  return NextResponse.json({ rules: rules || [], runs: runs || [] });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim();
  const category = String(body?.category || '').trim();
  const severity = body?.severity ? String(body.severity).trim() : null;

  if (!name || !categories.has(category) || (severity && !severities.has(severity))) {
    return NextResponse.json({ error: 'Completa correctamente el nombre y la condición' }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from('automation_rules')
    .insert({
      organization_id: context.organizationId,
      created_by: context.userId,
      name,
      category,
      severity,
      enabled: true,
      action_type: 'notify',
    })
    .select('id, name, category, severity, enabled, action_type, created_by, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: 'No se pudo crear la regla' }, { status: 500 });
  return NextResponse.json({ rule: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const id = String(body?.id || '').trim();
  if (!id || typeof body?.enabled !== 'boolean') return NextResponse.json({ error: 'Cambio inválido' }, { status: 400 });

  const { data, error } = await context.supabase
    .from('automation_rules')
    .update({ enabled: body.enabled, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', context.organizationId)
    .eq('created_by', context.userId)
    .select('id, enabled')
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'No se pudo actualizar la regla' }, { status: 500 });
  return NextResponse.json({ rule: data });
}
