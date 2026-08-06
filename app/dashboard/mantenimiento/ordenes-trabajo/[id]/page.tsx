'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, CheckCircle2, MoreHorizontal, PlayCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WorkOrderExecutionPanel } from '@/components/maintenance/work-order-execution-panel';
import { WorkOrderMaterialCoverage } from '@/components/maintenance/work-order-material-coverage';
import { WorkOrderPartsPanel } from '@/components/maintenance/work-order-parts-panel';
import { WorkOrderPurchasingFlow } from '@/components/maintenance/work-order-purchasing-flow';
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
  if (status === 'in_progress') return 'En ejecución';
  if (status === 'open') return 'Abierta';
  return status || 'Sin estado';
}

function priorityLabel(priority?: string) {
  const labels: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };
  return labels[priority || ''] || priority || 'Sin prioridad';
}

function typeLabel(type?: string) {
  const labels: Record<string, string> = { corrective: 'Correctiva', preventive: 'Preventiva', predictive: 'Predictiva', inspection: 'Inspección' };
  return labels[type || ''] || type || 'Sin tipo';
}

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [rootCause, setRootCause] = useState('');
  const [preventiveActions, setPreventiveActions] = useState('');
  const [actualHours, setActualHours] = useState('');
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/maintenance/work-orders/${id}` : null, fetcher);
  const workOrder = data?.data;

  useEffect(() => {
    if (!workOrder) return;
    setRootCause(workOrder.root_cause || '');
    setPreventiveActions(workOrder.preventive_actions || '');
    setActualHours(workOrder.actual_duration_hours ? String(workOrder.actual_duration_hours) : '');
  }, [workOrder]);

  const updateStatus = async (
    status: 'open' | 'in_progress' | 'completed',
    details?: { root_cause: string; preventive_actions: string; actual_duration_hours: number },
  ) => {
    setSavingStatus(status);
    setStatusError(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, ...details }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar la orden');
      await mutate();
      if (status === 'completed') setCloseOpen(false);
    } catch (updateError) {
      setStatusError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la orden');
    } finally {
      setSavingStatus(null);
    }
  };

  const completeOrder = async () => {
    const hours = Number(actualHours);
    if (!rootCause.trim()) return setStatusError('Registra la causa principal.');
    if (!preventiveActions.trim()) return setStatusError('Registra la acción preventiva.');
    if (!Number.isFinite(hours) || hours <= 0) return setStatusError('Registra las horas reales utilizadas.');

    await updateStatus('completed', {
      root_cause: rootCause.trim(),
      preventive_actions: preventiveActions.trim(),
      actual_duration_hours: hours,
    });
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
          <p className="mt-2 text-sm text-muted-foreground">{workOrder.asset_code || 'Sin código'} · {workOrder.asset_name || 'Sin equipo asociado'}</p>
        </div>
        <div className="flex gap-2">
          {workOrder.status !== 'in_progress' && workOrder.status !== 'completed' ? <Button onClick={() => updateStatus('in_progress')} disabled={savingStatus !== null}><PlayCircle className="mr-2 h-4 w-4" />Iniciar trabajo</Button> : null}
          {workOrder.status === 'in_progress' ? <Button onClick={() => { setStatusError(null); setCloseOpen(true); }} disabled={savingStatus !== null}><CheckCircle2 className="mr-2 h-4 w-4" />Completar orden</Button> : null}
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Más acciones"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => updateStatus('open')}><RotateCcw className="mr-2 h-4 w-4" />Reabrir orden</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
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
        <div><p className="text-sm leading-6">{workOrder.description || 'Sin descripción adicional.'}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Causa principal</p><p className="mt-1 text-sm font-medium">{workOrder.root_cause || 'No registrada'}</p></div><div><p className="text-xs text-muted-foreground">Acción preventiva</p><p className="mt-1 text-sm font-medium">{workOrder.preventive_actions || 'No registrada'}</p></div></div></div>
        <WorkOrderTimer workOrderId={id} />
      </CardContent></Card>

      <WorkOrderMaterialCoverage workOrderId={id} />
      <WorkOrderPartsPanel workOrderId={id} />
      <WorkOrderPurchasingFlow workOrderId={id} />
      <WorkOrderExecutionPanel workOrderId={id} />
      <EntityTimeline entity="work_order" id={id} limit={50} />

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Completar orden de trabajo</DialogTitle>
            <DialogDescription>Registra qué ocurrió, qué se hizo para evitar que se repita y cuánto tiempo real tomó el trabajo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="root-cause">Causa principal</Label>
              <Textarea id="root-cause" value={rootCause} onChange={(event) => setRootCause(event.target.value)} placeholder="Describe la causa confirmada del problema" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preventive-actions">Acción preventiva</Label>
              <Textarea id="preventive-actions" value={preventiveActions} onChange={(event) => setPreventiveActions(event.target.value)} placeholder="Describe la acción aplicada o recomendada" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual-hours">Horas reales utilizadas</Label>
              <Input id="actual-hours" type="number" min="0.1" step="0.1" value={actualHours} onChange={(event) => setActualHours(event.target.value)} placeholder="Ej. 3,5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={savingStatus === 'completed'}>Cancelar</Button>
            <Button onClick={completeOrder} disabled={savingStatus === 'completed' || !rootCause.trim() || !preventiveActions.trim() || Number(actualHours) <= 0}>
              {savingStatus === 'completed' ? 'Completando…' : 'Confirmar cierre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
