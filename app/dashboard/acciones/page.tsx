'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { ArrowRight, CheckCircle2, Clock3, Inbox, RefreshCw, Search, ShieldAlert, Users, X } from 'lucide-react';
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
type FamilyPreferences = Record<string, boolean>;
type TaskFilter = 'all' | 'critical' | 'overdue' | 'owner';

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

function family(task: Task) {
  if (task.task_key.startsWith('data_health:')) return 'Calidad de datos';
  if (task.task_key.startsWith('maintenance_review:')) return 'Observaciones de equipos';
  if (task.task_key.startsWith('work_order:')) return 'Órdenes de trabajo';
  if (task.task_key.startsWith('incident:')) return 'Incidentes HSE';
  if (task.task_key.startsWith('inspection:')) return 'Inspecciones HSE';
  if (task.task_key.startsWith('risk:')) return 'Riesgos HSE';
  if (task.domain === 'inventory') return 'Inventario y abastecimiento';
  if (task.domain === 'plant') return 'Producción';
  if (task.domain === 'finance') return 'Finanzas';
  if (task.domain === 'hse') return 'Sostenibilidad';
  if (task.domain === 'maintenance') return 'Mantención';
  return 'Otras acciones';
}

const severityRank: Record<Task['severity'], number> = { critical: 0, warning: 1, info: 2 };

function urgencyRank(task: Task) {
  if (task.urgency_state === 'escalated') return 0;
  if (task.urgency_state === 'overdue') return 1;
  return 2;
}

function taskOrder(a: Task, b: Task) {
  return severityRank[a.severity] - severityRank[b.severity]
    || urgencyRank(a) - urgencyRank(b)
    || Number(b.priority_score || 0) - Number(a.priority_score || 0)
    || String(a.due_at || '9999').localeCompare(String(b.due_at || '9999'))
    || a.title.localeCompare(b.title, 'es');
}

function familyOrder(a: Task[], b: Task[]) {
  const aCritical = a.some((task) => task.severity === 'critical');
  const bCritical = b.some((task) => task.severity === 'critical');
  if (aCritical !== bCritical) return aCritical ? -1 : 1;
  return taskOrder([...a].sort(taskOrder)[0], [...b].sort(taskOrder)[0]);
}

function preferenceStorageKey(name: string | null | undefined, cargoName: string | null | undefined) {
  return `motil:actions-family-layout:${String(name || 'user')}:${String(cargoName || 'cargo')}`;
}

function matchesFilter(task: Task, filter: TaskFilter) {
  if (filter === 'critical') return task.severity === 'critical';
  if (filter === 'overdue') return task.urgency_state === 'overdue' || task.urgency_state === 'escalated';
  if (filter === 'owner') return task.responsibility === 'owner';
  return true;
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function matchesSearch(task: Task, query: string) {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;
  const haystack = normalizeSearch([
    task.task_key,
    task.title,
    task.evidence_summary || '',
    task.domain,
    task.cargo_name,
    task.responsibility_label,
    task.urgency_label,
    task.module_route,
    family(task),
  ].join(' '));
  return normalized.split(/\s+/).every((term) => haystack.includes(term));
}

export default function AccionesPage() {
  const inbox = useSWR<InboxPayload>('/api/actions/inbox', fetcher, { refreshInterval: 60000, revalidateOnFocus: false });
  const states = useSWR('/api/actions/state', fetcher, { revalidateOnFocus: false });
  const [familyPreferences, setFamilyPreferences] = useState<FamilyPreferences>({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const profileName = inbox.data?.profile?.name;
  const cargoName = inbox.data?.profile?.cargoName;

  useEffect(() => {
    if (!cargoName || typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(preferenceStorageKey(profileName, cargoName));
      setFamilyPreferences(saved ? JSON.parse(saved) as FamilyPreferences : {});
    } catch {
      setFamilyPreferences({});
    } finally {
      setPreferencesLoaded(true);
    }
  }, [profileName, cargoName]);

  function saveFamilyPreference(key: string, open: boolean) {
    setFamilyPreferences((current) => {
      const next = { ...current, [key]: open };
      if (typeof window !== 'undefined' && cargoName) {
        try {
          window.localStorage.setItem(preferenceStorageKey(profileName, cargoName), JSON.stringify(next));
        } catch {
          // UI preference persistence is optional and must never block the operational inbox.
        }
      }
      return next;
    });
  }

  const stateMap = new Map<string, StateRow>((states.data?.states || []).map((row: StateRow) => [row.source_key, row]));
  const now = Date.now();
  const tasks = (inbox.data?.tasks || []).filter((task) => {
    const state = stateMap.get(task.task_key);
    return !(state?.status === 'snoozed' && state.snoozed_until && new Date(state.snoozed_until).getTime() > now);
  });
  const filteredTasks = tasks.filter((task) => matchesFilter(task, taskFilter));
  const visibleTasks = filteredTasks.filter((task) => matchesSearch(task, searchQuery));

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
  const filterCounts = {
    all: tasks.length,
    critical: tasks.filter((task) => task.severity === 'critical').length,
    overdue: tasks.filter((task) => task.urgency_state === 'overdue' || task.urgency_state === 'escalated').length,
    owner: tasks.filter((task) => task.responsibility === 'owner').length,
  };
  const hasSearch = normalizeSearch(searchQuery).length > 0;

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{cargoName || 'Trabajo por cargo'}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mis acciones</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Sólo decisiones y tareas que corresponden a tu cargo, agrupadas por familia operacional. Busca por equipo, OT, incidente o evidencia y combina la búsqueda con los filtros rápidos.</p>
      </div>
      <Button variant="outline" onClick={() => { void inbox.mutate(); void states.mutate(); }}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Acciones propias</p><p className="mt-1 text-2xl font-semibold">{summary?.owners ?? 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Críticas</p><p className="mt-1 text-2xl font-semibold">{summary?.critical ?? 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vencidas</p><p className="mt-1 text-2xl font-semibold">{summary?.overdue ?? 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Escalaciones</p><p className="mt-1 text-2xl font-semibold">{summary?.escalations ?? 0}</p></CardContent></Card>
    </div>

    <div className="space-y-3">
      <div className="relative max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar equipo, OT, incidente, evidencia..."
          aria-label="Buscar acciones"
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-10 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {hasSearch ? <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="Filtros de acciones">
        {([
          ['all', 'Todas', filterCounts.all],
          ['critical', 'Críticas', filterCounts.critical],
          ['overdue', 'Vencidas', filterCounts.overdue],
          ['owner', 'Sólo propias', filterCounts.owner],
        ] as const).map(([value, label, count]) => <Button key={value} size="sm" variant={taskFilter === value ? 'default' : 'outline'} onClick={() => setTaskFilter(value)}>{label}<Badge variant="secondary" className="ml-2">{count}</Badge></Button>)}
        {(taskFilter !== 'all' || hasSearch) ? <span className="text-xs text-muted-foreground">Mostrando {visibleTasks.length} de {tasks.length} acciones visibles.</span> : null}
      </div>
    </div>

    {inbox.error || states.error ? <Card className="shadow-none"><CardContent className="p-8 text-center text-sm text-muted-foreground">No se pudo cargar la bandeja operacional.</CardContent></Card> : inbox.isLoading || states.isLoading ? <Card className="shadow-none"><CardContent className="p-8 text-sm text-muted-foreground">Cargando trabajo del cargo…</CardContent></Card> : tasks.length === 0 ? <Card className="shadow-none"><CardContent className="p-10 text-center"><CheckCircle2 className="mx-auto h-7 w-7" /><p className="mt-3 font-medium">Operación al día</p><p className="mt-1 text-sm text-muted-foreground">No tienes tareas ni escalaciones operacionales visibles en este momento.</p></CardContent></Card> : visibleTasks.length === 0 ? <Card className="shadow-none"><CardContent className="p-8 text-center"><p className="font-medium">Sin acciones para esta búsqueda</p><p className="mt-1 text-sm text-muted-foreground">Prueba otro término o vuelve al universo completo.</p><div className="mt-4 flex justify-center gap-2">{hasSearch ? <Button size="sm" variant="outline" onClick={() => setSearchQuery('')}>Limpiar búsqueda</Button> : null}{taskFilter !== 'all' ? <Button size="sm" variant="outline" onClick={() => setTaskFilter('all')}>Ver todas</Button> : null}</div></CardContent></Card> : <div className="space-y-5">
      {lanes.map((laneName) => {
        const laneTasks = visibleTasks.filter((task) => lane(task) === laneName);
        if (!laneTasks.length) return null;
        const Icon = laneName === 'Escalaciones' ? ShieldAlert : laneName === 'Apoyos' ? Users : laneName === 'Vencidas' ? Clock3 : Inbox;
        const families = Array.from(new Set(laneTasks.map(family)))
          .map((familyName) => ({ familyName, tasks: laneTasks.filter((task) => family(task) === familyName).sort(taskOrder) }))
          .sort((a, b) => familyOrder(a.tasks, b.tasks));
        return <Card key={laneName} className="shadow-none">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5" />{laneName}<Badge variant="secondary" className="ml-auto">{laneTasks.length}</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-3 border-t p-4">
            {families.map(({ familyName, tasks: familyTasks }) => {
              const criticalCount = familyTasks.filter((task) => task.severity === 'critical').length;
              const overdueCount = familyTasks.filter((task) => task.urgency_state === 'overdue' || task.urgency_state === 'escalated').length;
              const preferenceKey = `${laneName}:${familyName}`;
              const defaultOpen = hasSearch || criticalCount > 0;
              const isOpen = hasSearch ? true : preferencesLoaded && Object.hasOwn(familyPreferences, preferenceKey) ? familyPreferences[preferenceKey] : defaultOpen;
              return <details key={familyName} open={isOpen} onToggle={(event) => {
                if (!preferencesLoaded || hasSearch) return;
                saveFamilyPreference(preferenceKey, event.currentTarget.open);
              }} className="group overflow-hidden rounded-lg border bg-card">
                <summary className="flex cursor-pointer list-none items-center gap-2 bg-muted/20 px-4 py-3 marker:hidden hover:bg-muted/35">
                  <p className="text-sm font-medium">{familyName}</p>
                  <Badge variant="secondary">{familyTasks.length}</Badge>
                  {criticalCount > 0 ? <Badge variant="destructive">{criticalCount} crítica{criticalCount === 1 ? '' : 's'}</Badge> : null}
                  {criticalCount === 0 && overdueCount > 0 ? <Badge variant="outline">{overdueCount} vencida{overdueCount === 1 ? '' : 's'}</Badge> : null}
                  <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Ver casos</span>
                  <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Ocultar</span>
                </summary>
                <div className="divide-y border-t">
                  {familyTasks.map((task) => {
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
                  })}
                </div>
              </details>;
            })}
          </CardContent>
        </Card>;
      })}
    </div>}
  </div>;
}
