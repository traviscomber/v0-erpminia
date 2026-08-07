'use client';

import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CalendarDays, Clock3, RefreshCw, Users, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type WorkOrder = {
  id: string;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  scheduled_date: string | null;
  planned_duration_hours: number | null;
  assigned_person_id: string | null;
  assigned_to_name: string | null;
  canonical_asset_id: string | null;
};
type Person = { id: string; full_name: string | null; role_title: string | null; employment_status: string | null };
type Asset = { id: string; asset_code: string | null; asset_name: string | null; criticality: string | null };
type Conflict = { type: string; workOrderId: string; detail: string };

type PlanningData = {
  period?: { from: string; until: string };
  workOrders: WorkOrder[];
  preventive: Array<{ id: string; task_name: string | null; priority: string | null; next_scheduled_date: string | null; estimated_duration_hours: number | null; canonical_asset_id: string | null; generated_work_order_id: string | null }>;
  people: Person[];
  assets: Asset[];
  windows: Array<{ id: string; resource_type: 'person' | 'asset'; resource_id: string; start_date: string; end_date: string; availability: string; reason: string | null }>;
  conflicts: Conflict[];
  capacity: Array<{ personId: string; plannedHours: number }>;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la planificación');
  return payload as PlanningData;
};

export default function PlanificacionRecursosPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/planning/maintenance', fetcher, { revalidateOnFocus: false });
  const [workOrderId, setWorkOrderId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedPersonId, setAssignedPersonId] = useState('none');
  const [resourceType, setResourceType] = useState<'person' | 'asset'>('person');
  const [resourceId, setResourceId] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const peopleById = useMemo(() => new Map((data?.people || []).map((person) => [person.id, person])), [data?.people]);
  const assetsById = useMemo(() => new Map((data?.assets || []).map((asset) => [asset.id, asset])), [data?.assets]);
  const conflictsByOrder = useMemo(() => {
    const map = new Map<string, Conflict[]>();
    for (const conflict of data?.conflicts || []) map.set(conflict.workOrderId, [...(map.get(conflict.workOrderId) || []), conflict]);
    return map;
  }, [data?.conflicts]);

  async function scheduleWorkOrder(event: FormEvent) {
    event.preventDefault();
    if (!workOrderId || !scheduledDate) return;
    setSaving(true); setMessage(null);
    const response = await fetch('/api/planning/maintenance', {
      method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workOrderId, scheduledDate, assignedPersonId: assignedPersonId === 'none' ? null : assignedPersonId }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setMessage(Array.isArray(payload?.conflicts) ? payload.conflicts.join(' ') : payload?.error || 'No se pudo programar la OT.');
      return;
    }
    setMessage('Programación guardada sobre la OT original.');
    await mutate();
  }

  async function createWindow(event: FormEvent) {
    event.preventDefault();
    if (!resourceId || !windowStart || !windowEnd) return;
    setSaving(true); setMessage(null);
    const response = await fetch('/api/planning/maintenance', {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resourceType, resourceId, startDate: windowStart, endDate: windowEnd, availability: 'unavailable', reason }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) { setMessage(payload?.error || 'No se pudo guardar la indisponibilidad.'); return; }
    setReason('');
    setMessage('Indisponibilidad registrada.');
    await mutate();
  }

  const workOrders = data?.workOrders || [];
  const totalHours = workOrders.reduce((sum, row) => sum + Number(row.planned_duration_hours || 0), 0);

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Mantenimiento</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Planificación de recursos</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Programa órdenes sobre sus registros originales y detecta choques de personas, equipos e indisponibilidades antes de confirmar.</p>
      </div>
      <Button variant="outline" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
    </section>

    {message && <Card className="shadow-none"><CardContent className="p-4 text-sm">{message}</CardContent></Card>}

    <div className="grid gap-4 md:grid-cols-4">
      <Card className="shadow-none"><CardContent className="p-5"><CalendarDays className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-semibold">{workOrders.length}</p><p className="text-sm text-muted-foreground">OT programadas</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><Clock3 className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-semibold">{totalHours.toLocaleString('es-CL')}</p><p className="text-sm text-muted-foreground">Horas planificadas</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><Users className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-semibold">{data?.capacity?.length || 0}</p><p className="text-sm text-muted-foreground">Personas con carga</p></CardContent></Card>
      <Card className="shadow-none"><CardContent className="p-5"><AlertTriangle className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-2xl font-semibold">{data?.conflicts?.length || 0}</p><p className="text-sm text-muted-foreground">Conflictos detectados</p></CardContent></Card>
    </div>

    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Programar OT</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={scheduleWorkOrder}>
          <div className="space-y-2"><Label>Orden</Label><Select value={workOrderId} onValueChange={setWorkOrderId}><SelectTrigger><SelectValue placeholder="Seleccionar OT" /></SelectTrigger><SelectContent>{workOrders.map((row) => <SelectItem key={row.id} value={row.id}>{row.work_order_number || 'OT'} · {row.title || 'Sin título'}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></div>
          <div className="space-y-2"><Label>Responsable</Label><Select value={assignedPersonId} onValueChange={setAssignedPersonId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin asignar</SelectItem>{(data?.people || []).map((person) => <SelectItem key={person.id} value={person.id}>{person.full_name || 'Persona'}</SelectItem>)}</SelectContent></Select></div>
          <Button className="w-full" disabled={saving || !workOrderId || !scheduledDate}>Guardar programación</Button>
        </form></CardContent></Card>

        <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Registrar indisponibilidad</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={createWindow}>
          <div className="space-y-2"><Label>Tipo de recurso</Label><Select value={resourceType} onValueChange={(value) => { setResourceType(value as 'person' | 'asset'); setResourceId(''); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="person">Persona</SelectItem><SelectItem value="asset">Equipo</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Recurso</Label><Select value={resourceId} onValueChange={setResourceId}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{resourceType === 'person' ? (data?.people || []).map((person) => <SelectItem key={person.id} value={person.id}>{person.full_name || 'Persona'}</SelectItem>) : (data?.assets || []).map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.asset_code ? `${asset.asset_code} · ` : ''}{asset.asset_name || 'Equipo'}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>Desde</Label><Input type="date" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} /></div><div className="space-y-2"><Label>Hasta</Label><Input type="date" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} /></div></div>
          <div className="space-y-2"><Label>Motivo</Label><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Vacaciones, equipo fuera de servicio…" /></div>
          <Button className="w-full" variant="outline" disabled={saving || !resourceId || !windowStart || !windowEnd}>Registrar</Button>
        </form></CardContent></Card>
      </div>

      <div className="space-y-6">
        <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Programa de los próximos 45 días</CardTitle></CardHeader><CardContent className="p-0">
          {error ? <div className="p-6 text-sm text-muted-foreground">No se pudo cargar la planificación.</div> : isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando…</div> : workOrders.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No hay OT programadas en el período.</div> : <div className="divide-y border-t">{workOrders.map((row) => {
            const asset = row.canonical_asset_id ? assetsById.get(row.canonical_asset_id) : null;
            const rowConflicts = conflictsByOrder.get(row.id) || [];
            return <div key={row.id} className="p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{row.scheduled_date || 'Sin fecha'}</Badge>{row.priority && <Badge variant="outline">{row.priority}</Badge>}{rowConflicts.length > 0 && <Badge variant="destructive">Conflicto</Badge>}</div><p className="mt-2 font-medium">{row.work_order_number || 'OT'} · {row.title || 'Sin título'}</p><p className="mt-1 text-sm text-muted-foreground">{asset?.asset_name || 'Equipo sin asociar'} · {row.assigned_to_name || (row.assigned_person_id ? peopleById.get(row.assigned_person_id)?.full_name : null) || 'Sin responsable'} · {Number(row.planned_duration_hours || 0).toLocaleString('es-CL')} h</p>{rowConflicts.map((conflict, index) => <p key={`${conflict.type}-${index}`} className="mt-2 text-xs text-destructive">{conflict.detail}</p>)}</div><Button variant="ghost" size="sm" asChild><a href={`/dashboard/mantenimiento/ordenes-trabajo/${row.id}`}><Wrench className="mr-2 h-4 w-4" />Abrir OT</a></Button></div></div>;
          })}</div>}
        </CardContent></Card>

        <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Preventivos próximos</CardTitle></CardHeader><CardContent className="p-0">{(data?.preventive || []).length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No hay preventivos próximos.</div> : <div className="divide-y border-t">{(data?.preventive || []).map((row) => <div key={row.id} className="p-4"><div className="flex flex-wrap gap-2"><Badge variant="outline">{row.next_scheduled_date || 'Sin fecha'}</Badge>{row.priority && <Badge variant="outline">{row.priority}</Badge>}{row.generated_work_order_id && <Badge variant="secondary">OT generada</Badge>}</div><p className="mt-2 font-medium">{row.task_name || 'Mantenimiento preventivo'}</p><p className="mt-1 text-sm text-muted-foreground">{row.canonical_asset_id ? assetsById.get(row.canonical_asset_id)?.asset_name || 'Equipo' : 'Equipo sin asociar'} · {Number(row.estimated_duration_hours || 0).toLocaleString('es-CL')} h</p></div>)}</div>}</CardContent></Card>
      </div>
    </div>
  </div>;
}
