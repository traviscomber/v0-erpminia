'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
type CalendarDensity = 'comfortable' | 'compact';

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

const SOURCE_META: Record<CalendarSource, { label: string; icon: LucideIcon; bar: string }> = {
  maintenance: {
    label: 'Mantenimiento',
    icon: Wrench,
    bar: 'border-orange-500/60 bg-orange-500/20 text-orange-50',
  },
  compliance: {
    label: 'Cumplimiento',
    icon: ShieldCheck,
    bar: 'border-cyan-500/60 bg-cyan-500/20 text-cyan-50',
  },
  procurement: {
    label: 'Abastecimiento',
    icon: ShoppingCart,
    bar: 'border-violet-500/60 bg-violet-500/20 text-violet-50',
  },
};

const fetcher = async (url: string): Promise<CalendarResponse> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el calendario operativo');
  return payload as CalendarResponse;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function diffDays(from: string, to: string) {
  const a = new Date(`${from}T12:00:00Z`).getTime();
  const b = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function buildDates(start: string, end: string) {
  const total = Math.max(0, diffDays(start, end));
  return Array.from({ length: total + 1 }, (_, index) => addDays(start, index));
}

function formatMonth(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('es-CL', {
    month: 'short',
    year: 'numeric',
  });
}

function formatCompletion(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CalendarioPage() {
  const [scope, setScope] = useState<CalendarScope>('all');
  const [source, setSource] = useState<'all' | CalendarSource>('all');
  const [density, setDensity] = useState<CalendarDensity>('comfortable');
  const [search, setSearch] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null);

  const dayWidth = density === 'comfortable' ? 82 : 58;
  const labelWidth = density === 'comfortable' ? 380 : 310;
  const rowHeight = density === 'comfortable' ? 92 : 72;
  const headerHeight = density === 'comfortable' ? 92 : 80;
  const barHeight = density === 'comfortable' ? 58 : 44;

  const { data, error, isLoading, isValidating, mutate } = useSWR<CalendarResponse>(
    `/api/calendar/operational?days=120&scope=${scope}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60_000 },
  );

  const today = data?.range.today || toDateKey(new Date());
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
      return [item.title, item.reference, item.owner, item.kind, item.location]
        .some((value) => value?.toLocaleLowerCase('es-CL').includes(term));
    });
  }, [items, search, source]);

  const range = useMemo(() => {
    const historicalStart = filteredItems
      .filter((item) => item.historical)
      .map((item) => item.date)
      .sort()[0];
    const activeEnd = filteredItems
      .filter((item) => !item.historical)
      .map((item) => item.date)
      .sort()
      .at(-1);

    return {
      start: scope === 'active' ? addDays(today, -30) : historicalStart || addDays(today, -365),
      end: scope === 'historical' ? today : activeEnd || addDays(today, 120),
    };
  }, [filteredItems, scope, today]);

  const dates = useMemo(() => buildDates(range.start, range.end), [range.end, range.start]);
  const todayIndex = Math.max(0, dates.indexOf(today));
  const totalWidth = labelWidth + dates.length * dayWidth;

  const scrollToToday = () => {
    const container = timelineRef.current;
    if (!container) return;
    container.scrollTo({
      left: Math.max(0, labelWidth + todayIndex * dayWidth - container.clientWidth * 0.45),
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (!isLoading && dates.length) {
      const timer = window.setTimeout(scrollToToday, 80);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isLoading, scope, dates.length, density]);

  const shiftTimeline = (days: number) => {
    timelineRef.current?.scrollBy({ left: days * dayWidth, behavior: 'smooth' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario operativo continuo</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Línea de tiempo horizontal de OT, cumplimiento y abastecimiento. La vista cómoda prioriza lectura; la compacta permite revisar más registros.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => shiftTimeline(-14)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> 2 semanas
          </Button>
          <Button variant="outline" size="sm" onClick={scrollToToday}>
            <CalendarDays className="mr-1 h-4 w-4" /> Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => shiftTimeline(14)}>
            2 semanas <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
            <RefreshCw className={`mr-1 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_210px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar OT, evento, responsable o referencia"
            className="pl-9"
          />
        </div>
        <Select value={scope} onValueChange={(value) => setScope(value as CalendarScope)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Pendientes</SelectItem>
            <SelectItem value="historical">Históricos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(value) => setSource(value as 'all' | CalendarSource)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            <SelectItem value="maintenance">Mantenimiento ({summary.by_source.maintenance})</SelectItem>
            <SelectItem value="compliance">Cumplimiento ({summary.by_source.compliance})</SelectItem>
            <SelectItem value="procurement">Abastecimiento ({summary.by_source.procurement})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={density} onValueChange={(value) => setDensity(value as CalendarDensity)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="comfortable">Vista cómoda</SelectItem>
            <SelectItem value="compact">Vista compacta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">{summary.total} registros</Badge>
        <Badge variant="outline" className="border-destructive/40 text-destructive">{summary.overdue} vencidos</Badge>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
          <History className="mr-1 h-3 w-3" />{summary.historical} históricos
        </Badge>
        <Badge variant="outline">{summary.today} hoy</Badge>
      </div>

      {data?.warnings?.length ? (
        <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{data.warnings.join(' ')}</span>
        </div>
      ) : null}

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">{error.message}</CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden shadow-none">
        <div ref={timelineRef} className="max-h-[72vh] overflow-auto bg-card">
          <div className="relative" style={{ width: totalWidth, minWidth: '100%' }}>
            <div
              className="sticky top-0 z-30 flex border-b bg-card/95 backdrop-blur"
              style={{ height: headerHeight }}
            >
              <div
                className="sticky left-0 z-40 flex shrink-0 items-end border-r bg-card px-5 pb-4"
                style={{ width: labelWidth }}
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Actividad</p>
                  <p className="mt-1 text-base font-semibold">{filteredItems.length} filas visibles</p>
                </div>
              </div>
              <div className="relative flex" style={{ width: dates.length * dayWidth }}>
                {dates.map((dateKey, index) => {
                  const date = new Date(`${dateKey}T12:00:00`);
                  const isToday = dateKey === today;
                  const isWeekend = [0, 6].includes(date.getDay());
                  const monthStart = index === 0 || dateKey.slice(0, 7) !== dates[index - 1].slice(0, 7);
                  return (
                    <div
                      key={dateKey}
                      className={`relative shrink-0 border-r px-1 pb-3 pt-2 text-center ${isWeekend ? 'bg-muted/30' : ''} ${isToday ? 'bg-orange-500/10' : ''}`}
                      style={{ width: dayWidth }}
                    >
                      {monthStart ? (
                        <span className="absolute left-2 top-2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {formatMonth(dateKey)}
                        </span>
                      ) : null}
                      <div className="mt-6 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {date.toLocaleDateString('es-CL', { weekday: 'short' }).slice(0, 2)}
                      </div>
                      <div className={`mt-1 text-base font-semibold ${isToday ? 'text-orange-500' : ''}`}>{date.getDate()}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : null}

            {!isLoading && filteredItems.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No hay registros para los filtros seleccionados.
              </div>
            ) : null}

            {!isLoading ? filteredItems.map((item) => {
              const SourceIcon = SOURCE_META[item.source].icon;
              const startIndex = Math.max(0, diffDays(range.start, item.date));
              const completionKey = item.completed_at?.slice(0, 10);
              const duration = item.historical && completionKey
                ? Math.max(1, diffDays(item.date, completionKey) + 1)
                : 1;
              const width = Math.max(dayWidth - 12, duration * dayWidth - 12);
              const left = labelWidth + startIndex * dayWidth + 6;
              const historicalClass = item.historical ? 'opacity-75 saturate-50' : '';

              return (
                <div key={item.id} className="relative border-b" style={{ width: totalWidth, height: rowHeight }}>
                  <div className="absolute inset-y-0 flex" style={{ left: labelWidth, width: dates.length * dayWidth }}>
                    {dates.map((dateKey) => {
                      const date = new Date(`${dateKey}T12:00:00`);
                      const isWeekend = [0, 6].includes(date.getDay());
                      const isToday = dateKey === today;
                      return (
                        <div
                          key={dateKey}
                          className={`h-full shrink-0 border-r ${isWeekend ? 'bg-muted/20' : ''} ${isToday ? 'bg-orange-500/5' : ''}`}
                          style={{ width: dayWidth }}
                        />
                      );
                    })}
                  </div>

                  <div
                    className="sticky left-0 z-20 flex h-full items-center gap-4 border-r bg-card px-5"
                    style={{ width: labelWidth }}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted/70">
                      <SourceIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className={`${density === 'comfortable' ? 'line-clamp-2 text-[15px] leading-5' : 'truncate text-sm'} font-medium`}>
                          {item.title}
                        </p>
                        {item.historical ? <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {item.reference || item.kind}{item.owner ? ` · ${item.owner}` : ''}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={item.href}
                    title={`${item.title} · ${item.status_label}`}
                    className={`absolute z-10 flex items-center overflow-hidden rounded-lg border px-3 text-xs shadow-sm transition hover:z-20 hover:brightness-125 ${SOURCE_META[item.source].bar} ${historicalClass}`}
                    style={{
                      left,
                      width,
                      height: barHeight,
                      top: (rowHeight - barHeight) / 2,
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.reference || item.kind}</p>
                      <p className="mt-1 truncate opacity-80">
                        {item.historical && completionKey ? `Completada ${formatCompletion(completionKey)}` : item.status_label}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            }) : null}

            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10 border-l-2 border-orange-500/70"
              style={{ left: labelWidth + todayIndex * dayWidth + dayWidth / 2 }}
            />
          </div>
        </div>
      </Card>

      <p className="text-xs leading-5 text-muted-foreground">
        Vista de solo lectura. Usa “Vista cómoda” para operación diaria y “Vista compacta” para revisar mayor volumen; cada barra abre el registro original.
      </p>
    </div>
  );
}
