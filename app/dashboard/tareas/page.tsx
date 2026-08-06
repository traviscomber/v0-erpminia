'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { FilterToolbar, FilterToolbarActions, FilterToolbarContent } from '@/components/ui/filter-toolbar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TaskSource = 'maintenance' | 'compliance' | 'procurement';
type TaskItem = {
  id: string;
  source: TaskSource;
  source_label: string;
  kind: string;
  date: string;
  title: string;
  subtitle: string | null;
  reference: string | null;
  status: string;
  status_label: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  priority_label: string;
  owner: string | null;
  href: string;
  overdue: boolean;
  days_until: number;
};

type TasksResponse = {
  data: TaskItem[];
  summary: { overdue: number; today: number; next_7_days: number; total: number };
};

const fetcher = async (url: string): Promise<TasksResponse> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar las tasks');
  return payload;
};

function relativeLabel(days: number) {
  if (days < -1) return `Vencida hace ${Math.abs(days)} días`;
  if (days === -1) return 'Vencida ayer';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}

function priorityVariant(priority: TaskItem['priority']) {
  if (priority === 'critical') return 'destructive' as const;
  if (priority === 'high') return 'default' as const;
  return 'outline' as const;
}

export default function TareasPage() {
  const [view, setView] = useState<'all' | 'overdue' | 'today' | 'week'>('all');
  const [query, setQuery] = useState('');
  const { data, error, isLoading, mutate, isValidating } = useSWR<TasksResponse>(
    '/api/calendar/operational?days=90&scope=open',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60_000 },
  );

  const tasks = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es-CL');
    return (data?.data || []).filter((task) => {
      if (view === 'overdue' && !task.overdue) return false;
      if (view === 'today' && task.days_until !== 0) return false;
      if (view === 'week' && !(task.days_until >= 0 && task.days_until <= 7)) return false;
      if (!term) return true;
      return [task.title, task.subtitle, task.reference, task.owner, task.source_label]
        .some((value) => value?.toLocaleLowerCase('es-CL').includes(term));
    });
  }, [data?.data, query, view]);

  const summary = data?.summary || { overdue: 0, today: 0, next_7_days: 0, total: 0 };

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Gestión transversal</PageHeaderEyebrow>
          <PageHeaderTitle>Tasks</PageHeaderTitle>
          <PageHeaderDescription>
            Acciones abiertas de mantenimiento, cumplimiento y abastecimiento reunidas desde sus fuentes canónicas.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button asChild>
            <Link href="/dashboard/mantenimiento/ordenes-trabajo/create">Nueva OT</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <div className="grid divide-y rounded-lg border border-border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {[
          ['Abiertas', summary.total],
          ['Vencidas', summary.overdue],
          ['Para hoy', summary.today],
          ['Próximos 7 días', summary.next_7_days],
        ].map(([label, value]) => (
          <div key={String(label)} className="px-5 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <FilterToolbar>
        <FilterToolbarContent>
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar task, responsable o referencia" className="pl-9" />
          </div>
        </FilterToolbarContent>
        <FilterToolbarActions>
          <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="overdue">Vencidas</TabsTrigger>
              <TabsTrigger value="today">Hoy</TabsTrigger>
              <TabsTrigger value="week">7 días</TabsTrigger>
            </TabsList>
          </Tabs>
        </FilterToolbarActions>
      </FilterToolbar>

      {isLoading ? <StatePanel tone="loading" title="Cargando tasks" description="Consultando las fuentes operacionales." /> : null}
      {error ? (
        <StatePanel tone="error" title="No fue posible cargar las tasks" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} />
      ) : null}
      {!isLoading && !error && tasks.length === 0 ? (
        <StatePanel tone="neutral" icon={CheckCircle2} title="No hay tasks para este filtro" description="La vista no contiene acciones abiertas con los criterios seleccionados." />
      ) : null}

      {!isLoading && !error && tasks.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <article key={task.id} className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{task.source_label}</Badge>
                    <Badge variant="outline">{task.kind}</Badge>
                    <Badge variant={priorityVariant(task.priority)}>{task.priority_label}</Badge>
                    {task.overdue ? <Badge variant="destructive">Vencida</Badge> : null}
                  </div>
                  <h2 className="mt-2 text-sm font-semibold leading-6 text-foreground">{task.title}</h2>
                  {task.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.subtitle}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {task.reference ? <span>{task.reference}</span> : null}
                    {task.owner ? <span>{task.owner}</span> : null}
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{task.date}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 md:justify-end">
                  <span className={`text-xs font-medium ${task.overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {task.overdue ? <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> : null}
                    {relativeLabel(task.days_until)}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={task.href}>Abrir<ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
