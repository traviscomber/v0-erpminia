'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, Clock3, GripVertical, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

const columnOrder = ['backlog', 'ready', 'in_progress', 'waiting_material', 'waiting_approval', 'validation', 'completed'] as const;
type Column = (typeof columnOrder)[number];
type Card = {
  id: string;
  source: 'maintenance' | 'compliance' | 'procurement';
  sourceLabel: string;
  sourceId: string;
  reference: string;
  title: string;
  subtitle: string | null;
  owner: string | null;
  priority: string;
  column: Column;
  updatedAt: string;
  ageHours: number;
  dueDate: string | null;
  href: string;
  movable: boolean;
};
type Response = {
  data: Card[];
  columns: Record<Column, number | null>;
  counts: Record<Column, number>;
  summary: { total: number; active: number; blocked: number; overdue: number };
  warnings?: string[];
};

const labels: Record<Column, string> = {
  backlog: 'Backlog',
  ready: 'Listo',
  in_progress: 'En ejecución',
  waiting_material: 'Esperando repuesto',
  waiting_approval: 'Esperando aprobación',
  validation: 'Validación',
  completed: 'Completado',
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el Kanban');
  return payload;
};

function ageLabel(hours: number) {
  if (hours < 1) return 'Ahora';
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

function priorityVariant(priority: string) {
  if (priority === 'critical') return 'destructive' as const;
  if (priority === 'high') return 'default' as const;
  return 'outline' as const;
}

export default function KanbanPage() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'all' | Card['source']>('all');
  const [moving, setMoving] = useState<string | null>(null);
  const [dragged, setDragged] = useState<Card | null>(null);
  const { data, error, isLoading, isValidating, mutate } = useSWR<Response>('/api/lean/kanban', fetcher, { revalidateOnFocus: false, refreshInterval: 60_000 });

  const cards = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es-CL');
    return (data?.data || []).filter((card) => {
      if (source !== 'all' && card.source !== source) return false;
      if (!term) return true;
      return [card.reference, card.title, card.subtitle, card.owner, card.sourceLabel]
        .some((value) => value?.toLocaleLowerCase('es-CL').includes(term));
    });
  }, [data?.data, query, source]);

  const moveCard = async (card: Card, column: Column) => {
    if (!card.movable || card.column === column || ['waiting_material', 'waiting_approval'].includes(column)) return;
    setMoving(card.id);
    try {
      const response = await fetch('/api/lean/kanban', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: card.source, sourceId: card.sourceId, column }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible mover la tarjeta');
      await mutate();
    } finally {
      setMoving(null);
      setDragged(null);
    }
  };

  const summary = data?.summary || { total: 0, active: 0, blocked: 0, overdue: 0 };

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Lean · Flujo de trabajo</PageHeaderEyebrow>
          <PageHeaderTitle>Kanban operacional</PageHeaderTitle>
          <PageHeaderDescription>
            Trabajo real de mantenimiento, HSE y abastecimiento, sin duplicar registros ni perder trazabilidad.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />Actualizar
          </Button>
          <Button asChild><Link href="/dashboard/daily-management">Daily Management</Link></Button>
        </PageHeaderActions>
      </PageHeader>

      <section className="grid divide-y overflow-hidden rounded-lg border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {[
          ['Activas', summary.active],
          ['Bloqueadas', summary.blocked],
          ['Vencidas', summary.overdue],
          ['Total visible', summary.total],
        ].map(([label, value]) => (
          <div key={String(label)} className="px-5 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OT, responsable o referencia" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'Todas'],
            ['maintenance', 'Mantenimiento'],
            ['compliance', 'HSE'],
            ['procurement', 'Abastecimiento'],
          ].map(([value, label]) => (
            <Button key={value} type="button" size="sm" variant={source === value ? 'default' : 'outline'} onClick={() => setSource(value as typeof source)}>{label}</Button>
          ))}
        </div>
      </div>

      {data?.warnings?.length ? (
        <StatePanel tone="warning" title="Fuentes parciales" description={data.warnings.join(' ')} className="min-h-0 py-5" />
      ) : null}
      {isLoading ? <StatePanel tone="loading" title="Cargando flujo Kanban" description="Consultando las fuentes operacionales." /> : null}
      {error ? <StatePanel tone="error" title="No fue posible cargar el Kanban" description={error.message} actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>} /> : null}

      {!isLoading && !error ? (
        <div className="overflow-x-auto pb-3">
          <div className="grid min-w-[1960px] grid-cols-7 gap-3">
            {columnOrder.map((column) => {
              const columnCards = cards.filter((card) => card.column === column);
              const limit = data?.columns[column] ?? null;
              const exceeded = limit !== null && columnCards.length > limit;
              const acceptsDrop = !['waiting_material', 'waiting_approval'].includes(column);
              return (
                <section
                  key={column}
                  className={`min-h-[560px] rounded-lg border bg-muted/20 ${exceeded ? 'border-destructive/60' : 'border-border'}`}
                  onDragOver={(event) => { if (acceptsDrop && dragged?.movable) event.preventDefault(); }}
                  onDrop={() => { if (dragged && acceptsDrop) void moveCard(dragged, column); }}
                >
                  <header className="sticky top-14 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-3 py-3 backdrop-blur">
                    <div>
                      <h2 className="text-sm font-semibold">{labels[column]}</h2>
                      <p className={`mt-0.5 text-xs ${exceeded ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {columnCards.length}{limit !== null ? ` / ${limit}` : ''}
                      </p>
                    </div>
                    {exceeded ? <AlertTriangle className="h-4 w-4 text-destructive" /> : null}
                  </header>

                  <div className="space-y-2 p-2">
                    {columnCards.length === 0 ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">Sin trabajo</p> : null}
                    {columnCards.map((card) => (
                      <article
                        key={card.id}
                        draggable={card.movable}
                        onDragStart={() => setDragged(card)}
                        onDragEnd={() => setDragged(null)}
                        className={`rounded-md border bg-card p-3 shadow-none transition-colors hover:border-primary/35 ${moving === card.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className={`mt-0.5 h-4 w-4 shrink-0 ${card.movable ? 'cursor-grab text-muted-foreground' : 'text-muted-foreground/30'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline">{card.sourceLabel}</Badge>
                              <Badge variant={priorityVariant(card.priority)}>{card.priority}</Badge>
                            </div>
                            <p className="mt-2 text-xs font-medium text-muted-foreground">{card.reference}</p>
                            <h3 className="mt-1 text-sm font-semibold leading-5">{card.title}</h3>
                            {card.subtitle ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{card.subtitle}</p> : null}
                            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span className="truncate">{card.owner || 'Sin responsable'}</span>
                              <span className={`inline-flex shrink-0 items-center gap-1 ${card.ageHours >= 168 ? 'text-destructive' : ''}`}><Clock3 className="h-3.5 w-3.5" />{ageLabel(card.ageHours)}</span>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="mt-2 w-full justify-between px-2">
                              <Link href={card.href}>Abrir fuente<ArrowRight className="h-4 w-4" /></Link>
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
