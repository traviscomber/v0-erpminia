export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type OwnerTaskRow = {
  task_key: string | null;
  domain: string | null;
  severity: string | null;
  priority_score: number | null;
  title: string | null;
  evidence_summary: string | null;
  recommended_action: string | null;
  occurred_at: string | null;
};

type SlaPolicyRow = {
  domain: string | null;
  severity: string | null;
  responsibility: string | null;
  due_hours: number | null;
  escalation_hours: number | null;
  escalation_cargo_name: string | null;
};

type EscalationRow = {
  cargo_name: string | null;
  task_key: string | null;
  domain: string | null;
  severity: string | null;
  priority_score: number | null;
  title: string | null;
  evidence_summary: string | null;
  responsibility: 'escalation';
  recommended_action: string | null;
  due_at: string | null;
  escalation_at: string | null;
  age_hours: number | null;
  urgency_state: 'escalated';
};

const SOURCE = 'role_tasks_by_cargo_v1+operational_task_sla_policies';

function unavailable(reason: 'source_timeout') {
  return NextResponse.json({
    available: false,
    summary: null,
    escalations: [],
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    reason,
  });
}

function addHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [tasksResult, policiesResult] = await Promise.all([
    context.supabase
      .from('role_tasks_by_cargo_v1')
      .select('task_key,domain,severity,priority_score,title,evidence_summary,recommended_action,occurred_at')
      .eq('organization_id', context.organizationId)
      .eq('responsibility', 'owner'),
    context.supabase
      .from('operational_task_sla_policies')
      .select('domain,severity,responsibility,due_hours,escalation_hours,escalation_cargo_name')
      .eq('enabled', true)
      .eq('responsibility', 'owner'),
  ]);

  const sourceError = tasksResult.error || policiesResult.error;
  if (sourceError) {
    if (sourceError.code === '57014') {
      console.warn('[executive-escalations] scoped source timed out; returning explicit unavailable state', {
        code: sourceError.code,
        message: sourceError.message,
      });
      return unavailable('source_timeout');
    }

    console.error('[executive-escalations] lookup failed', sourceError);
    return NextResponse.json({ error: 'No se pudo cargar el seguimiento ejecutivo' }, { status: 500 });
  }

  const tasks = (tasksResult.data || []) as OwnerTaskRow[];
  const policies = (policiesResult.data || []) as SlaPolicyRow[];
  const policyBySignal = new Map<string, SlaPolicyRow>();
  for (const policy of policies) {
    if (!policy.domain || !policy.severity) continue;
    policyBySignal.set(`${policy.domain}:${policy.severity}`, policy);
  }

  const now = Date.now();
  const rows: EscalationRow[] = [];
  for (const task of tasks) {
    if (!task.domain || !task.severity || !task.occurred_at) continue;
    const policy = policyBySignal.get(`${task.domain}:${task.severity}`);
    if (!policy?.escalation_hours || !policy.escalation_cargo_name) continue;

    const occurredAt = new Date(task.occurred_at).getTime();
    if (!Number.isFinite(occurredAt)) continue;
    const escalationAtMs = occurredAt + policy.escalation_hours * 60 * 60 * 1000;
    if (now < escalationAtMs) continue;

    rows.push({
      cargo_name: policy.escalation_cargo_name,
      task_key: task.task_key,
      domain: task.domain,
      severity: task.severity,
      priority_score: Math.min(100, (task.priority_score || 0) + 15),
      title: `Escalación: ${task.title || 'Tarea operacional'}`,
      evidence_summary: task.evidence_summary,
      responsibility: 'escalation',
      recommended_action: task.recommended_action,
      due_at: policy.due_hours == null ? null : addHours(task.occurred_at, policy.due_hours),
      escalation_at: addHours(task.occurred_at, policy.escalation_hours),
      age_hours: Math.max(0, Math.floor((now - occurredAt) / (60 * 60 * 1000))),
      urgency_state: 'escalated',
    });
  }

  rows.sort((a, b) => {
    const priorityDelta = (b.priority_score || 0) - (a.priority_score || 0);
    if (priorityDelta !== 0) return priorityDelta;
    return String(a.escalation_at || '').localeCompare(String(b.escalation_at || ''));
  });

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
    available: true,
    summary: {
      total: rows.length,
      critical: rows.filter((row) => row.severity === 'critical').length,
      escalated: rows.length,
      topCargo: topCargo ? { name: topCargo[0], count: topCargo[1] } : null,
      topDomain: topDomain ? { name: topDomain[0], count: topDomain[1] } : null,
    },
    escalations: rows.slice(0, 20),
    generatedAt: new Date().toISOString(),
    source: SOURCE,
  });
}
