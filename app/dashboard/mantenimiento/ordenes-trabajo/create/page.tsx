'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, LoaderCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';
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
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar los equipos.');
  return payload;
};

const assetStatusLabels: Record<string, string> = {
  active: 'Disponible',
  operational: 'Operativo',
  maintenance: 'En mantenimiento',
  inactive: 'Fuera de servicio',
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

  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/equipment', fetcher, { revalidateOnFocus: false });
  const assets = useMemo(() => (Array.isArray(data?.equipment) ? (data.equipment as Asset[]) : []), [data]);
  const selectedAsset = assets.find((asset) => asset.id === canonicalAssetId) || null;

  const validate = () => {
    if (!canonicalAssetId) return 'Selecciona el equipo que requiere el trabajo.';
    if (!title.trim()) return 'Describe brevemente el trabajo a realizar.';
    if (!scheduledDate) return 'Selecciona una fecha programada.';
    if (plannedHours && (!Number.isFinite(Number(plannedHours)) || Number(plannedHours) < 0)) {
      return 'Las horas planificadas deben ser un valor igual o mayor que cero.';
    }
    if (meterReading && (!Number.isFinite(Number(meterReading)) || Number(meterReading) < 0)) {
      return 'La lectura inicial debe ser un valor igual o mayor que cero.';
    }
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) return toast.error(validationError);

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
          scheduledDate,
          plannedDurationHours: plannedHours ? Number(plannedHours) : 0,
          assignedToName: assignedToName.trim() || null,
          meterReading: meterReading ? Number(meterReading) : null,
          meterUnit: meterReading ? meterUnit : null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No fue posible crear la orden.');
      toast.success('Orden de trabajo creada');
      router.push(`/dashboard/mantenimiento/ordenes-trabajo/${payload.data.id}`);
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'No fue posible crear la orden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Mantenimiento</PageHeaderEyebrow>
          <PageHeaderTitle>Crear orden de trabajo</PageHeaderTitle>
          <PageHeaderDescription>
            Registra el equipo, el trabajo requerido y la planificación inicial. Los repuestos, horas y costos se agregan durante la ejecución.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/ordenes-trabajo"><ArrowLeft className="h-4 w-4" />Volver</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {error ? (
        <StatePanel
          tone="error"
          title="No fue posible cargar los equipos"
          description={error.message}
          actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
          className="min-h-0 py-5"
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Equipo y trabajo</CardTitle>
          <CardDescription>Los campos marcados son necesarios para crear la orden.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="asset">Equipo *</Label>
            <Select value={canonicalAssetId} onValueChange={setCanonicalAssetId} disabled={isLoading || Boolean(error)}>
              <SelectTrigger id="asset"><SelectValue placeholder={isLoading ? 'Cargando equipos…' : 'Seleccionar equipo'} /></SelectTrigger>
              <SelectContent>{assets.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.code} · {asset.name}</SelectItem>)}</SelectContent>
            </Select>
            {selectedAsset ? (
              <p className="text-xs text-muted-foreground">
                {selectedAsset.type}{selectedAsset.model ? ` · ${selectedAsset.model}` : ''} · {assetStatusLabels[selectedAsset.status] || selectedAsset.status}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="work-title">Trabajo a realizar *</Label>
            <Input id="work-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Cambiar filtros y revisar sistema hidráulico" maxLength={160} />
            <p className="text-xs text-muted-foreground">Usa una descripción breve que permita identificar la orden rápidamente.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción y alcance</Label>
            <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Condición observada, diagnóstico inicial y alcance esperado" rows={4} />
          </div>

          <div className="space-y-2">
            <Label>Tipo de trabajo *</Label>
            <Select value={workType} onValueChange={setWorkType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="corrective">Correctivo</SelectItem><SelectItem value="preventive">Preventivo</SelectItem><SelectItem value="predictive">Predictivo</SelectItem><SelectItem value="inspection">Inspección</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-2">
            <Label>Prioridad *</Label>
            <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baja</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Planificación inicial</CardTitle>
          <CardDescription>La asignación y las estimaciones pueden ajustarse después.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="scheduled-date">Fecha programada *</Label><Input id="scheduled-date" type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="planned-hours">Horas estimadas</Label><Input id="planned-hours" type="number" min="0" step="0.5" value={plannedHours} onChange={(event) => setPlannedHours(event.target.value)} placeholder="Ej. 4" /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="assigned-to">Responsable o cuadrilla</Label><Input id="assigned-to" value={assignedToName} onChange={(event) => setAssignedToName(event.target.value)} placeholder="Puede asignarse después" /></div>
          <div className="space-y-2"><Label htmlFor="meter-reading">Lectura inicial</Label><Input id="meter-reading" type="number" min="0" step="0.1" value={meterReading} onChange={(event) => setMeterReading(event.target.value)} placeholder="Opcional" /></div>
          <div className="space-y-2"><Label>Unidad de lectura</Label><Select value={meterUnit} onValueChange={setMeterUnit} disabled={!meterReading}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hours">Horas</SelectItem><SelectItem value="km">Kilómetros</SelectItem><SelectItem value="cycles">Ciclos</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo">Cancelar</Link></Button>
        <Button onClick={submit} disabled={submitting || isLoading || Boolean(error)}>
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {submitting ? 'Creando orden…' : 'Crear orden'}
        </Button>
      </div>
    </div>
  );
}
