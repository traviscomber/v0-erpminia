'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, CheckCircle2, MoreHorizontal, PlayCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { WorkOrderExecutionPanel } from '@/components/maintenance/work-order-execution-panel';
import { WorkOrderMaterialCoverage } from '@/components/maintenance/work-order-material-coverage';
import { WorkOrderPartsPanel } from '@/components/maintenance/work-order-parts-panel';
import { WorkOrderTimer } from '@/components/maintenance/work-order-timer';
import { EntityTimeline } from '@/components/shared/entity-timeline';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la orden de trabajo');
  return payload;
};

function statusLabel(status?: string) {
  if (status === 'completed') return 'Completada';
  if (status === 'in_progress') return 'En progreso';
  if (status === 'open') return 'Abierta';
  return status || 'Sin estado';
}

function priorityLabel(priority?: string) {
  const labels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };
  return labels[priority || ''] || priority || 'Sin prioridad';
}

function typeLabel(type?: string) {
  const labels: Record<string, string> = { corrective: 'Correctiva', preventive: 'Preventiva', predictive: 'Predictiva' };
  return labels[type || ''] || type || 'Sin tipo';
}

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/maintenance/work-orders/${id}` : null, fetcher);
  const workOrder = data?.data;

  const updateStatus = async (status: 'open' | 'in_progress' | 'completed') => {
    setSavingStatus(status);
    setStatusError(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar la orden');
      await mutate();
    } catch (updateError) {
      setStatusError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la orden');
    } finally {
      setSavingStatus(null);
    }
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>;

  if (!workOrder) {
    return <Card className="shadow-none"><CardContent className="p-10 text-center"><p className="font-medium">{error ? 'No se pudo cargar la orden' : 'Orden no disponible'}</p><Button asChild variant="outline" className="mt-4"><Link href="/dashboard/mantenimiento/ordenes-trabajo">Volver a órdenes</Link></Button></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2"><Link href="/dashboard/mantenimiento/ordenes-trabajo"><ArrowLeft className="mr-2 h-4 w-4" />Órdenes de trabajo</Link></Button>
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{workOrder.work_order_number}</span><Badge variant="outline">{statusLabel(workOrder.status)}</Badge></div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{workOrder.title || 'Orden de trabajo'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{workOrder.asset_code || 'Sin código'} · {workOrder.asset_name || 'Sin activo asociado'}</p>
        </div>
        <div className="flex gap-2">
          {workOrder.status !== 'in_progress' && workOrder.status !== 'completed' ? <Button onClick={() => updateStatus('in_progress')} disabled={savingStatus !== null}><PlayCircle className="mr-2 h-4 w-4" />Iniciar trabajo</Button> : null}
          {workOrder.status === 'in_progress' ? <Button onClick={() => updateStatus('completed')} disabled={savingStatus !== null}><CheckCircle2 className="mr-2 h-4 w-4" />Completar</Button> : null}
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => updateStatus('open')}><RotateCcw className="mr-2 h-4 w-4" />Reabrir orden</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </section>

      {statusError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{statusError}</div> : null}

      <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Resumen operativo</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div><p className="text-xs text-muted-foreground">Estado</p><p className="mt-1 font-medium">{statusLabel(workOrder.status)}</p></div>
        <div><p className="text-xs text-muted-foreground">Prioridad</p><p className="mt-1 font-medium">{priorityLabel(workOrder.priority)}</p></div>
        <div><p className="text-xs text-muted-foreground">Tipo</p><p className="mt-1 font-medium">{typeLabel(workOrder.work_type)}</p></div>
        <div><p className="text-xs text-muted-foreground">Responsable</p><p className="mt-1 font-medium">{workOrder.assigned_to_name || 'Sin asignar'}</p></div>
        <div><p className="text-xs text-muted-foreground">Programada</p><p className="mt-1 font-medium">{workOrder.scheduled_date ? new Date(workOrder.scheduled_date).toLocaleDateString('es-CL') : 'Sin fecha'}</p></div>
        <div><p className="text-xs text-muted-foreground">Lectura inicial</p><p className="mt-1 font-medium">{workOrder.meter_reading ? `${workOrder.meter_reading} ${workOrder.meter_unit || ''}` : 'Sin lectura'}</p></div>
      </CardContent></Card>

      <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Intervención</CardTitle></CardHeader><CardContent className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div><p className="text-sm leading-6">{workOrder.description || 'Sin descripción adicional.'}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Causa raíz</p><p className="mt-1 text-sm font-medium">{workOrder.root_cause || 'No registrada'}</p></div><div><p className="text-xs text-muted-foreground">Acciones preventivas</p><p className="mt-1 text-sm font-medium">{workOrder.preventive_actions || 'No registradas'}</p></div></div></div>
        <WorkOrderTimer workOrderId={id} />
      </CardContent></Card>

      <WorkOrderMaterialCoverage workOrderId={id} />
      <WorkOrderPartsPanel workOrderId={id} />
      <WorkOrderExecutionPanel workOrderId={id} />
      <EntityTimeline entity="work_order" id={id} limit={50} />
    </div>
  );
}
