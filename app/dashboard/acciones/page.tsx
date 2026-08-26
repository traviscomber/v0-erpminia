'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, CheckCircle2, Clock3, Inbox, RefreshCw, ShieldAlert, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Task = {
  task_key: string;
  cargo_name: string;
  domain: string;
  severity: 'critical' | 'warning' | 'info';
  priority_score: number;
  title: string;
  evidence_summary: string | null;
  responsibility: 'owner' | 'support' | 'escalation';
  occurred_at: string | null;
  due_at: string | null;
  urgency_state: string;
  urgency_label: string;
  responsibility_label: string;
  module_route: string;
};

type InboxPayload = {
  profile?: { name?: string | null; cargoName?: string | null };
  summary?: { total: number; owners: number; support: number; escalations: number; critical: number; overdue: number; backlog: number };
  tasks?: Task[];
};

type StateRow = { source_key: string; status: 'pending' | 'read' | 'snoozed'; snoozed_until?: string | null };

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar');
  return payload || {};
};

function lane(task: Task) {
  if (task.responsibility === 'escalation') return 'Escalaciones';
  if (task.responsibility === 'support') return 'Apoyos';
  if (task.urgency_state === 'overdue' || task.urgency_state === 'escalated') return 'Vencidas';
  return 'Operación actual';
}

export default function AccionesPage() {
  const inbox = useSWR<InboxPayload>('/api/actions/inbox', fetcher, { refreshInterval: 60000, revalidateOnFocus: false });
  const states = useSWR('/api/actions/state', fetcher, { revalidateOnFocus: false });
  const stateMap = new Map<string, StateRow>((states.data?.states || []).map((row: StateRow) => [row.source_key, row]));
  const now = Date.now();
  const tasks = (inbox.data?.tasks || []).filter((task) => {
    const state = stateMap.get(task.task_key);
    return !(state?.status === 'snoozed' && state.snoozed_until && new Date(state.snoozed_until).getTime() > now);
  });

  async function setState(sourceKey: string, status: 'pending' | 'read' | 'snoozed') {
    await fetch('/api/actions/state', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceKey, status }),
    });
    await states.mutate();
  }

  const lanes = ['Operación actual', 'Vencidas', 'Apoyos', 'Escalaciones'] as const;
  const summary = inbox.data?.summary;

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{inbox.data?.profile?.cargoName || 'Trabajo por cargo'}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mis acciones</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Sólo decisiones y tareas que corresponden a tu cargo. Materiales, finanzas y calidad de datos permanecen en sus módulos salvo que bloqueen la operación.</p>
      </div>
      <Button variant="outline" onClick={() => { void inbox.mutate(); void states.mutate(); }}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Acciones propias</p><p className="mt-1 text-2xl font-semibold">{summary?.owners ?? 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Críticas</p><p className="mt-1 text-2xl font-semibold">{summary?.critical ?? 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vencidas</p><p className="mt-1 text-2xl font-semibold">{summary?.overdue ?? 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Escalaciones</p><p className="mt-1 text-2xl font-semibold">{summary?.escalations ?? 0}</p></CardContent></Card>
    </div>

    {inbox.error || states.error ? <Card className="shadow-none"><CardContent className="p-8 text-center text-sm text-muted-foreground">No se pudo cargar la bandeja operacional.</CardContent></Card> : inbox.isLoading || states.isLoading ? <Card className="shadow-none"><CardContent className="p-8 text-sm text-muted-foreground">Cargando trabajo del cargo…</CardContent></Card> : tasks.length === 0 ? <Card className="shadow-none"><CardContent className="p-10 text-center"><CheckCircle2 className="mx-auto h-7 w-7" /><p className="mt-3 font-medium">Operación al día</p><p className="mt-1 text-sm text-muted-foreground">No tienes tareas ni escalaciones operacionales visibles en este momento.</p></CardContent></Card> : <div className="space-y-5">
      {lanes.map((laneName) => {
        const laneTasks = tasks.filter((task) => lane(task) === laneName);
        if (!laneTasks.length) return null;
        const Icon = laneName === 'Escalaciones' ? ShieldAlert : laneName === 'Apoyos' ? Users : laneName === 'Vencidas' ? Clock3 : Inbox;
        return <Card key={laneName} className="shadow-none"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5" />{laneName}<Badge variant="secondary" className="ml-auto">{laneTasks.length}</Badge></CardTitle></CardHeader><CardContent className="p-0"><div className="divide-y border-t">{laneTasks.map((task) => {
          const state = stateMap.get(task.task_key);
          const isOwner = task.responsibility === 'owner';
          return <div key={task.task_key} className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={task.severity === 'critical' ? 'destructive' : 'outline'}>{task.severity === 'critical' ? 'Crítica' : task.severity === 'warning' ? 'Atención' : 'Seguimiento'}</Badge>
                <Badge variant="secondary">{task.responsibility_label}</Badge>
                {task.urgency_label ? <Badge variant="outline">{task.urgency_label}</Badge> : null}
                {state?.status === 'read' ? <Badge variant="secondary">Vista</Badge> : null}
              </div>
              <p className="mt-2 font-medium">{task.title}</p>
              {task.evidence_summary ? <p className="mt-1 text-sm text-muted-foreground">{task.evidence_summary}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">{task.domain} · {task.cargo_name}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => void setState(task.task_key, state?.status === 'read' ? 'pending' : 'read')}>{state?.status === 'read' ? 'Marcar pendiente' : 'Vista'}</Button>
              <Button size="sm" variant="ghost" onClick={() => void setState(task.task_key, 'snoozed')}><Clock3 className="mr-2 h-4 w-4" />Mañana</Button>
              <Button asChild size="sm" variant={isOwner ? 'default' : 'outline'}><Link href={task.module_route}>{isOwner ? 'Resolver' : task.responsibility === 'support' ? 'Apoyar' : 'Revisar'}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </div>;
        })}</div></CardContent></Card>;
      })}
    </div>}
  </div>;
}
