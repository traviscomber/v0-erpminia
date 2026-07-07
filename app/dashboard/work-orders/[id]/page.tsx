'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkOrderPartsPanel } from '@/components/maintenance/work-order-parts-panel';

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(id ? `/api/maintenance/work-orders/${id}` : null, async (url: string) => {
    const res = await fetch(url);
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(payload?.error || 'No se pudo cargar la orden de trabajo');
    }
    return payload;
  });

  const workOrder = data?.data;
  const hasWorkOrder = Boolean(workOrder);
  const progress = Math.max(0, Math.min(100, workOrder?.progress_percentage || 0));

  const getStatusLabel = (status?: string) => {
    switch (status) {
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

  const getPriorityLabel = (priority?: string) => {
    if (String(priority || '').toLowerCase() === 'critical') return 'Critica';
    switch (priority) {
      case 'low':
        return 'Baja';
      case 'medium':
        return 'Media';
      case 'high':
        return 'Alta';
      case 'critical':
        return 'Crítica';
      default:
        return priority || 'Sin prioridad';
    }
  };

  const getWorkTypeLabel = (workType?: string) => {
    switch (workType) {
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

  const updateStatus = async (status: 'open' | 'in_progress' | 'completed') => {
    setSavingStatus(status);
    try {
      const res = await fetch(`/api/maintenance/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo actualizar la orden de trabajo');
      }

      await mutate();
    } catch (error) {
      console.error('[work-orders] status update failed', error);
    } finally {
      setSavingStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{workOrder?.work_order_number || 'Orden de trabajo'}</h1>
          <p className="text-muted-foreground">{workOrder?.title || 'Cargando detalle de mantenimiento'}</p>
        </div>
        <Link href="/dashboard/work-orders">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Cargando orden de trabajo</CardTitle>
            <CardDescription>Estamos recuperando el detalle operativo de la OT.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!isLoading && !hasWorkOrder && (
        <Card>
          <CardHeader>
            <CardTitle>{error ? 'No se pudo cargar la orden' : 'Orden no disponible'}</CardTitle>
            <CardDescription>
              {error
                ? 'Revisa la conexion o vuelve al listado para abrir otra orden activa.'
                : 'No se encontro informacion para esta orden. Puedes volver al listado o crear una nueva orden desde el flujo principal.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/work-orders">Volver a ordenes</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/work-orders/create">Crear nueva orden</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasWorkOrder && (
        <>
          <Card className="border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4">
                Resumen rápido
                <Badge variant="outline">{progress}%</Badge>
              </CardTitle>
              <CardDescription>Visibilidad rápida para operación y supervisión</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Activo</p>
                <p className="font-medium">{workOrder.asset_name || 'Sin activo asociado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant="outline">{getStatusLabel(workOrder.status)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prioridad</p>
                <p className="font-medium">{getPriorityLabel(workOrder.priority)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{getWorkTypeLabel(workOrder.work_type)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones rapidas</CardTitle>
              <CardDescription>Cambia el estado sin salir de la orden</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => updateStatus('open')}
                disabled={savingStatus !== null}
              >
                Reabrir
              </Button>
              <Button
                variant="outline"
                onClick={() => updateStatus('in_progress')}
                disabled={savingStatus !== null}
              >
                Marcar en progreso
              </Button>
              <Button
                className="bg-[var(--brand-verde)] hover:bg-[var(--brand-verde)]/90"
                onClick={() => updateStatus('completed')}
                disabled={savingStatus !== null}
              >
                {savingStatus === 'completed' ? 'Guardando...' : 'Marcar completada'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
              <CardDescription>Estado actual y datos principales</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant="outline">{getStatusLabel(workOrder.status)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prioridad</p>
                <p className="font-medium">{getPriorityLabel(workOrder.priority)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{getWorkTypeLabel(workOrder.work_type)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activo</p>
                <p className="font-medium">{workOrder.asset_name || 'Sin activo asociado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asignado a</p>
                <p className="font-medium">{workOrder.assigned_to_name || 'Sin asignar'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha programada</p>
                <p className="font-medium">
                  {workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString('es-CL') : 'Sin fecha'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Código activo</p>
                <p className="font-medium">{workOrder.asset_code || 'No disponible'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas planificadas</p>
                <p className="font-medium">{workOrder.planned_duration_hours || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas reales</p>
                <p className="font-medium">{workOrder.actual_duration_hours || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{workOrder.description || 'Sin descripción adicional.'}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Causa raiz</p>
                  <p className="font-medium">{workOrder.root_cause || 'No registrada'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acciones preventivas</p>
                  <p className="font-medium">{workOrder.preventive_actions || 'No registradas'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <WorkOrderPartsPanel workOrderId={id} />
        </>
      )}
    </div>
  );
}
