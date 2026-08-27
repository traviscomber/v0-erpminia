'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type QueueRow = {
  work_order_id: string;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  work_type: string | null;
  root_cause: string | null;
  preventive_actions: string | null;
  actual_duration_hours: number | string | null;
  total_cost: number | string | null;
  runtime_evidence_status: string | null;
  runtime_unavailable_reason: string | null;
  missing_runtime_evidence: boolean;
  ready_to_close: boolean;
  next_action: string;
  asset?: { id: string; asset_code: string | null; name: string | null } | null;
};

type QueueResponse = {
  queue?: QueueRow[];
  summary?: {
    openOrders: number;
    readyToClose: number;
    blocked: number;
    missingRootCause: number;
    missingPreventiveActions: number;
    missingActualHours: number;
    missingRuntimeEvidence: number;
  };
  canEdit?: boolean;
};

const fetcher = async (url: string): Promise<QueueResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la cola de cierre');
  return payload;
};

const actionCopy: Record<string, { title: string; description: string }> = {
  resolve_asset: { title: 'Resolver activo', description: 'La OT necesita un activo canónico antes de cerrarse.' },
  resolve_procurement: { title: 'Cerrar compras pendientes', description: 'Hay órdenes de compra emitidas o parcialmente recibidas.' },
  resolve_parts: { title: 'Resolver repuestos', description: 'Hay repuestos emitidos pendientes de instalar o devolver.' },
  resolve_materials: { title: 'Completar materiales', description: 'Hay requerimientos de materiales aún no satisfechos.' },
  resolve_external_services: { title: 'Resolver servicios externos', description: 'Hay servicios externos pendientes de aprobación.' },
  resolve_labor: { title: 'Cerrar horas abiertas', description: 'Hay registros de trabajo que todavía no tienen término.' },
  reconcile_external_cost: { title: 'Reconciliar costo externo', description: 'Existe un posible doble conteo entre costo legado y servicios externos.' },
  record_root_cause: { title: 'Registrar causa raíz', description: 'Describe la causa principal observada en esta intervención.' },
  record_preventive_actions: { title: 'Registrar acción preventiva', description: 'Registra qué acción evitará o reducirá la recurrencia.' },
  record_actual_hours: { title: 'Registrar horas reales', description: 'Ingresa las horas reales utilizadas en la intervención.' },
  record_runtime_evidence: { title: 'Resolver horómetro', description: 'Registra la lectura al cierre o documenta por qué el horómetro no está disponible.' },
  close_work_order: { title: 'Cerrar OT', description: 'Todos los controles obligatorios están satisfechos. El cierre generará el snapshot de costo auditado.' },
};

function money(value: unknown) { return `$${Number(value || 0).toLocaleString('es-CL')}`; }
function localDateTimeValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function ProgressiveWorkOrderCloseQueue() {
  const searchParams = useSearchParams();
  const selectedWorkOrderId = searchParams.get('workOrderId');
  const { data, error, isLoading, mutate } = useSWR<QueueResponse>('/api/maintenance/work-order-close-queue', fetcher);
  const rawQueue = Array.isArray(data?.queue) ? data.queue : [];
  const queue = useMemo(() => {
    if (!selectedWorkOrderId) return rawQueue;
    return [...rawQueue].sort((a, b) => a.work_order_id === selectedWorkOrderId ? -1 : b.work_order_id === selectedWorkOrderId ? 1 : 0);
  }, [rawQueue, selectedWorkOrderId]);
  const current = queue[0] || null;
  const summary = data?.summary;
  const [textValue, setTextValue] = useState('');
  const [hoursValue, setHoursValue] = useState('');
  const [meterMode, setMeterMode] = useState<'meter_reading' | 'not_available'>('meter_reading');
  const [meterValue, setMeterValue] = useState('');
  const [meterRecordedAt, setMeterRecordedAt] = useState(localDateTimeValue());
  const [meterReason, setMeterReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setActionError(null);
    setTextValue('');
    setHoursValue('');
    setMeterMode('meter_reading');
    setMeterValue('');
    setMeterRecordedAt(localDateTimeValue());
    setMeterReason('');
  }, [current?.work_order_id, current?.next_action]);

  const copy = current ? actionCopy[current.next_action] || { title: 'Revisar OT', description: 'Revisa la evidencia pendiente antes de continuar.' } : null;
  const actionableInline = useMemo(() => current && ['record_root_cause', 'record_preventive_actions', 'record_actual_hours', 'record_runtime_evidence', 'close_work_order'].includes(current.next_action), [current]);

  async function patchCurrent(body: Record<string, unknown>) {
    if (!current) return;
    setSaving(true); setActionError(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${current.work_order_id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar la OT');
      await mutate();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No se pudo actualizar la OT'); }
    finally { setSaving(false); }
  }

  async function saveRuntimeEvidence() {
    if (!current) return;
    const body: Record<string, unknown> = { workOrderId: current.work_order_id, mode: meterMode };
    if (meterMode === 'meter_reading') {
      const meterHours = Number(meterValue);
      if (!Number.isFinite(meterHours) || meterHours < 0) return setActionError('Ingresa una lectura de horómetro válida.');
      if (!meterRecordedAt) return setActionError('Ingresa la fecha de la lectura.');
      body.meterHours = meterHours;
      body.recordedAt = new Date(meterRecordedAt).toISOString();
    } else {
      const reason = meterReason.trim();
      if (!reason) return setActionError('Indica por qué el horómetro no está disponible.');
      body.unavailableReason = reason;
    }
    setSaving(true); setActionError(null);
    try {
      const response = await fetch('/api/maintenance/work-order-runtime-evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo registrar la evidencia de horómetro');
      await mutate();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No se pudo registrar la evidencia de horómetro'); }
    finally { setSaving(false); }
  }

  async function performNextAction() {
    if (!current) return;
    if (current.next_action === 'record_root_cause') { const value = textValue.trim(); if (!value) return setActionError('Registra una causa raíz antes de guardar.'); return patchCurrent({ root_cause: value }); }
    if (current.next_action === 'record_preventive_actions') { const value = textValue.trim(); if (!value) return setActionError('Registra una acción preventiva antes de guardar.'); return patchCurrent({ preventive_actions: value }); }
    if (current.next_action === 'record_actual_hours') { const hours = Number(hoursValue); if (!Number.isFinite(hours) || hours <= 0) return setActionError('Ingresa horas reales mayores que cero.'); return patchCurrent({ actual_duration_hours: hours }); }
    if (current.next_action === 'record_runtime_evidence') return saveRuntimeEvidence();
    if (current.next_action === 'close_work_order') return patchCurrent({ status: 'completed', root_cause: current.root_cause, preventive_actions: current.preventive_actions, actual_duration_hours: Number(current.actual_duration_hours || 0) });
  }

  if (isLoading) return <Card className="shadow-none"><CardContent className="p-6 text-sm text-muted-foreground">Cargando cola de cierre...</CardContent></Card>;
  if (error) return <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="flex items-start gap-3 p-6"><AlertCircle className="mt-0.5 h-5 w-5 text-destructive" /><div><p className="font-medium text-destructive">No se pudo cargar la cola de cierre</p><Button className="mt-3" variant="outline" size="sm" onClick={() => void mutate()}>Reintentar</Button></div></CardContent></Card>;

  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">OT abiertas</p><p className="mt-1 text-2xl font-semibold">{summary?.openOrders || 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Listas para cerrar</p><p className="mt-1 text-2xl font-semibold">{summary?.readyToClose || 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sin causa raíz</p><p className="mt-1 text-2xl font-semibold">{summary?.missingRootCause || 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Sin horas reales</p><p className="mt-1 text-2xl font-semibold">{summary?.missingActualHours || 0}</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Correctivas sin horómetro resuelto</p><p className="mt-1 text-2xl font-semibold">{summary?.missingRuntimeEvidence || 0}</p></CardContent></Card>
    </div>

    {!current ? <Card className="border-emerald-200 bg-emerald-50/50 shadow-none"><CardContent className="flex items-start gap-3 p-6"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" /><div><p className="font-medium">No hay OT pendientes de cierre</p><p className="mt-1 text-sm text-muted-foreground">La cola se llenará automáticamente cuando existan órdenes abiertas.</p></div></CardContent></Card> : <Card className="shadow-none">
      <CardHeader className="border-b border-border/70 pb-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Siguiente acción</Badge><span className="font-mono text-xs text-muted-foreground">{current.work_order_number || 'OT'}</span></div><CardTitle className="mt-3 text-xl">{copy?.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{copy?.description}</p></div><Button variant="outline" size="sm" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></div></CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-3"><div><p className="text-xs text-muted-foreground">Equipo</p><p className="mt-1 font-medium">{current.asset?.name || 'Sin activo'}</p><p className="text-xs text-muted-foreground">{current.asset?.asset_code || ''}</p></div><div><p className="text-xs text-muted-foreground">Trabajo</p><p className="mt-1 font-medium">{current.title || 'Sin título'}</p><p className="text-xs text-muted-foreground">{current.work_type || 'Sin tipo'} · {current.priority || 'Sin prioridad'}</p></div><div><p className="text-xs text-muted-foreground">Costo final actual</p><p className="mt-1 font-medium">{money(current.total_cost)}</p><p className="text-xs text-muted-foreground">Se congela sólo al cerrar.</p></div></div>
        {current.next_action === 'record_root_cause' || current.next_action === 'record_preventive_actions' ? <textarea value={textValue} onChange={(event) => setTextValue(event.target.value)} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder={current.next_action === 'record_root_cause' ? 'Causa principal observada...' : 'Acción preventiva ejecutada o recomendada...'} /> : null}
        {current.next_action === 'record_actual_hours' ? <Input type="number" min="0.01" step="0.25" value={hoursValue} onChange={(event) => setHoursValue(event.target.value)} placeholder="Horas reales" /> : null}
        {current.next_action === 'record_runtime_evidence' ? <div className="space-y-4 rounded-lg border p-4"><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={meterMode === 'meter_reading' ? 'default' : 'outline'} onClick={() => setMeterMode('meter_reading')}>Registrar lectura</Button><Button type="button" size="sm" variant={meterMode === 'not_available' ? 'default' : 'outline'} onClick={() => setMeterMode('not_available')}>Horómetro no disponible</Button></div>{meterMode === 'meter_reading' ? <div className="grid gap-3 md:grid-cols-2"><Input type="number" min="0" step="0.1" value={meterValue} onChange={(event) => setMeterValue(event.target.value)} placeholder="Lectura acumulada (h)" /><Input type="datetime-local" value={meterRecordedAt} onChange={(event) => setMeterRecordedAt(event.target.value)} /></div> : <textarea value={meterReason} onChange={(event) => setMeterReason(event.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Motivo verificable: equipo sin medidor, medidor averiado, lectura inaccesible..." />}</div> : null}
        {actionError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</div> : null}
        <div className="flex flex-wrap items-center gap-2">{actionableInline && data?.canEdit ? <Button onClick={() => void performNextAction()} disabled={saving}>{saving ? 'Guardando...' : current.next_action === 'close_work_order' ? 'Cerrar OT y congelar costo' : 'Guardar y continuar'}<ArrowRight className="ml-2 h-4 w-4" /></Button> : null}{!actionableInline ? <Button asChild><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${current.work_order_id}`}>Resolver en la OT<ArrowRight className="ml-2 h-4 w-4" /></Link></Button> : null}{!data?.canEdit ? <Badge variant="secondary">Solo lectura</Badge> : null}<Button asChild variant="ghost"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${current.work_order_id}`}>Ver detalle completo</Link></Button></div>
      </CardContent>
    </Card>}

    {queue.length > 1 ? <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Después</CardTitle></CardHeader><CardContent className="divide-y rounded-lg border">{queue.slice(1, 8).map((row) => <div key={row.work_order_id} className="flex items-center justify-between gap-4 p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{row.work_order_number || 'OT'} · {row.title || 'Sin título'}</p><p className="text-xs text-muted-foreground">{actionCopy[row.next_action]?.title || row.next_action}</p></div><Badge variant={row.ready_to_close ? 'default' : 'outline'}>{row.ready_to_close ? 'Lista' : 'Pendiente'}</Badge></div>)}</CardContent></Card> : null}
  </div>;
}
