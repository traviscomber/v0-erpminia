'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, CalendarClock, RefreshCw, Search, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PreventiveSummary = {
  total?: number | string;
  enabled?: number | string;
  overdue?: number | string;
  dueSoon?: number | string;
};

type PreventiveSchedule = {
  id: string;
  assetId?: string | null;
  assetName?: string | null;
  assetCode?: string | null;
  assetType?: string | null;
  location?: string | null;
  taskName?: string | null;
  description?: string | null;
  priority?: string | null;
  daysUntil?: number | null;
  frequencyDays?: number | string | null;
  frequencyHours?: number | string | null;
  estimatedDurationHours?: number | string | null;
  nextScheduledDate?: string | null;
  enabled?: boolean;
};

type PreventivePlanResponse = {
  summary?: PreventiveSummary;
  schedules?: PreventiveSchedule[];
};

const fetcher = async (url: string): Promise<PreventivePlanResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la planificación preventiva');
  return payload || {};
};

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function priorityLabel(priority?: string | null) {
  const labels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };
  return labels[normalizeText(priority)] || priority || 'Media';
}

function daysLabel(daysUntil?: number | null) {
  if (daysUntil === null || daysUntil === undefined) return 'Sin fecha';
  if (daysUntil < 0) return `Vencida hace ${Math.abs(daysUntil)} días`;
  if (daysUntil === 0) return 'Vence hoy';
  if (daysUntil === 1) return 'Vence mañana';
  return `En ${daysUntil} días`;
}

function bucketKey(daysUntil?: number | null) {
  if (daysUntil === null || daysUntil === undefined) return 'sin_fecha';
  if (daysUntil < 0) return 'vencidas';
  if (daysUntil === 0) return 'hoy';
  if (daysUntil <= 30) return 'proximos_30';
  if (daysUntil <= 90) return 'proximos_90';
  return 'futuro';
}

function bucketLabel(bucket: string) {
  const labels: Record<string, string> = {
    vencidas: 'Vencidas',
    hoy: 'Hoy',
    proximos_30: 'Próximos 30 días',
    proximos_90: 'Próximos 90 días',
    futuro: 'Plan futuro',
    sin_fecha: 'Sin fecha',
  };
  return labels[bucket] || bucket;
}

function buildWorkOrderHref(schedule: PreventiveSchedule) {
  const params = new URLSearchParams();
  if (schedule.assetId) params.set('assetId', schedule.assetId);
  if (schedule.taskName) params.set('title', schedule.taskName);
  if (schedule.description) params.set('description', schedule.description);
  params.set('workType', 'preventive');
  if (schedule.priority) params.set('priority', String(schedule.priority));
  if (schedule.nextScheduledDate) params.set('scheduledDate', schedule.nextScheduledDate);
  if (schedule.estimatedDurationHours !== null && schedule.estimatedDurationHours !== undefined) {
    params.set('plannedDurationHours', String(schedule.estimatedDurationHours));
  }
  return `/dashboard/mantenimiento/ordenes-trabajo/create?${params.toString()}`;
}

export function PreventivePlanBoard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [bucketFilter, setBucketFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const { data, error, isLoading, mutate } = useSWR<PreventivePlanResponse>('/api/maintenance/preventive?days=365', fetcher);

  const schedules = Array.isArray(data?.schedules) ? data.schedules : [];
  const summary = data?.summary || { total: 0, enabled: 0, overdue: 0, dueSoon: 0 };

  const filteredSchedules = useMemo(() => {
    const query = normalizeText(searchTerm);
    return schedules.filter((schedule) => {
      const searchable = [
        schedule.assetName,
        schedule.assetCode,
        schedule.assetType,
        schedule.location,
        schedule.taskName,
        schedule.description,
        schedule.priority,
      ].some((value) => normalizeText(value).includes(query));
      const matchesBucket = bucketFilter === 'all' || bucketKey(schedule.daysUntil) === bucketFilter;
      const matchesPriority = priorityFilter === 'all' || normalizeText(schedule.priority) === priorityFilter;
      return (!query || searchable) && matchesBucket && matchesPriority;
    });
  }, [bucketFilter, priorityFilter, schedules, searchTerm]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PreventiveSchedule[]>();
    filteredSchedules.forEach((schedule) => {
      const key = bucketKey(schedule.daysUntil);
      const rows = groups.get(key) || [];
      rows.push(schedule);
      groups.set(key, rows);
    });
    groups.forEach((rows) => rows.sort((a, b) => (a.daysUntil ?? 99999) - (b.daysUntil ?? 99999)));
    return groups;
  }, [filteredSchedules]);

  const orderedBuckets = ['vencidas', 'hoy', 'proximos_30', 'proximos_90', 'futuro', 'sin_fecha'];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Operación diaria</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Planificación preventiva</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Prioriza mantenimientos vencidos, próximos y futuros usando la programación existente de los activos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void mutate()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/planificacion/importar">
              <Upload className="mr-2 h-4 w-4" /> Importar
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/mantenimiento/ordenes-trabajo/create?workType=preventive">
              <CalendarClock className="mr-2 h-4 w-4" /> Nueva OT preventiva
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Programadas</p><p className="mt-1 text-2xl font-semibold">{Number(summary.total || 0)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Activas</p><p className="mt-1 text-2xl font-semibold">{Number(summary.enabled || 0)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vencidas</p><p className="mt-1 text-2xl font-semibold text-destructive">{Number(summary.overdue || 0)}</p></CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Próximos 30 días</p><p className="mt-1 text-2xl font-semibold">{Number(summary.dueSoon || 0)}</p></CardContent></Card>
      </div>

      <Card className="shadow-none">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_190px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar equipo, tarea o ubicación" className="pl-9" />
            </div>
            <Select value={bucketFilter} onValueChange={setBucketFilter}>
              <SelectTrigger><SelectValue placeholder="Horizonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los horizontes</SelectItem>
                {orderedBuckets.map((bucket) => <SelectItem key={bucket} value={bucket}>{bucketLabel(bucket)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => { setSearchTerm(''); setBucketFilter('all'); setPriorityFilter('all'); }}>Limpiar</Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-destructive" />
          <p className="mt-3 font-medium text-destructive">No se pudo cargar la planificación preventiva</p>
          <Button className="mt-4" variant="outline" onClick={() => void mutate()}>Reintentar</Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : filteredSchedules.length === 0 ? (
        <Card className="border-dashed shadow-none"><CardContent className="p-10 text-center text-sm text-muted-foreground">No hay mantenimientos que coincidan con los filtros.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {orderedBuckets.filter((bucket) => grouped.get(bucket)?.length).map((bucket) => {
            const rows = grouped.get(bucket) || [];
            return (
              <Card key={bucket} className="shadow-none">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-base">{bucketLabel(bucket)}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{rows.length} mantenimientos</p>
                  </div>
                  {bucket === 'vencidas' && <Badge variant="destructive">Atención requerida</Badge>}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y border-t">
                    {rows.map((schedule) => (
                      <div key={schedule.id} className="grid gap-4 p-4 transition-colors hover:bg-muted/30 lg:grid-cols-[minmax(0,1.5fr)_minmax(180px,.8fr)_minmax(150px,.6fr)_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{priorityLabel(schedule.priority)}</Badge>
                            {!schedule.enabled && <Badge variant="secondary">Deshabilitada</Badge>}
                          </div>
                          <p className="mt-2 truncate font-medium">{schedule.taskName || 'Tarea preventiva sin nombre'}</p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {schedule.assetName || 'Sin activo'}{schedule.assetCode ? ` · ${schedule.assetCode}` : ''}{schedule.location ? ` · ${schedule.location}` : ''}
                          </p>
                          {schedule.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{schedule.description}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Frecuencia</p>
                          <p className="mt-1 text-sm">
                            {schedule.frequencyDays ? `Cada ${schedule.frequencyDays} días` : schedule.frequencyHours ? `Cada ${schedule.frequencyHours} horas` : 'Sin frecuencia'}
                          </p>
                          {schedule.estimatedDurationHours ? <p className="text-xs text-muted-foreground">Duración: {schedule.estimatedDurationHours} h</p> : null}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Próxima fecha</p>
                          <p className={`mt-1 text-sm font-medium ${bucket === 'vencidas' ? 'text-destructive' : ''}`}>{daysLabel(schedule.daysUntil)}</p>
                          <p className="text-xs text-muted-foreground">{schedule.nextScheduledDate || 'Sin fecha'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {schedule.assetId && (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/dashboard/mantenimiento/equipos/${schedule.assetId}/ficha`}>Ver activo</Link>
                            </Button>
                          )}
                          <Button asChild size="sm">
                            <Link href={buildWorkOrderHref(schedule)}>Crear OT <ArrowRight className="ml-2 h-4 w-4" /></Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
