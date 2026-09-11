'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { CirclePause, CirclePlay, Clock3, ShieldCheck, SquareStop } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

type TimerResponse = {
  current?: { timer_status?: 'idle' | 'running' | 'paused'; total_minutes?: number };
};

const fetcher = async (url: string): Promise<TimerResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el estado del trabajo.');
  return payload as TimerResponse;
};

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function MobileWorkOrderFlow({
  workOrderId,
  workOrderNumber,
  title,
  status,
  assignedPersonId,
  canEdit,
  onWorkOrderChange,
}: {
  workOrderId: string;
  workOrderNumber?: string | null;
  title?: string | null;
  status?: string | null;
  assignedPersonId?: string | null;
  canEdit: boolean;
  onWorkOrderChange: () => Promise<unknown> | void;
}) {
  const router = useRouter();
  const hasCanonicalAssignee = Boolean(assignedPersonId);
  const { data, error, isLoading, mutate } = useSWR<TimerResponse>(
    canEdit && hasCanonicalAssignee && status !== 'completed' ? `/api/maintenance/work-orders/${workOrderId}/timer` : null,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timerStatus = data?.current?.timer_status || 'idle';
  const totalMinutes = Number(data?.current?.total_minutes || 0);

  async function request(url: string, options: RequestInit) {
    const response = await fetch(url, { credentials: 'include', ...options });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar el cambio.');
  }

  async function startWork() {
    if (!hasCanonicalAssignee) return;
    setBusy(true); setMessage(null);
    try {
      await request(`/api/maintenance/work-orders/${workOrderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress' }) });
      if (timerStatus === 'idle') await request(`/api/maintenance/work-orders/${workOrderId}/timer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'play' }) });
      await Promise.all([onWorkOrderChange(), mutate()]);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo iniciar el trabajo.'); }
    finally { setBusy(false); }
  }

  async function timerAction(action: 'pause' | 'resume') {
    setBusy(true); setMessage(null);
    try { await request(`/api/maintenance/work-orders/${workOrderId}/timer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }); await mutate(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo actualizar el tiempo.'); }
    finally { setBusy(false); }
  }

  async function finishWork() {
    setBusy(true); setMessage(null);
    try {
      if (timerStatus === 'running' || timerStatus === 'paused') await request(`/api/maintenance/work-orders/${workOrderId}/timer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'terminate' }) });
      router.push(`/dashboard/mantenimiento/ordenes-trabajo/cierre?workOrderId=${encodeURIComponent(workOrderId)}`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo preparar el cierre.'); setBusy(false); }
  }

  if (!canEdit) return <StatePanel tone="neutral" title="Orden de solo lectura" description="Este registro no admite ejecución desde terreno." className="md:hidden" />;
  if (status === 'completed') return <StatePanel tone="neutral" title="Trabajo terminado" description="La OT ya fue cerrada y permanece disponible como trazabilidad." className="md:hidden" />;
  if (!hasCanonicalAssignee) return <StatePanel tone="warning" title="Falta asignar responsable" description="Esta OT aún no está vinculada a una persona operativa. Pide a tu jefatura o planificación que asigne el responsable antes de iniciar el trabajo." className="md:hidden" />;
  if (isLoading) return <StatePanel tone="loading" title="Cargando trabajo" className="md:hidden" />;
  if (error) return <StatePanel tone="error" title="No se pudo cargar el trabajo" description={error.message} className="md:hidden" />;

  return <section className="space-y-4 md:hidden" aria-label="Ejecución en terreno">
    <Card className="border-2 shadow-none"><CardContent className="space-y-5 p-5">
      <div><div className="flex items-center justify-between gap-3"><p className="font-mono text-xs text-muted-foreground">{workOrderNumber || 'OT'}</p><Badge variant={timerStatus === 'running' ? 'default' : 'outline'}>{timerStatus === 'running' ? 'En curso' : timerStatus === 'paused' ? 'Pausada' : 'Pendiente'}</Badge></div><h1 className="mt-3 text-xl font-semibold leading-tight">{title || 'Trabajo asignado'}</h1></div>
      <div className="flex items-center gap-3 border-y py-4"><Clock3 className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Tiempo registrado</p><p className="font-mono text-2xl font-semibold tabular-nums">{duration(totalMinutes)}</p></div></div>
      {status !== 'in_progress' ? <Button size="lg" className="h-14 w-full text-base" disabled={busy} onClick={() => void startWork()}><CirclePlay className="mr-2 h-5 w-5" />{busy ? 'Iniciando...' : 'Iniciar trabajo'}</Button> : timerStatus === 'running' ? <Button size="lg" variant="outline" className="h-14 w-full text-base" disabled={busy} onClick={() => void timerAction('pause')}><CirclePause className="mr-2 h-5 w-5" />{busy ? 'Guardando...' : 'Pausar trabajo'}</Button> : <Button size="lg" className="h-14 w-full text-base" disabled={busy} onClick={() => void timerAction('resume')}><CirclePlay className="mr-2 h-5 w-5" />{busy ? 'Guardando...' : 'Reanudar trabajo'}</Button>}
      {status === 'in_progress' ? <Button size="lg" variant="outline" className="h-14 w-full text-base" disabled={busy} onClick={() => void finishWork()}><SquareStop className="mr-2 h-5 w-5" />Terminar y registrar evidencia</Button> : null}
    </CardContent></Card>
    <p className="flex gap-2 px-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />La OT no se completa aquí: el cierre exige registrar causa, acción preventiva, horas reales y evidencia de horómetro.</p>
    {message ? <StatePanel tone="error" title="No se pudo guardar" description={message} /> : null}
  </section>;
}
