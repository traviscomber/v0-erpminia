'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, Clock, Eye, Plus, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaintenanceSchedule } from '@/components/maintenance/maintenance-schedule';

type WorkOrderItem = {
  id: string;
  status: string | null;
  priority: string | null;
  scheduled_date: string | null;
  asset_name: string | null;
  work_order_number: string | null;
  title: string | null;
  work_type?: string | null;
  assigned_to_name?: string | null;
};

type ScheduleItem = {
  id: string;
  assetName: string;
  taskName: string;
  nextScheduledDate: string;
  priority: 'high' | 'medium' | 'low';
  daysUntil: number;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export default function WorkOrdersPage() {
  const [updatingScheduleId, setUpdatingScheduleId] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/work-orders', async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || 'No se pudieron cargar las ordenes de trabajo');
    return payload;
  });

  const workOrders = Array.isArray(data?.workOrders) ? (data.workOrders as WorkOrderItem[]) : [];

  const inProgress = workOrders.filter((wo) => normalizeText(wo.status) === 'in_progress').length;
  const critical = workOrders.filter((wo) => normalizeText(wo.priority) === 'critical').length;
  const completed = workOrders.filter((wo) => normalizeText(wo.status) === 'completed').length;

  const getStatusColor = (status: string | null | undefined) => {
    switch (normalizeText(status)) {
      case 'completed':
        return 'bg-accent/10 text-accent';
      case 'in_progress':
        return 'bg-primary/10 text-primary';
      case 'open':
      case 'abierta':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted/50 text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (normalizeText(priority)) {
      case 'critical':
        return 'border-destructive/50 bg-destructive/5';
      case 'high':
        return 'border-orange-500/50 bg-orange-500/5';
      default:
        return 'border-border';
    }
  };

  const getStatusLabel = (status: string | null | undefined) => {
    switch (normalizeText(status)) {
      case 'completed':
        return 'Completada';
      case 'in_progress':
        return 'En progreso';
      case 'open':
      case 'abierta':
        return 'Abierta';
      default:
        return status || 'Sin estado';
    }
  };

  const getWorkTypeLabel = (workType: string | null | undefined) => {
    switch (normalizeText(workType)) {
      case 'corrective':
        return 'Correctiva';
      case 'preventive':
        return 'Preventiva';
      case 'predictive':
        return 'Predictiva';
      default:
        return workType || 'Sin tipo';
    }
  };

  const scheduleItems = useMemo(() => {
    return workOrders
      .filter((wo) => wo.scheduled_date)
      .map((wo): ScheduleItem => {
        const scheduledDate = new Date(wo.scheduled_date as string);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        scheduledDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const priorityValue = normalizeText(wo.priority);

        return {
          id: wo.id,
          assetName: wo.asset_name || 'Sin activo asociado',
          taskName: `${wo.work_order_number || 'OT'} - ${wo.title}`,
          nextScheduledDate: wo.scheduled_date || '',
          priority: priorityValue === 'critical' || priorityValue === 'high' ? 'high' : priorityValue === 'low' ? 'low' : 'medium',
          daysUntil,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 7);
  }, [workOrders]);

  const markScheduleComplete = async (scheduleId: string) => {
    setUpdatingScheduleId(scheduleId);
    try {
      const res = await fetch(`/api/maintenance/work-orders/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo actualizar la orden de trabajo');
      }

      await mutate();
    } finally {
      setUpdatingScheduleId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ordenes de trabajo</h1>
          <p className="text-muted-foreground">Gestion de mantenimiento y seguimiento operativo con datos reales.</p>
        </div>
        <Link href="/dashboard/work-orders/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Crear nueva orden
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total</p><p className="mt-2 text-3xl font-bold text-primary">{workOrders.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">En progreso</p><p className="mt-2 text-3xl font-bold text-primary">{inProgress}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Criticas</p><p className="mt-2 text-3xl font-bold text-destructive">{critical}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Completadas</p><p className="mt-2 text-3xl font-bold text-accent">{completed}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/mantenimiento">
          <Button variant="outline" className="gap-2"><Wrench className="h-4 w-4" /> Volver a mantenimiento</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Planificacion visual</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Vencidas y proximas primero</span>
            <span>·</span>
            <span>Actualiza el estado directo desde cada bloque</span>
          </div>
          {updatingScheduleId ? <p className="mb-3 text-sm text-muted-foreground">Actualizando orden {updatingScheduleId}...</p> : null}
          <MaintenanceSchedule schedules={scheduleItems} onMarkComplete={markScheduleComplete} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ordenes activas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                Cargando ordenes de trabajo...
              </div>
            )}

            {error && !isLoading && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
                <p className="font-medium text-destructive">No se pudieron cargar las ordenes de trabajo</p>
                <p className="mt-2 text-sm text-muted-foreground">Reintenta la carga o revisa la conexion antes de crear nuevas tareas operativas.</p>
              </div>
            )}

            {!isLoading && !error && workOrders.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                No hay ordenes de trabajo registradas todavia
              </div>
            )}

            {!error && workOrders.map((wo) => (
              <div key={wo.id} className={`rounded-lg border-2 p-4 transition-colors hover:bg-muted/30 ${getPriorityColor(wo.priority)}`}>
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{wo.work_order_number}</code>
                      <Badge className={getStatusColor(wo.status)} variant="outline">{getStatusLabel(wo.status)}</Badge>
                      <Badge variant="outline">{getWorkTypeLabel(wo.work_type || 'preventive')}</Badge>
                    </div>
                    <h3 className="font-semibold">{wo.title}</h3>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Activo: {wo.asset_name || 'Sin activo asociado'}</span>
                      <span>Asignado: {wo.assigned_to_name || 'Sin asignar'}</span>
                      <span>Programada: {wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString('es-CL') : 'Sin fecha'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/work-orders/${wo.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/work-orders/${wo.id}`}>Detalle</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
