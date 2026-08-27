export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type EscalationRow = {
  cargo_name: string | null;
  task_key: string | null;
  domain: string | null;
  severity: string | null;
  priority_score: number | null;
  title: string | null;
  evidence_summary: string | null;
  responsibility: string | null;
  recommended_action: string | null;
  due_at: string | null;
  escalation_at: string | null;
  age_hours: number | null;
  urgency_state: string | null;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data, error } = await context.supabase
    .from('role_task_escalations_v1')
    .select('cargo_name,task_key,domain,severity,priority_score,title,evidence_summary,responsibility,recommended_action,due_at,escalation_at,age_hours,urgency_state')
    .eq('organization_id', context.organizationId)
    .order('priority_score', { ascending: false })
    .order('escalation_at', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[executive-escalations] lookup failed', error);
    return NextResponse.json({ error: 'No se pudo cargar el seguimiento ejecutivo' }, { status: 500 });
  }

  const rows = (data || []) as EscalationRow[];
  const byCargo = new Map<string, number>();
  const byDomain = new Map<string, number>();
  for (const row of rows) {
    const cargo = row.cargo_name || 'Sin cargo';
    const domain = row.domain || 'Sin dominio';
    byCargo.set(cargo, (byCargo.get(cargo) || 0) + 1);
    byDomain.set(domain, (byDomain.get(domain) || 0) + 1);
  }

  const topCargo = [...byCargo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || null;
  const topDomain = [...byDomain.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || null;

  return NextResponse.json({
    summary: {
      total: rows.length,
      critical: rows.filter((row) => row.severity === 'critical').length,
      escalated: rows.filter((row) => row.urgency_state === 'escalated').length,
      topCargo: topCargo ? { name: topCargo[0], count: topCargo[1] } : null,
      topDomain: topDomain ? { name: topDomain[0], count: topDomain[1] } : null,
    },
    escalations: rows.slice(0, 20),
    generatedAt: new Date().toISOString(),
    source: 'role_task_escalations_v1',
  });
}
