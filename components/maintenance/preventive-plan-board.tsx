'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, CalendarClock, Filter, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface PreventiveSummary {
  total?: number | string;
  enabled?: number | string;
  overdue?: number | string;
  dueSoon?: number | string;
}

interface PreventiveSchedule {
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
}

interface PreventivePlanResponse {
  summary?: PreventiveSummary;
  schedules?: PreventiveSchedule[];
}

const fetcher = async (url: string): Promise<PreventivePlanResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
};

function priorityLabel(priority?: string | null) {
  const labels: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Critica',
  };
  return labels[String(priority || '').toLowerCase()] || priority || 'Media';
}

function daysLabel(daysUntil?: number | null) {
  if (daysUntil === null || daysUntil === undefined) return 'Sin fecha';
  if (daysUntil < 0) return `Vencida hace ${Math.abs(daysUntil)} dias`;
  if (daysUntil === 0) return 'Vence hoy';
  if (daysUntil === 1) return 'Vence manana';
  return `En ${daysUntil} dias`;
}

function bucketLabel(daysUntil?: number | null) {
  if (daysUntil === null || daysUntil === undefined) return 'Sin fecha';
  if (daysUntil < 0) return 'Vencidas';
  if (daysUntil <= 30) return 'Proximas 30 dias';
  if (daysUntil <= 90) return 'Proximos 3 meses';
  return 'Resto del ano';
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
  return `/dashboard/work-orders/create?${params.toString()}`;
}

export function PreventivePlanBoard() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading, mutate } = useSWR<PreventivePlanResponse>('/api/maintenance/preventive?days=365', fetcher);

  const schedules: PreventiveSchedule[] = Array.isArray(data?.schedules) ? data.schedules : [];
  const filteredSchedules = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return schedules;

    return schedules.filter((schedule) => {
      const searchable = [
        schedule.assetName,
        schedule.assetCode,
        schedule.assetType,
        schedule.location,
        schedule.taskName,
        schedule.description,
        schedule.priority,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return searchable.includes(query);
    });
  }, [schedules, searchTerm]);

  const summary: PreventiveSummary = data?.summary || { total: 0, enabled: 0, overdue: 0, dueSoon: 0 };

  const grouped = useMemo(() => {
    const groups: Record<string, PreventiveSchedule[]> = {};
    filteredSchedules.forEach((schedule) => {
      const bucket = bucketLabel(schedule.daysUntil);
      groups[bucket] = groups[bucket] || [];
      groups[bucket].push(schedule);
    });
    return groups;
  }, [filteredSchedules]);

  const orderedBuckets = ['Vencidas', 'Proximas 30 dias', 'Proximos 3 meses', 'Resto del ano', 'Sin fecha'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planificacion preventiva</h1>
          <p className="mt-2 text-muted-foreground">
            Vista de los mantenimientos programados para los proximos 12 meses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void mutate()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recargar planificacion
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/vehiculos">
              Ver vehiculos
              <CalendarClock className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/planificacion/importar">
              Importar Excel
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/mantenimiento/bitacora">
              <CalendarClock className="h-4 w-4" />
              Ver bitacora
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Programadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.enabled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Proximas 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{summary.dueSoon}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acceso rapido a mantenimiento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/gerencial">
              Dashboard gerencial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/bitacora">
              Bitacora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/costos">
              Costo por equipo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/dashboard/mantenimiento/vehiculos">
              Vehiculos y QR
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Buscar por equipo o tarea
          </CardTitle>
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por equipo, tarea, ubicacion o prioridad"
          />
        </CardHeader>
      </Card>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No fue posible cargar la planificacion preventiva real.
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Cargando planificacion...</div>
      ) : filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No hay mantenimientos programados con el filtro actual.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orderedBuckets
            .filter((bucket) => grouped[bucket]?.length)
            .map((bucket) => (
              <Card key={bucket}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{bucket}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {grouped[bucket].map((schedule) => (
                    <div key={schedule.id} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{priorityLabel(schedule.priority)}</Badge>
                            <span className="font-semibold">{schedule.taskName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {schedule.assetName}
                            {schedule.assetCode ? ` | ${schedule.assetCode}` : ''}
                            {schedule.location ? ` | ${schedule.location}` : ''}
                          </p>
                          {schedule.description ? <p className="text-sm text-muted-foreground">{schedule.description}</p> : null}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {schedule.frequencyDays ? <span>Cada {schedule.frequencyDays} dias</span> : null}
                            {schedule.frequencyHours ? <span>Cada {schedule.frequencyHours} horas</span> : null}
                            {schedule.estimatedDurationHours ? <span>Duracion estimada: {schedule.estimatedDurationHours} h</span> : null}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button asChild size="sm" className="gap-2">
                              <Link href={buildWorkOrderHref(schedule)}>
                                Crear OT
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                            {schedule.assetId ? (
                              <Button asChild size="sm" variant="outline" className="gap-2">
                                <Link href={`/dashboard/mantenimiento/vehiculos/${schedule.assetId}/ficha`}>
                                  Ver activo
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p className={(schedule.daysUntil ?? 0) < 0 ? 'text-destructive font-semibold' : 'font-medium'}>
                            {daysLabel(schedule.daysUntil)}
                          </p>
                          <p className="mt-1">{schedule.nextScheduledDate || 'Sin fecha'}</p>
                          <p className="mt-1">{schedule.enabled ? 'Activa' : 'Deshabilitada'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}

