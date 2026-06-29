'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, CheckCircle2, AlertCircle, Eye, Wrench, Filter } from 'lucide-react';
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

export default function WorkOrdersPage() {
  const [updatingScheduleId, setUpdatingScheduleId] = useState<string | null>(null);
  const { data, mutate } = useSWR('/api/maintenance/work-orders', async (url: string) => {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  });

  const workOrders = Array.isArray(data?.workOrders) ? (data.workOrders as WorkOrderItem[]) : [];

  const getStatusColor = (status: string | null | undefined) => {
    switch (String(status || '').toLowerCase()) {
      case 'completed':
        return 'bg-accent/10 text-accent';
      case 'in_progress':
        return 'bg-primary/10 text-primary';
      case 'open':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted/50 text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (String(priority || '').toLowerCase()) {
      case 'critical':
        return 'border-destructive/50 bg-destructive/5';
      case 'high':
        return 'border-orange-500/50 bg-orange-500/5';
      default:
        return 'border-border';
    }
  };

  const inProgress = workOrders.filter((wo) => wo.status === 'in_progress').length;
  const critical = workOrders.filter((wo) => wo.priority === 'critical').length;
  const completed = workOrders.filter((wo) => wo.status === 'completed').length;

  const scheduleItems = useMemo(() => {
    return workOrders
      .filter((wo) => wo.scheduled_date)
      .map((wo): ScheduleItem => {
        const scheduledDate = new Date(wo.scheduled_date as string);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        scheduledDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const priorityValue = String(wo.priority || '').toLowerCase();

        return {
          id: wo.id,
          assetName: wo.asset_name || 'Sin activo asociado',
          taskName: `${wo.work_order_number || 'OT'} - ${wo.title}`,
          nextScheduledDate: wo.scheduled_date,
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
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo actualizar la orden de trabajo');
      }

      await mutate();
    } catch (error) {
      console.error('[work-orders] schedule update failed', error);
    } finally {
      setUpdatingScheduleId(null);
    }
  };

  const getStatusLabel = (status: string | null | undefined) => {
    switch (String(status || '').toLowerCase()) {
      case 'completed':
        return 'Completada';
      case 'in_progress':
        return 'En progreso';
      case 'open':
        return 'Abierta';
      default:
        return status || 'Sin estado';
    }
  };

  const getWorkTypeLabel = (workType: string | null | undefined) => {
    switch (String(workType || '').toLowerCase()) {
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="mt-2 text-3xl font-bold text-primary">{workOrders.length}</p>
              </div>
              <Wrench className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En progreso</p>
                <p className="mt-2 text-3xl font-bold text-primary">{inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Criticas</p>
                <p className="mt-2 text-3xl font-bold text-destructive">{critical}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="mt-2 text-3xl font-bold text-accent">{completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-accent opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2" disabled>
          <Filter className="h-4 w-4" /> Filtrar
        </Button>
        <Link href="/dashboard/mantenimiento">
          <Button variant="outline" className="gap-2">
            <Wrench className="h-4 w-4" /> Volver a mantenimiento
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planificacion visual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Vencidas y proximas primero</span>
            <span>·</span>
            <span>Actualiza el estado directo desde cada bloque</span>
          </div>
          {updatingScheduleId ? (
            <p className="mb-3 text-sm text-muted-foreground">Actualizando orden {updatingScheduleId}...</p>
          ) : null}
          <MaintenanceSchedule schedules={scheduleItems} onMarkComplete={markScheduleComplete} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ordenes activas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workOrders.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                No hay ordenes de trabajo registradas todavia
              </div>
            )}

            {workOrders.map((wo) => (
              <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`}>
                <div
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-colors hover:bg-muted/30 ${getPriorityColor(wo.priority)}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{wo.work_order_number}</code>
                        <Badge className={getStatusColor(wo.status)} variant="outline">
                          {getStatusLabel(wo.status)}
                        </Badge>
                        <Badge variant="outline">{getWorkTypeLabel(wo.work_type || 'preventive')}</Badge>
                      </div>
                      <h3 className="font-semibold">{wo.title}</h3>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Activo: {wo.asset_name || 'Sin activo asociado'}</span>
                        <span>Asignado: {wo.assigned_to_name || 'Sin asignar'}</span>
                        <span>
                          Programada:{' '}
                          {wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString('es-CL') : 'Sin fecha'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/work-orders/${wo.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" disabled title="Edicion pendiente de definir">
                        Ver
                      </Button>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${wo.progress_percentage || 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{wo.progress_percentage || 0}% completado</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
