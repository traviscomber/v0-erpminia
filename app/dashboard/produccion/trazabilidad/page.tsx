'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ClipboardCheck, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la trazabilidad');
  return payload;
};

type Worker = { id: string; name: string; cargo: string; workerType: 'operario' | 'mecanico' };
type Asset = { id: string; asset_code: string; name: string; asset_type: string | null; category: string | null };
type Activity = {
  id: string;
  operation_date: string;
  shift_code: string;
  activity_type: string;
  activity_status: string;
  actual_hours: number | null;
  output_quantity: number | null;
  output_unit: string | null;
  checklist_completed: boolean | null;
  safety_observation: boolean;
  notes: string | null;
  person: Worker;
  asset: Asset | null;
};

type ResponseData = { workers: Worker[]; assets: Asset[]; activity: Activity[] };

export default function OperatorTraceabilityPage() {
  const { data, error, isLoading, mutate } = useSWR<ResponseData>('/api/produccion/operator-traceability?limit=150', fetcher, { revalidateOnFocus: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState({
    person_id: '', operation_date: today, shift_code: 'A', canonical_asset_id: 'none', activity_type: '', activity_status: 'completed',
    planned_hours: '', actual_hours: '', output_quantity: '', output_unit: 't', checklist_completed: 'yes', safety_observation: 'no', notes: '',
  });

  const setField = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/produccion/operator-traceability', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          canonical_asset_id: form.canonical_asset_id === 'none' ? null : form.canonical_asset_id,
          checklist_completed: form.checklist_completed === 'yes',
          safety_observation: form.safety_observation === 'yes',
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar');
      setMessage('Actividad registrada. Ya forma parte del historial de la persona y del equipo.');
      setForm((current) => ({ ...current, activity_type: '', planned_hours: '', actual_hours: '', output_quantity: '', notes: '' }));
      await mutate();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <StatePanel tone="loading" title="Cargando trazabilidad" description="Reuniendo personas, equipos e historial operacional." />;
  if (error) return <StatePanel tone="error" title="No se pudo cargar la trazabilidad" description={error instanceof Error ? error.message : 'Reintenta la consulta.'} />;

  const workers = data?.workers ?? [];
  const assets = data?.assets ?? [];
  const activity = data?.activity ?? [];

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Producción · Personal</PageHeaderEyebrow>
          <PageHeaderTitle>Trazabilidad operacional</PageHeaderTitle>
          <PageHeaderDescription>Registra quién operó, en qué turno, con qué equipo y qué resultado obtuvo. El historial se conserva para evaluación y aprendizaje operacional.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button onClick={submit} disabled={saving || !form.person_id || !form.activity_type} className="gap-2"><Save className="h-4 w-4" />{saving ? 'Guardando' : 'Registrar'}</Button>
        </PageHeaderActions>
      </PageHeader>

      {workers.length === 0 ? (
        <StatePanel tone="neutral" title="No hay operarios o mecánicos clasificables" description="Primero asigna cargos de Operario/Operador o Mecánico en la matriz de cargos. La trazabilidad no acepta nombres libres." />
      ) : (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4 rounded-lg border p-4">
            <div><h2 className="font-semibold">Registrar actividad</h2><p className="text-sm text-muted-foreground">Una actividad = una persona, un turno y una evidencia operacional.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label>Persona</Label><Select value={form.person_id} onValueChange={(value) => setField('person_id', value)}><SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger><SelectContent>{workers.map((worker) => <SelectItem key={worker.id} value={worker.id}>{worker.name} · {worker.cargo}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={form.operation_date} onChange={(event) => setField('operation_date', event.target.value)} /></div>
              <div className="space-y-2"><Label>Turno</Label><Input value={form.shift_code} onChange={(event) => setField('shift_code', event.target.value)} placeholder="A / B / Día / Noche" /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Equipo o vehículo</Label><Select value={form.canonical_asset_id} onValueChange={(value) => setField('canonical_asset_id', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin equipo asociado</SelectItem>{assets.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.asset_code} · {asset.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2 sm:col-span-2"><Label>Actividad</Label><Input value={form.activity_type} onChange={(event) => setField('activity_type', event.target.value)} placeholder="Ej. operación cargador, transporte, chancado, inspección preuso" /></div>
              <div className="space-y-2"><Label>Horas planificadas</Label><Input type="number" min="0" step="0.1" value={form.planned_hours} onChange={(event) => setField('planned_hours', event.target.value)} /></div>
              <div className="space-y-2"><Label>Horas reales</Label><Input type="number" min="0" step="0.1" value={form.actual_hours} onChange={(event) => setField('actual_hours', event.target.value)} /></div>
              <div className="space-y-2"><Label>Resultado</Label><Input type="number" min="0" step="0.01" value={form.output_quantity} onChange={(event) => setField('output_quantity', event.target.value)} placeholder="Cantidad" /></div>
              <div className="space-y-2"><Label>Unidad</Label><Input value={form.output_unit} onChange={(event) => setField('output_unit', event.target.value)} placeholder="t, viajes, h" /></div>
              <div className="space-y-2"><Label>Checklist</Label><Select value={form.checklist_completed} onValueChange={(value) => setField('checklist_completed', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Completado</SelectItem><SelectItem value="no">No completado</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Observación de seguridad</Label><Select value={form.safety_observation} onValueChange={(value) => setField('safety_observation', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">Sin observación</SelectItem><SelectItem value="yes">Con observación</SelectItem></SelectContent></Select></div>
              <div className="space-y-2 sm:col-span-2"><Label>Notas</Label><Input value={form.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Sólo hechos relevantes del turno" /></div>
            </div>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>

          <div className="rounded-lg border">
            <div className="border-b px-4 py-3"><h2 className="font-semibold">Historial reciente</h2><p className="text-sm text-muted-foreground">Últimos registros canónicos, sin borrar históricos.</p></div>
            {activity.length === 0 ? <div className="p-4"><StatePanel tone="neutral" title="Sin actividad registrada" description="Los nuevos registros aparecerán aquí y luego alimentarán la evaluación de operarios." /></div> : <div>{activity.map((row) => <div key={row.id} className="border-b px-4 py-3 last:border-b-0"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{row.person?.name || 'Persona'}</p><p className="text-sm text-muted-foreground">{row.operation_date} · Turno {row.shift_code} · {row.activity_type}</p></div><span className="text-xs text-muted-foreground">{row.person?.workerType === 'operario' ? 'Operario' : 'Mecánico'}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{row.asset ? `${row.asset.asset_code} · ${row.asset.name}` : 'Sin equipo'}</span>{row.actual_hours !== null ? <span>{row.actual_hours} h</span> : null}{row.output_quantity !== null ? <span>{row.output_quantity} {row.output_unit || ''}</span> : null}<span>Checklist: {row.checklist_completed === null ? 'N/D' : row.checklist_completed ? 'Sí' : 'No'}</span>{row.safety_observation ? <span>Observación seguridad</span> : null}</div>{row.notes ? <p className="mt-2 text-sm">{row.notes}</p> : null}</div>)}</div>}
          </div>
        </section>
      )}

      <div className="flex items-start gap-2 border-t pt-4 text-sm text-muted-foreground"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>Esta trazabilidad registra evidencia. No genera por sí sola una nota de desempeño; el score de operarios se calculará sólo cuando exista volumen suficiente y reglas comparables por función, turno y equipo.</p></div>
    </div>
  );
}
