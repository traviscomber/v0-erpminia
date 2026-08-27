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

const responsibilityRank: Record<RoleTask['responsibility'], number> = {
  owner: 0,
  support: 1,
  escalation: 2,
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveTaskRoute(task: RoleTask) {
  const [kind, rawId, ...rest] = task.task_key.split(':');
  if (kind === 'work_order' && rawId && rest.length === 0 && UUID_PATTERN.test(rawId)) {
    return `/dashboard/mantenimiento/ordenes-trabajo/${rawId}`;
  }

  if (kind === 'maintenance_review' && rawId && rest.length === 0 && UUID_PATTERN.test(rawId)) {
    const priority = task.severity === 'critical' ? 'critical' : 'high';
    return `/dashboard/mantenimiento/ordenes-trabajo/create?reviewId=${rawId}&workType=corrective&priority=${priority}`;
  }

  if (kind === 'inspection' && rawId && rest.length === 0 && UUID_PATTERN.test(rawId)) {
    return '/dashboard/sostenibilidad/prevencion-riesgos/inspecciones';
  }

  if ((kind === 'incident' || kind === 'risk') && rawId && rest.length === 0 && UUID_PATTERN.test(rawId)) {
    return `/dashboard/sostenibilidad/prevencion-riesgos/acciones/${kind}/${rawId}`;
  }

  return task.module_route;
}

function deduplicateTasks(rows: RoleTask[]) {
  const byTaskKey = new Map<string, RoleTask>();

  for (const task of rows) {
    const current = byTaskKey.get(task.task_key);
    if (!current) {
      byTaskKey.set(task.task_key, task);
      continue;
    }

    const currentRank = responsibilityRank[current.responsibility];
    const nextRank = responsibilityRank[task.responsibility];
    const shouldReplace =
      nextRank < currentRank ||
      (nextRank === currentRank && task.priority_score > current.priority_score);

    if (shouldReplace) byTaskKey.set(task.task_key, task);
  }

  return Array.from(byTaskKey.values()).sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });
}

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

  const rawTasks = (data || []) as RoleTask[];
  const tasks = deduplicateTasks(rawTasks).map((task) => ({ ...task, module_route: resolveTaskRoute(task) }));
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
    rawTaskCount: rawTasks.length,
    deduplicatedTaskCount: tasks.length,
  });
}
