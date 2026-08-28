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
  missing_runtime_evidence: boolean;
  standard_plan_steps_total: number | string | null;
  standard_plan_steps_completed: number | string | null;
  standard_plan_steps_pending: number | string | null;
  next_plan_step_id: string | null;
  next_plan_step_sequence: number | null;
  next_plan_step_title: string | null;
  next_plan_step_instructions: string | null;
  next_plan_step_control_requirement: string | null;
  next_plan_step_document_reference: string | null;
  ready_to_close: boolean;
  next_action: string;
  asset?: { id: string; asset_code: string | null; name: string | null } | null;
};

type QueueResponse = {
  queue?: QueueRow[];
  summary?: { openOrders: number; readyToClose: number; blocked: number; pendingPlanSteps: number; workOrdersWithPendingPlan: number; missingRootCause: number; missingPreventiveActions: number; missingActualHours: number; missingRuntimeEvidence: number };
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
  complete_standard_plan_step: { title: 'Ejecutar siguiente paso', description: 'Completa el primer paso pendiente del procedimiento estándar aplicado.' },
  record_root_cause: { title: 'Registrar causa raíz', description: 'Describe la causa principal observada en esta intervención.' },
  record_preventive_actions: { title: 'Registrar acción preventiva', description: 'Registra qué acción evitará o reducirá la recurrencia.' },
  record_actual_hours: { title: 'Registrar horas reales', description: 'Ingresa las horas reales utilizadas en la intervención.' },
  record_runtime_evidence: { title: 'Resolver horómetro', description: 'Registra la lectura al cierre o documenta por qué no está disponible.' },
  close_work_order: { title: 'Cerrar OT', description: 'Todos los controles obligatorios están satisfechos. El cierre congelará el costo auditado.' },
};

function money(value: unknown) { return `$${Number(value || 0).toLocaleString('es-CL')}`; }
function localDateTimeValue() { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }

export function ProgressiveWorkOrderCloseQueue() {
  const searchParams = useSearchParams();
  const selectedWorkOrderId = searchParams.get('workOrderId');
  const { data, error, isLoading, mutate } = useSWR<QueueResponse>('/api/maintenance/work-order-close-queue', fetcher, { revalidateOnFocus: false });
  const rawQueue = Array.isArray(data?.queue) ? data.queue : [];
  const queue = useMemo(() => selectedWorkOrderId ? [...rawQueue].sort((a,b) => a.work_order_id===selectedWorkOrderId ? -1 : b.work_order_id===selectedWorkOrderId ? 1 : 0) : rawQueue, [rawQueue, selectedWorkOrderId]);
  const current = queue[0] || null;
  const summary = data?.summary;
  const [textValue, setTextValue] = useState('');
  const [hoursValue, setHoursValue] = useState('');
  const [stepObservation, setStepObservation] = useState('');
  const [meterMode, setMeterMode] = useState<'meter_reading'|'not_available'>('meter_reading');
  const [meterValue, setMeterValue] = useState('');
  const [meterRecordedAt, setMeterRecordedAt] = useState(localDateTimeValue());
  const [meterReason, setMeterReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { setActionError(null); setTextValue(''); setHoursValue(''); setStepObservation(''); setMeterMode('meter_reading'); setMeterValue(''); setMeterRecordedAt(localDateTimeValue()); setMeterReason(''); }, [current?.work_order_id, current?.next_action, current?.next_plan_step_id]);

  async function request(url: string, body: Record<string, unknown>) {
    setSaving(true); setActionError(null);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar');
      await mutate();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No se pudo guardar'); }
    finally { setSaving(false); }
  }

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

  async function performNextAction() {
    if (!current) return;
    if (current.next_action === 'complete_standard_plan_step') {
      if (!current.next_plan_step_id) return setActionError('No se encontró el paso pendiente.');
      return request(`/api/maintenance/work-orders/${current.work_order_id}/standard-plan`, { stepId: current.next_plan_step_id, observation: stepObservation.trim() || null });
    }
    if (current.next_action === 'record_root_cause') { const value=textValue.trim(); if(!value) return setActionError('Registra una causa raíz antes de guardar.'); return patchCurrent({ root_cause:value }); }
    if (current.next_action === 'record_preventive_actions') { const value=textValue.trim(); if(!value) return setActionError('Registra una acción preventiva antes de guardar.'); return patchCurrent({ preventive_actions:value }); }
    if (current.next_action === 'record_actual_hours') { const hours=Number(hoursValue); if(!Number.isFinite(hours)||hours<=0) return setActionError('Ingresa horas reales mayores que cero.'); return patchCurrent({ actual_duration_hours:hours }); }
    if (current.next_action === 'record_runtime_evidence') {
      const body: Record<string, unknown> = { workOrderId: current.work_order_id, mode: meterMode };
      if (meterMode === 'meter_reading') { const meterHours=Number(meterValue); if(!Number.isFinite(meterHours)||meterHours<0) return setActionError('Ingresa una lectura válida.'); if(!meterRecordedAt) return setActionError('Ingresa la fecha de lectura.'); body.meterHours=meterHours; body.recordedAt=new Date(meterRecordedAt).toISOString(); }
      else { const reason=meterReason.trim(); if(!reason) return setActionError('Indica por qué el horómetro no está disponible.'); body.unavailableReason=reason; }
      return request('/api/maintenance/work-order-runtime-evidence', body);
    }
    if (current.next_action === 'close_work_order') return patchCurrent({ status:'completed', root_cause:current.root_cause, preventive_actions:current.preventive_actions, actual_duration_hours:Number(current.actual_duration_hours||0) });
  }

  if (isLoading) return <Card className="shadow-none"><CardContent className="p-6 text-sm text-muted-foreground">Cargando cola de cierre...</CardContent></Card>;
  if (error) return <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="p-6 text-sm text-destructive">No se pudo cargar la cola de cierre.</CardContent></Card>;

  const copy = current ? actionCopy[current.next_action] || { title:'Revisar OT', description:'Revisa la evidencia pendiente.' } : null;
  const inline = current && ['complete_standard_plan_step','record_root_cause','record_preventive_actions','record_actual_hours','record_runtime_evidence','close_work_order'].includes(current.next_action);

  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {[
        ['OT abiertas',summary?.openOrders||0],['Listas para cerrar',summary?.readyToClose||0],['OT con plan pendiente',summary?.workOrdersWithPendingPlan||0],['Pasos pendientes',summary?.pendingPlanSteps||0],['Sin horas reales',summary?.missingActualHours||0],['Sin horómetro',summary?.missingRuntimeEvidence||0],
      ].map(([label,value]) => <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>)}
    </div>

    {!current ? <Card className="shadow-none"><CardContent className="flex items-start gap-3 p-6"><CheckCircle2 className="mt-0.5 h-5 w-5"/><div><p className="font-medium">No hay OT pendientes de cierre</p><p className="mt-1 text-sm text-muted-foreground">La cola aparecerá automáticamente cuando existan órdenes abiertas.</p></div></CardContent></Card> : <Card className="shadow-none">
      <CardHeader className="border-b border-border/70 pb-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Siguiente acción</Badge><span className="font-mono text-xs text-muted-foreground">{current.work_order_number||'OT'}</span>{Number(current.standard_plan_steps_total||0)>0 ? <Badge variant="secondary">Plan {current.standard_plan_steps_completed}/{current.standard_plan_steps_total}</Badge> : null}</div><CardTitle className="mt-3 text-xl">{copy?.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{copy?.description}</p></div><Button variant="outline" size="sm" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button></div></CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-3"><div><p className="text-xs text-muted-foreground">Equipo</p><p className="mt-1 font-medium">{current.asset?.name||'Sin activo'}</p><p className="text-xs text-muted-foreground">{current.asset?.asset_code||''}</p></div><div><p className="text-xs text-muted-foreground">Trabajo</p><p className="mt-1 font-medium">{current.title||'Sin título'}</p><p className="text-xs text-muted-foreground">{current.work_type||'Sin tipo'} · {current.priority||'Sin prioridad'}</p></div><div><p className="text-xs text-muted-foreground">Costo actual</p><p className="mt-1 font-medium">{money(current.total_cost)}</p><p className="text-xs text-muted-foreground">Se congela al cierre.</p></div></div>
        {current.next_action==='complete_standard_plan_step' ? <div className="rounded-lg border p-4"><div className="flex items-center gap-2"><Badge variant="outline">Paso {current.next_plan_step_sequence}</Badge><p className="font-medium">{current.next_plan_step_title}</p></div>{current.next_plan_step_instructions ? <p className="mt-2 text-sm text-muted-foreground">{current.next_plan_step_instructions}</p> : null}{current.next_plan_step_control_requirement ? <p className="mt-2 text-sm"><span className="font-medium">Control:</span> {current.next_plan_step_control_requirement}</p> : null}{current.next_plan_step_document_reference ? <p className="mt-1 text-xs text-muted-foreground">Documento: {current.next_plan_step_document_reference}</p> : null}<textarea className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} value={stepObservation} onChange={(e)=>setStepObservation(e.target.value)} placeholder="Observación de ejecución (opcional)"/></div> : null}
        {(current.next_action==='record_root_cause'||current.next_action==='record_preventive_actions') ? <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={4} value={textValue} onChange={(e)=>setTextValue(e.target.value)} placeholder={current.next_action==='record_root_cause'?'Causa principal observada...':'Acción preventiva ejecutada o recomendada...'}/> : null}
        {current.next_action==='record_actual_hours' ? <Input type="number" min="0.01" step="0.25" value={hoursValue} onChange={(e)=>setHoursValue(e.target.value)} placeholder="Horas reales"/> : null}
        {current.next_action==='record_runtime_evidence' ? <div className="space-y-4 rounded-lg border p-4"><div className="flex gap-2"><Button size="sm" variant={meterMode==='meter_reading'?'default':'outline'} onClick={()=>setMeterMode('meter_reading')}>Registrar lectura</Button><Button size="sm" variant={meterMode==='not_available'?'default':'outline'} onClick={()=>setMeterMode('not_available')}>No disponible</Button></div>{meterMode==='meter_reading'?<div className="grid gap-3 md:grid-cols-2"><Input type="number" min="0" step="0.1" value={meterValue} onChange={(e)=>setMeterValue(e.target.value)} placeholder="Lectura acumulada (h)"/><Input type="datetime-local" value={meterRecordedAt} onChange={(e)=>setMeterRecordedAt(e.target.value)}/></div>:<textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} value={meterReason} onChange={(e)=>setMeterReason(e.target.value)} placeholder="Motivo verificable..."/>}</div> : null}
        {actionError ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mr-2 inline h-4 w-4"/>{actionError}</div> : null}
        <div className="flex flex-wrap gap-2">{inline && data?.canEdit ? <Button onClick={()=>void performNextAction()} disabled={saving}>{saving?'Guardando...':current.next_action==='close_work_order'?'Cerrar OT y congelar costo':current.next_action==='complete_standard_plan_step'?'Marcar paso realizado':'Guardar y continuar'}<ArrowRight className="ml-2 h-4 w-4"/></Button> : null}{!inline ? <Button asChild><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${current.work_order_id}`}>Resolver en ficha<ArrowRight className="ml-2 h-4 w-4"/></Link></Button> : null}<Button asChild variant="outline"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${current.work_order_id}`}>Ver OT</Link></Button></div>
      </CardContent>
    </Card>}
  </div>;
}
