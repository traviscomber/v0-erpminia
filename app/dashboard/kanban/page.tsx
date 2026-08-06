'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, Clock3, GripVertical, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';

const columnOrder = ['backlog', 'ready', 'in_progress', 'waiting_material', 'waiting_approval', 'validation', 'completed'] as const;
type Column = (typeof columnOrder)[number];
type WorkCard = {
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
  data: WorkCard[];
  columns: Record<Column, number | null>;
  counts: Record<Column, number>;
  summary: { total: number; active: number; blocked: number; overdue: number };
  warnings?: string[];
};

const labels: Record<Column, string> = {
  backlog: 'Pendiente',
  ready: 'Listo para comenzar',
  in_progress: 'En curso',
  waiting_material: 'Esperando material',
  waiting_approval: 'Esperando aprobación',
  validation: 'Revisión final',
  completed: 'Completado',
};

const moveOptions: Record<WorkCard['source'], Column[]> = {
  maintenance: ['backlog', 'ready', 'in_progress', 'validation', 'completed'],
  compliance: ['ready', 'in_progress', 'completed'],
  procurement: [],
};

const fetcher = async (url: string): Promise<Response> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar el flujo de trabajo');
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

function priorityLabel(priority: string) {
  return ({ critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' } as Record<string, string>)[priority] || 'Media';
}

export default function WorkFlowPage() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'all' | WorkCard['source']>('all');
  const [moving, setMoving] = useState<string | null>(null);
  const [dragged, setDragged] = useState<WorkCard | null>(null);
  const [moveError, setMoveError] = useState('');
  const { data, error, isLoading, isValidating, mutate } = useSWR<Response>(
    '/api/lean/kanban',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60_000 },
  );

  const cards = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es-CL');
    return (data?.data || []).filter((card) => {
      if (source !== 'all' && card.source !== source) return false;
      if (!term) return true;
      return [card.reference, card.title, card.subtitle, card.owner, card.sourceLabel]
        .some((value) => value?.toLocaleLowerCase('es-CL').includes(term));
    });
  }, [data?.data, query, source]);

  const moveCard = async (card: WorkCard, column: Column) => {
    if (!card.movable || card.column === column || !moveOptions[card.source].includes(column)) return;
    setMoving(card.id);
    setMoveError('');
    try {
      const response = await fetch('/api/lean/kanban', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: card.source, sourceId: card.sourceId, column }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible actualizar el trabajo');
      await mutate();
    } catch (updateError) {
      setMoveError(updateError instanceof Error ? updateError.message : 'No fue posible actualizar el trabajo');
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
          <PageHeaderEyebrow>Control y mejora</PageHeaderEyebrow>
          <PageHeaderTitle>Flujo de trabajo</PageHeaderTitle>
          <PageHeaderDescription>
            Trabajo de mantenimiento, seguridad y abastecimiento ordenado por estado, responsable y antigüedad.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />Actualizar
          </Button>
          <Button asChild><Link href="/dashboard/daily-management">Revisión diaria</Link></Button>
        </PageHeaderActions>
      </PageHeader>

      <section className="grid divide-y overflow-hidden rounded-lg border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {[
          ['En curso', summary.active],
          ['Bloqueados', summary.blocked],
          ['Vencidos', summary.overdue],
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
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar orden, responsable o referencia" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'Todas'],
            ['maintenance', 'Mantenimiento'],
            ['compliance', 'Seguridad'],
            ['procurement', 'Abastecimiento'],
          ].map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={source === value ? 'default' : 'outline'}
              onClick={() => setSource(value as typeof source)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {moveError ? <StatePanel tone="error" title="No fue posible actualizar el trabajo" description={moveError} className="min-h-0 py-5" /> : null}
      {data?.warnings?.length ? (
        <StatePanel tone="warning" title="Parte de la información no está disponible" description={data.warnings.join(' ')} className="min-h-0 py-5" />
      ) : null}
      {isLoading ? <StatePanel tone="loading" title="Cargando el flujo de trabajo" description="Revisando el trabajo de las áreas conectadas." /> : null}
      {error ? (
        <StatePanel
          tone="error"
          title="No fue posible cargar el flujo de trabajo"
          description={error.message}
          actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
        />
      ) : null}

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
                  onDragOver={(event) => {
                    if (acceptsDrop && dragged?.movable && moveOptions[dragged.source].includes(column)) event.preventDefault();
                  }}
                  onDrop={() => {
                    if (dragged && acceptsDrop) void moveCard(dragged, column);
                  }}
                >
                  <header className="sticky top-14 z-10 flex items-center justify-between gap-3 border-b bg-background/95 px-3 py-3 backdrop-blur">
                    <div>
                      <h2 className="text-sm font-semibold">{labels[column]}</h2>
                      <p className={`mt-0.5 text-xs ${exceeded ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {columnCards.length}{limit !== null ? ` / ${limit}` : ''}
                      </p>
                    </div>
                    {exceeded ? <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Límite de trabajo superado" /> : null}
                  </header>

                  <div className="space-y-2 p-2">
                    {columnCards.length === 0 ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">Sin trabajo</p> : null}
                    {columnCards.map((card) => {
                      const availableOptions = Array.from(new Set([card.column, ...moveOptions[card.source]]));
                      return (
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
                                <Badge variant={priorityVariant(card.priority)}>{priorityLabel(card.priority)}</Badge>
                              </div>
                              <p className="mt-2 text-xs font-medium text-muted-foreground">{card.reference}</p>
                              <h3 className="mt-1 text-sm font-semibold leading-5">{card.title}</h3>
                              {card.subtitle ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{card.subtitle}</p> : null}
                              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{card.owner || 'Sin responsable'}</span>
                                <span className={`inline-flex shrink-0 items-center gap-1 ${card.ageHours >= 168 ? 'text-destructive' : ''}`}>
                                  <Clock3 className="h-3.5 w-3.5" />{ageLabel(card.ageHours)}
                                </span>
                              </div>

                              {card.movable ? (
                                <Select
                                  value={card.column}
                                  disabled={moving === card.id}
                                  onValueChange={(value) => void moveCard(card, value as Column)}
                                >
                                  <SelectTrigger size="sm" className="mt-3 w-full" aria-label={`Cambiar estado de ${card.reference}`}>
                                    <SelectValue placeholder="Cambiar estado" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableOptions.map((option) => (
                                      <SelectItem
                                        key={option}
                                        value={option}
                                        disabled={option === card.column || !moveOptions[card.source].includes(option)}
                                      >
                                        {labels[option]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <p className="mt-3 text-xs text-muted-foreground">Actualizar desde Compras</p>
                              )}

                              <Button asChild variant="ghost" size="sm" className="mt-2 w-full justify-between px-2">
                                <Link href={card.href}>Abrir registro<ArrowRight className="h-4 w-4" /></Link>
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
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
