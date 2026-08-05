'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Clock3, History, PackageCheck, RotateCcw, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la ejecución');
  return payload;
};

const money = (value: number | string | null | undefined) =>
  `$${Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

type WorkOrderPart = {
  id: string;
  quantity_issued: number;
  quantity_installed: number;
  quantity_returned: number;
  unit_cost: number;
  status: string;
  stock?: { part_code?: string; part_name?: string } | null;
};

type LaborEntry = {
  id: string;
  technician_name: string;
  hours: number;
  hourly_cost: number;
  notes?: string | null;
};

type WorkOrderEvent = {
  id: number;
  event_type: string;
  event_at: string;
  summary: string;
  actor_name?: string | null;
};

export function WorkOrderExecutionPanel({ workOrderId }: { workOrderId: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    workOrderId ? `/api/maintenance/work-orders/${workOrderId}/execution` : null,
    fetcher,
  );
  const [technicianName, setTechnicianName] = useState('');
  const [hours, setHours] = useState('');
  const [hourlyCost, setHourlyCost] = useState('');
  const [notes, setNotes] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const parts = (Array.isArray(data?.parts) ? data.parts : []) as WorkOrderPart[];
  const labor = (Array.isArray(data?.labor) ? data.labor : []) as LaborEntry[];
  const events = (Array.isArray(data?.events) ? data.events : []) as WorkOrderEvent[];
  const costs = data?.costs || {};

  const execute = async (payload: Record<string, unknown>, key: string) => {
    setBusyKey(key);
    setMessage(null);
    try {
      const response = await fetch(`/api/maintenance/work-orders/${workOrderId}/execution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'No se pudo registrar la operación');
      await mutate();
    } catch (executionError) {
      setMessage(executionError instanceof Error ? executionError.message : 'No se pudo registrar la operación');
    } finally {
      setBusyKey(null);
    }
  };

  const addLabor = async () => {
    await execute(
      {
        action: 'add_labor',
        technicianName,
        hours: Number(hours),
        hourlyCost: Number(hourlyCost || 0),
        notes: notes || null,
      },
      'labor',
    );
    setTechnicianName('');
    setHours('');
    setHourlyCost('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Costo real de la orden</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Repuestos instalados', costs.parts_cost],
            ['Mano de obra', costs.labor_cost],
            ['Servicios externos', costs.external_cost],
            ['Costo total', costs.total_cost],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{String(label)}</p>
              <p className="mt-1 text-xl font-semibold">{money(value as number)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PackageCheck className="h-4 w-4" />Destino de repuestos entregados</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> : parts.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Aún no hay repuestos entregados desde bodega.</p>
          ) : parts.map((part) => {
            const pending = Number(part.quantity_issued || 0) - Number(part.quantity_installed || 0) - Number(part.quantity_returned || 0);
            return (
              <div key={part.id} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-medium">{part.stock?.part_name || 'Repuesto'}</p>
                  <p className="text-sm text-muted-foreground">{part.stock?.part_code || 'Sin código'} · {money(part.unit_cost)} por unidad</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">Entregados {part.quantity_issued || 0}</Badge>
                    <Badge variant="outline">Instalados {part.quantity_installed || 0}</Badge>
                    <Badge variant="outline">Devueltos {part.quantity_returned || 0}</Badge>
                    <Badge variant={pending > 0 ? 'secondary' : 'outline'}>Pendientes {pending}</Badge>
                  </div>
                </div>
                {pending > 0 ? <div className="flex gap-2">
                  <Button size="sm" disabled={busyKey === part.id} onClick={() => execute({ action: 'install_part', workOrderPartId: part.id, quantity: pending }, part.id)}>
                    <Wrench className="mr-2 h-4 w-4" />Instalar
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyKey === part.id} onClick={() => execute({ action: 'return_part', workOrderPartId: part.id, quantity: pending }, part.id)}>
                    <RotateCcw className="mr-2 h-4 w-4" />Devolver
                  </Button>
                </div> : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4" />Mano de obra</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div><Label>Técnico</Label><Input className="mt-2" value={technicianName} onChange={(event) => setTechnicianName(event.target.value)} placeholder="Nombre completo" /></div>
            <div><Label>Horas</Label><Input className="mt-2" type="number" min="0.1" step="0.1" value={hours} onChange={(event) => setHours(event.target.value)} /></div>
            <div><Label>Costo por hora</Label><Input className="mt-2" type="number" min="0" value={hourlyCost} onChange={(event) => setHourlyCost(event.target.value)} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={addLabor} disabled={busyKey === 'labor' || !technicianName.trim() || Number(hours) <= 0}>Registrar</Button></div>
          </div>
          <div><Label>Nota</Label><Input className="mt-2" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Trabajo realizado o especialidad" /></div>
          {labor.length > 0 ? <div className="divide-y rounded-lg border">{labor.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-4 p-3 text-sm">
              <div><p className="font-medium">{entry.technician_name}</p><p className="text-muted-foreground">{entry.notes || 'Sin nota'}</p></div>
              <div className="text-right"><p>{entry.hours} h</p><p className="text-muted-foreground">{money(Number(entry.hours) * Number(entry.hourly_cost))}</p></div>
            </div>
          ))}</div> : null}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />Trazabilidad de la orden</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">La bitácora se completará con cada acción operativa.</p> : (
            <div className="space-y-0">{events.map((event, index) => (
              <div key={event.id} className="relative flex gap-4 pb-5">
                {index < events.length - 1 ? <span className="absolute left-[7px] top-4 h-full w-px bg-border" /> : null}
                <span className="relative mt-1.5 h-4 w-4 shrink-0 rounded-full border-4 border-background bg-primary" />
                <div><p className="text-sm font-medium">{event.summary || event.event_type}</p><p className="text-xs text-muted-foreground">{new Date(event.event_at).toLocaleString('es-CL')}{event.actor_name ? ` · ${event.actor_name}` : ''}</p></div>
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>

      {error || message ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{message || (error instanceof Error ? error.message : 'No se pudo cargar la ejecución')}</div> : null}
    </div>
  );
}
