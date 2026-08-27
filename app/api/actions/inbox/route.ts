export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type RoleTask = {
  organization_id: string;
  cargo_id: string;
  cargo_name: string;
  task_key: string;
  domain: string;
  severity: 'critical' | 'warning' | 'info';
  priority_score: number;
  title: string;
  evidence_summary: string | null;
  status: string;
  responsibility: 'owner' | 'support' | 'escalation';
  role_action: string | null;
  occurred_at: string | null;
  due_at: string | null;
  escalation_at: string | null;
  age_hours: number | null;
  urgency_state: string;
  personal_status: string | null;
  snoozed_until: string | null;
  visible_now: boolean;
  actions: unknown;
  module_route: string;
  urgency_label: string;
  responsibility_label: string;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('cargo_id, full_name')
    .eq('id', context.userId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (profileError) {
    console.error('[role-task-inbox] profile lookup failed', profileError);
    return NextResponse.json({ error: 'No se pudo resolver tu cargo' }, { status: 500 });
  }

  if (!profile?.cargo_id) {
    return NextResponse.json({
      profile: { name: profile?.full_name || null, cargoId: null, cargoName: null },
      tasks: [],
      summary: { total: 0, owners: 0, support: 0, escalations: 0, critical: 0, overdue: 0, backlog: 0 },
      generatedAt: new Date().toISOString(),
    });
  }

  const [{ data: cargo, error: cargoError }, { data, error }] = await Promise.all([
    context.supabase.from('cargos').select('name').eq('id', profile.cargo_id).maybeSingle(),
    context.supabase
      .from('role_task_frontend_v1')
      .select('*')
      .eq('organization_id', context.organizationId)
      .eq('cargo_id', profile.cargo_id)
      .eq('visible_now', true)
      .order('priority_score', { ascending: false })
      .order('due_at', { ascending: true, nullsFirst: false }),
  ]);

  if (cargoError) {
    console.error('[role-task-inbox] cargo lookup failed', cargoError);
    return NextResponse.json({ error: 'No se pudo resolver tu cargo' }, { status: 500 });
  }

  if (error) {
    console.error('[role-task-inbox] task lookup failed', error);
    return NextResponse.json({ error: 'No se pudo cargar tu bandeja operacional' }, { status: 500 });
  }

  const tasks = (data || []) as RoleTask[];
  const now = Date.now();
  const backlogCutoff = now - 30 * 24 * 60 * 60 * 1000;
  const isOverdue = (task: RoleTask) => Boolean(task.due_at && new Date(task.due_at).getTime() < now);
  const isBacklog = (task: RoleTask) => Boolean(task.occurred_at && new Date(task.occurred_at).getTime() < backlogCutoff);

  return NextResponse.json({
    profile: { name: profile.full_name || null, cargoId: profile.cargo_id, cargoName: cargo?.name || null },
    tasks,
    summary: {
      total: tasks.length,
      owners: tasks.filter((task) => task.responsibility === 'owner').length,
      support: tasks.filter((task) => task.responsibility === 'support').length,
      escalations: tasks.filter((task) => task.responsibility === 'escalation').length,
      critical: tasks.filter((task) => task.severity === 'critical').length,
      overdue: tasks.filter(isOverdue).length,
      backlog: tasks.filter(isBacklog).length,
    },
    generatedAt: new Date().toISOString(),
    source: 'role_task_frontend_v1',
  });
}
