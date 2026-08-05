'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Asset = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  model: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los activos');
  return payload;
};

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get('assetId') || '';
  const [canonicalAssetId, setCanonicalAssetId] = useState(initialAssetId);
  const [title, setTitle] = useState(searchParams.get('title') || '');
  const [description, setDescription] = useState(searchParams.get('description') || '');
  const [workType, setWorkType] = useState(searchParams.get('workType') || 'preventive');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'medium');
  const [scheduledDate, setScheduledDate] = useState(searchParams.get('scheduledDate') || new Date().toISOString().slice(0, 10));
  const [plannedHours, setPlannedHours] = useState(searchParams.get('plannedDurationHours') || '');
  const [assignedToName, setAssignedToName] = useState('');
  const [meterReading, setMeterReading] = useState('');
  const [meterUnit, setMeterUnit] = useState('hours');
  const [submitting, setSubmitting] = useState(false);

  const { data, error, isLoading } = useSWR('/api/maintenance/equipment', fetcher, { revalidateOnFocus: false });
  const assets = useMemo(() => (Array.isArray(data?.equipment) ? (data.equipment as Asset[]) : []), [data]);
  const selectedAsset = assets.find((asset) => asset.id === canonicalAssetId) || null;

  const submit = async () => {
    if (!canonicalAssetId) return toast.error('Selecciona un activo');
    if (!title.trim()) return toast.error('Ingresa el trabajo a realizar');

    setSubmitting(true);
    try {
      const response = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          canonicalAssetId,
          title: title.trim(),
          description: description.trim() || null,
          workType,
          priority,
          scheduledDate: scheduledDate || null,
          plannedDurationHours: plannedHours ? Number(plannedHours) : 0,
          assignedToName: assignedToName.trim() || null,
          meterReading: meterReading ? Number(meterReading) : null,
          meterUnit: meterReading ? meterUnit : null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo crear la OT');
      toast.success('Orden de trabajo creada');
      router.push(`/dashboard/mantenimiento/ordenes-trabajo/${payload.data.id}`);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'No se pudo crear la OT');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Flujo central</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Nueva orden de trabajo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">La OT quedará vinculada al activo, sus repuestos, costos, mano de obra y trazabilidad.</p>
        </div>
        <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link></Button>
      </section>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />Datos de la intervención</CardTitle>
          <CardDescription>Una OT siempre debe pertenecer a un activo canónico.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Activo</Label>
            <Select value={canonicalAssetId} onValueChange={setCanonicalAssetId} disabled={isLoading}>
              <SelectTrigger><SelectValue placeholder={isLoading ? 'Cargando activos...' : 'Seleccionar activo'} /></SelectTrigger>
              <SelectContent>{assets.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.code} · {asset.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedAsset ? <p className="text-xs text-muted-foreground">{selectedAsset.type}{selectedAsset.model ? ` · ${selectedAsset.model}` : ''} · {selectedAsset.status}</p> : null}
            {error ? <p className="text-sm text-destructive">No se pudieron cargar los activos.</p> : null}
          </div>

          <div className="space-y-2 md:col-span-2"><Label>Trabajo a realizar</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Cambio de filtros y revisión del sistema hidráulico" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Descripción y alcance</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Diagnóstico inicial, condiciones observadas y alcance esperado" rows={4} /></div>
          <div className="space-y-2"><Label>Tipo</Label><Select value={workType} onValueChange={setWorkType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">Correctiva</SelectItem><SelectItem value="preventive">Preventiva</SelectItem><SelectItem value="predictive">Predictiva</SelectItem><SelectItem value="inspection">Inspección</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Prioridad</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Fecha programada</Label><Input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></div>
          <div className="space-y-2"><Label>Horas planificadas</Label><Input type="number" min="0" step="0.5" value={plannedHours} onChange={(event) => setPlannedHours(event.target.value)} placeholder="0" /></div>
          <div className="space-y-2"><Label>Responsable</Label><Input value={assignedToName} onChange={(event) => setAssignedToName(event.target.value)} placeholder="Nombre del técnico o cuadrilla" /></div>
          <div className="grid grid-cols-[1fr_130px] gap-2"><div className="space-y-2"><Label>Lectura inicial</Label><Input type="number" min="0" step="0.1" value={meterReading} onChange={(event) => setMeterReading(event.target.value)} placeholder="Opcional" /></div><div className="space-y-2"><Label>Unidad</Label><Select value={meterUnit} onValueChange={setMeterUnit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hours">Horas</SelectItem><SelectItem value="km">Kilómetros</SelectItem><SelectItem value="cycles">Ciclos</SelectItem></SelectContent></Select></div></div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={submit} disabled={submitting || isLoading || !canonicalAssetId}>{submitting ? 'Creando OT...' : 'Crear orden de trabajo'}</Button></div>
    </div>
  );
}
