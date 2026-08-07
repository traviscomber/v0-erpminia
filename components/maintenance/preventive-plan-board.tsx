'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { CalendarClock, CheckCircle2, PauseCircle, PlayCircle, Plus, RefreshCw, Wrench } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Asset = { id: string; asset_code: string; asset_name: string; asset_type?: string | null; location?: string | null };
type Schedule = { id: string; asset_id: string; task_name: string; description?: string | null; frequency_days?: number | null; frequency_hours?: number | null; next_scheduled_date?: string | null; estimated_duration_hours?: number | null; priority?: string | null; enabled: boolean; generated_work_order_id?: string | null; asset?: Asset | null };
type Response = { schedules: Schedule[]; assets: Asset[]; summary: { total: number; overdue: number; dueSoon: number; disabled: number; generated: number } };

const fetcher = async (url: string): Promise<Response> => {
  const response = await apiFetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la planificación preventiva.');
  return payload;
};

function dueState(date?: string | null) {
  if (!date) return { label: 'Sin fecha', tone: 'secondary' as const };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(`${date}T00:00:00`);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: `Vencida hace ${Math.abs(days)} días`, tone: 'destructive' as const };
  if (days === 0) return { label: 'Vence hoy', tone: 'destructive' as const };
  if (days <= 30) return { label: `Vence en ${days} días`, tone: 'default' as const };
  return { label: date, tone: 'secondary' as const };
}

export function PreventivePlanBoard() {
  const { data, error, isLoading, mutate } = useSWR<Response>('/api/maintenance/preventive', fetcher, { revalidateOnFocus: false });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ assetId: '', taskName: '', description: '', frequencyDays: '', frequencyHours: '', nextScheduledDate: '', estimatedDurationHours: '', priority: 'medium' });

  const schedules = data?.schedules || [];
  const ordered = useMemo(() => [...schedules].sort((a, b) => String(a.next_scheduled_date || '9999').localeCompare(String(b.next_scheduled_date || '9999'))), [schedules]);

  async function submit() {
    setSaving(true); setMessage('');
    try {
      const response = await apiFetch('/api/maintenance/preventive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo crear el plan.');
      setForm({ assetId: '', taskName: '', description: '', frequencyDays: '', frequencyHours: '', nextScheduledDate: '', estimatedDurationHours: '', priority: 'medium' });
      setShowForm(false); setMessage('Plan preventivo creado.'); await mutate();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo crear el plan.'); }
    finally { setSaving(false); }
  }

  async function act(scheduleId: string, action: 'toggle' | 'generate') {
    setMessage('');
    try {
      const response = await apiFetch('/api/maintenance/preventive', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduleId, action }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo actualizar el plan.');
      setMessage(action === 'generate' ? 'Orden de trabajo creada desde el plan.' : 'Estado actualizado.');
      await mutate();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No se pudo actualizar el plan.'); }
  }

  return <main className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mantenimiento</p><h1 className="mt-1 text-2xl font-semibold">Planificación preventiva</h1><p className="mt-1 text-sm text-muted-foreground">Planes reales por equipo, vencimientos y generación controlada de órdenes.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void mutate()}><RefreshCw className="h-4 w-4"/>Actualizar</Button><Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4"/>Nuevo plan</Button></div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[
      ['Planes', data?.summary.total || 0], ['Vencidos', data?.summary.overdue || 0], ['Próximos 30 días', data?.summary.dueSoon || 0], ['Pausados', data?.summary.disabled || 0], ['OT generadas', data?.summary.generated || 0],
    ].map(([label, value]) => <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></CardContent></Card>)}</section>

    {showForm && <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Nuevo plan preventivo</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Select value={form.assetId} onValueChange={(value) => setForm({ ...form, assetId: value })}><SelectTrigger><SelectValue placeholder="Equipo"/></SelectTrigger><SelectContent>{(data?.assets || []).map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.asset_code} · {asset.asset_name}</SelectItem>)}</SelectContent></Select>
      <Input placeholder="Tarea" value={form.taskName} onChange={(e) => setForm({ ...form, taskName: e.target.value })}/>
      <Input type="date" value={form.nextScheduledDate} onChange={(e) => setForm({ ...form, nextScheduledDate: e.target.value })}/>
      <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select>
      <Input type="number" min="1" placeholder="Frecuencia en días" value={form.frequencyDays} onChange={(e) => setForm({ ...form, frequencyDays: e.target.value })}/>
      <Input type="number" min="1" placeholder="Frecuencia en horas" value={form.frequencyHours} onChange={(e) => setForm({ ...form, frequencyHours: e.target.value })}/>
      <Input type="number" min="0" step="0.5" placeholder="Duración estimada" value={form.estimatedDurationHours} onChange={(e) => setForm({ ...form, estimatedDurationHours: e.target.value })}/>
      <Input placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
      <div className="md:col-span-2 xl:col-span-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button disabled={saving} onClick={() => void submit()}>{saving ? 'Guardando…' : 'Guardar plan'}</Button></div>
    </CardContent></Card>}

    {message && <p className="rounded-lg border p-3 text-sm">{message}</p>}
    {error && <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error.message}</p>}
    {isLoading ? <div className="h-40 animate-pulse rounded-lg bg-muted"/> : ordered.length === 0 ? <Card className="border-dashed shadow-none"><CardContent className="p-10 text-center text-sm text-muted-foreground">No existen planes preventivos registrados. Crea el primero desde “Nuevo plan”.</CardContent></Card> : <div className="space-y-3">{ordered.map((schedule) => { const state = dueState(schedule.next_scheduled_date); return <Card key={schedule.id} className="shadow-none"><CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_180px_170px_auto] lg:items-center">
      <div><div className="flex flex-wrap gap-2"><Badge variant={state.tone}>{state.label}</Badge><Badge variant="outline">{schedule.priority || 'medium'}</Badge>{!schedule.enabled && <Badge variant="secondary">Pausado</Badge>}</div><p className="mt-2 font-medium">{schedule.task_name}</p><p className="text-sm text-muted-foreground">{schedule.asset?.asset_code || 'Sin código'} · {schedule.asset?.asset_name || 'Equipo no disponible'}</p>{schedule.description && <p className="mt-1 text-sm text-muted-foreground">{schedule.description}</p>}</div>
      <div><p className="text-xs text-muted-foreground">Frecuencia</p><p className="text-sm">{schedule.frequency_days ? `Cada ${schedule.frequency_days} días` : schedule.frequency_hours ? `Cada ${schedule.frequency_hours} horas` : 'No definida'}</p></div>
      <div><p className="text-xs text-muted-foreground">Orden relacionada</p>{schedule.generated_work_order_id ? <Button asChild variant="link" className="h-auto p-0"><Link href={`/dashboard/mantenimiento/ordenes-trabajo/${schedule.generated_work_order_id}`}><CheckCircle2 className="h-4 w-4"/>Abrir OT</Link></Button> : <p className="text-sm text-muted-foreground">Aún no generada</p>}</div>
      <div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={() => void act(schedule.id, 'toggle')}>{schedule.enabled ? <PauseCircle className="h-4 w-4"/> : <PlayCircle className="h-4 w-4"/>}{schedule.enabled ? 'Pausar' : 'Activar'}</Button><Button size="sm" disabled={!schedule.enabled || Boolean(schedule.generated_work_order_id)} onClick={() => void act(schedule.id, 'generate')}><Wrench className="h-4 w-4"/>Crear OT</Button></div>
    </CardContent></Card>; })}</div>}
  </main>;
}
