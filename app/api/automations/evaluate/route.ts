export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type Decision = {
  id: string;
  category: string;
  severity: string;
  sourceId?: string | null;
};

type Rule = {
  id: string;
  category: string;
  severity: string | null;
  action_type: string;
};

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const cookie = request.headers.get('cookie') || '';
  const authorization = request.headers.get('authorization');
  const headers: HeadersInit = { cookie };
  if (authorization) headers.authorization = authorization;

  const decisionResponse = await fetch(new URL('/api/dashboard/ia-operacional', request.url), {
    headers,
    cache: 'no-store',
  });
  if (!decisionResponse.ok) return NextResponse.json({ error: 'No se pudieron comprobar las condiciones actuales' }, { status: 502 });

  const decisionPayload = await decisionResponse.json().catch(() => null);
  const decisions: Decision[] = Array.isArray(decisionPayload?.decisions) ? decisionPayload.decisions : [];

  const { data: rules, error: rulesError } = await context.supabase
    .from('automation_rules')
    .select('id, category, severity, action_type')
    .eq('organization_id', context.organizationId)
    .eq('created_by', context.userId)
    .eq('enabled', true);

  if (rulesError) return NextResponse.json({ error: 'No se pudieron revisar las reglas activas' }, { status: 500 });

  const matches = (rules || []).flatMap((rule: Rule) =>
    decisions
      .filter((decision) => decision.category === rule.category && (!rule.severity || decision.severity === rule.severity))
      .map((decision) => ({ rule, decision })),
  );

  if (matches.length > 0) {
    const rows = matches.map(({ rule, decision }) => ({
      organization_id: context.organizationId,
      rule_id: rule.id,
      user_id: context.userId,
      source_key: decision.id,
      source_id: decision.sourceId || null,
      category: decision.category,
      action_type: 'notify',
    }));

    const { error } = await context.supabase
      .from('automation_rule_runs')
      .upsert(rows, { onConflict: 'rule_id,user_id,source_key', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: 'Las condiciones se comprobaron, pero no se pudo guardar el historial' }, { status: 500 });
  }

  return NextResponse.json({ checked: decisions.length, matches: matches.length, generatedAt: new Date().toISOString() });
}
