'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  ListChecks,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CalendarSource = 'maintenance' | 'compliance' | 'procurement';
type CalendarPriority = 'critical' | 'high' | 'medium' | 'low';
type CalendarScope = 'active' | 'historical' | 'all';

type OperationalCalendarItem = {
  id: string;
  source: CalendarSource;
  source_label: string;
  kind: string;
  date: string;
  title: string;
  subtitle: string | null;
  reference: string | null;
  status: string;
  status_label: string;
  priority: CalendarPriority;
  priority_label: string;
  owner: string | null;
  location: string | null;
  href: string;
  historical: boolean;
  completed_at: string | null;
  overdue: boolean;
  days_until: number;
};

type CalendarResponse = {
  data: OperationalCalendarItem[];
  summary: {
    overdue: number;
    today: number;
    next_7_days: number;
    total: number;
    historical: number;
    by_source: Record<CalendarSource, number>;
  };
  warnings: string[];
  range: {
    today: string;
    start_date: string;
    end_date: string;
    future_days: number;
    scope: CalendarScope;
  };
};

const SOURCE_META: Record<CalendarSource, { label: string; icon: LucideIcon }> = {
  maintenance: { label: 'Mantenimiento', icon: Wrench },
  compliance: { label: 'Cumplimiento', icon: ShieldCheck },
  procurement: { label: 'Abastecimiento', icon: ShoppingCart },
};

const PRIORITY_CLASSES: Record<CalendarPriority, string> = {
  critical: 'border-destructive/40 bg-destructive/10 text-destructive',
  high: 'border-destructive/30 bg-destructive/5 text-destructive',
  medium: 'border-border bg-muted text-foreground',
  low: 'border-border bg-background text-muted-foreground',
};

const fetcher = async (url: string): Promise<CalendarResponse> => {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudo cargar el calendario operativo');
  }
  return payload as CalendarResponse;
};

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function formatDateHeading(value: string, today: string) {
  if (value === today) return 'Hoy';
  const date = new Date(`${value}T12:00:00`);
  return capitalize(date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }));
}

function formatCompactDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function relativeDateLabel(item: OperationalCalendarItem) {
  if (item.historical) {
    return item.completed_at
      ? `Completada el ${formatCompactDate(item.completed_at)}`
      : 'Registro histórico';
  }
  if (item.days_until < -1) return `Vencido hace ${Math.abs(item.days_until)} días`;
  if (item.days_until === -1) return 'Vencido ayer';
  if (item.days_until === 0) return 'Hoy';
  if (item.days_until === 1) return 'Mañana';
  return `En ${item.days_until} días`;
}

function statusClass(item: OperationalCalendarItem) {
  if (item.historical) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (['in_progress', 'partially_received'].includes(item.status.toLowerCase())) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }
  return 'border-border bg-background text-muted-foreground';
}

export default function CalendarioPage() {
  const [days, setDays] = useState('60');
  const [scope, setScope] = useState<CalendarScope>('active');
  const [source, setSource] = useState<'all' | CalendarSource>('all');
  const [search, setSearch] = useState('');

  const { data, error, isLoading, mutate, isValidating } = useSWR<CalendarResponse>(
    `/api/calendar/operational?days=${days}&scope=${scope}`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 60_000,
    },
  );

  const items = data?.data || [];
  const summary = data?.summary || {
    overdue: 0,
    today: 0,
    next_7_days: 0,
    total: 0,
    historical: 0,
    by_source: { maintenance: 0, compliance: 0, procurement: 0 },
  };

  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CL');
    return items.filter((item) => {
      if (source !== 'all' && item.source !== source) return false;
      if (!term) return true;
      return [item.title, item.subtitle, item.reference, item.owner, item.location, item.kind]
        .some((value) => value?.toLocaleLowerCase('es-CL').includes(term));
    });
  }, [items, search, source]);

  const groups = useMemo(() => {
    const map = new Map<string, OperationalCalendarItem[]>();
    filteredItems.forEach((item) => {
      map.set(item.date, [...(map.get(item.date) || []), item]);
    });
    return Array.from(map.entries());
  }, [filteredItems]);

  const metrics = scope === 'historical'
    ? [
        { label: 'Históricos', value: summary.historical, description: 'Últimos 12 meses', icon: History, className: 'text-foreground' },
        { label: 'Mantenimiento', value: summary.by_source.maintenance, description: 'OT y mantenimiento', icon: Wrench, className: 'text-foreground' },
        { label: 'Cumplimiento', value: summary.by_source.compliance, description: 'HSE y obligaciones', icon: ShieldCheck, className: 'text-foreground' },
        { label: 'Abastecimiento', value: summary.by_source.procurement, description: 'Compras y recepciones', icon: ShoppingCart, className: 'text-foreground' },
      ]
    : [
        { label: 'Vencidos', value: summary.overdue, description: 'Requieren revisión', icon: AlertTriangle, className: summary.overdue ? 'text-destructive' : 'text-muted-foreground' },
        { label: 'Hoy', value: summary.today, description: 'Acciones del día', icon: CalendarDays, className: 'text-foreground' },
        { label: 'Próximos 7 días', value: summary.next_7_days, description: 'Carga inmediata', icon: Clock3, className: 'text-foreground' },
        { label: scope === 'all' ? 'En calendario' : 'En agenda', value: summary.total, description: scope === 'all' ? `${summary.historical} históricos` : `Horizonte de ${days} días`, icon: ListChecks, className: 'text-foreground' },
      ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario operativo</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Agenda activa e historial de mantenimiento, cumplimiento y abastecimiento. Las modificaciones se realizan en el módulo de origen.
          </p>
        </div>
        <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="shadow-none">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                  <p className={`mt-2 text-3xl font-semibold ${metric.className}`}>{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
                </div>
                <Icon className={`h-5 w-5 ${metric.className}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-none">
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_210px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar evento, responsable o referencia" className="pl-9" />
          </div>
          <Select value={scope} onValueChange={(value) => setScope(value as CalendarScope)}>
            <SelectTrigger><SelectValue placeholder="Vista" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Pendientes</SelectItem>
              <SelectItem value="historical">Históricos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={(value) => setSource(value as 'all' | CalendarSource)}>
            <SelectTrigger><SelectValue placeholder="Todas las áreas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              <SelectItem value="maintenance">Mantenimiento ({summary.by_source.maintenance})</SelectItem>
              <SelectItem value="compliance">Cumplimiento ({summary.by_source.compliance})</SelectItem>
              <SelectItem value="procurement">Abastecimiento ({summary.by_source.procurement})</SelectItem>
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays} disabled={scope === 'historical'}>
            <SelectTrigger><SelectValue placeholder="Horizonte" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Próximos 30 días</SelectItem>
              <SelectItem value="60">Próximos 60 días</SelectItem>
              <SelectItem value="90">Próximos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {data?.warnings?.length ? (
        <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div><p className="font-medium">La agenda se cargó parcialmente.</p><p className="mt-1 text-muted-foreground">{data.warnings.join(' ')}</p></div>
        </div>
      ) : null}

      {isLoading ? (
        <Card className="shadow-none"><CardContent className="space-y-4 p-5">{[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-md bg-muted" />)}</CardContent></Card>
      ) : null}

      {error ? (
        <Card className="border-destructive/40 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div><p className="font-medium">No fue posible cargar el calendario.</p><p className="mt-1 text-sm text-muted-foreground">{error.message}</p></div>
            <Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error && groups.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <CheckCircle2 className="h-7 w-7 text-muted-foreground" />
            <div><p className="font-medium">No hay fechas para mostrar.</p><p className="mt-1 text-sm text-muted-foreground">Ajusta la vista, los filtros o el horizonte.</p></div>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error ? (
        <div className="space-y-7">
          {groups.map(([date, dateItems]) => (
            <section key={date} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{formatDateHeading(date, data?.range.today || '')}</h2>
                <Badge variant="secondary">{dateItems.length}</Badge>
              </div>
              <Card className="overflow-hidden shadow-none">
                <div className="divide-y">
                  {dateItems.map((item) => {
                    const SourceIcon = SOURCE_META[item.source].icon;
                    return (
                      <div key={item.id} className={`grid gap-4 p-4 md:grid-cols-[44px_minmax(0,1fr)_auto] md:items-center ${item.historical ? 'bg-muted/30' : ''}`}>
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted">
                          <SourceIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{SOURCE_META[item.source].label}</Badge>
                            <Badge variant="outline">{item.kind}</Badge>
                            <Badge variant="outline" className={PRIORITY_CLASSES[item.priority]}>{item.priority_label}</Badge>
                            <Badge variant="outline" className={statusClass(item)}>{item.status_label}</Badge>
                            {item.historical ? <Badge variant="secondary">Histórico</Badge> : null}
                          </div>
                          <h3 className="mt-2 font-medium leading-6">{item.title}</h3>
                          {item.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.subtitle}</p> : null}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {item.reference ? <span>{item.reference}</span> : null}
                            {item.owner ? <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{item.owner}</span> : null}
                            {item.location ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.location}</span> : null}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                          <p className={`text-xs font-medium ${item.overdue ? 'text-destructive' : 'text-muted-foreground'}`}>{relativeDateLabel(item)}</p>
                          <Button asChild variant="outline" size="sm">
                            <Link href={item.href}>Abrir<ArrowRight className="ml-2 h-4 w-4" /></Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          ))}
        </div>
      ) : null}

      <Card className="border-dashed shadow-none">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Agenda e historial en una sola vista</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          “Pendientes” concentra el trabajo activo. “Históricos” permite revisar OT y procesos terminados durante los últimos 12 meses. La edición continúa en cada módulo de origen.
        </CardContent>
      </Card>
    </div>
  );
}
