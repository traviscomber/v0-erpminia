'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Clock3, Download, RefreshCw, Users, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PersonnelSummary {
  totalHours?: number | string;
  totalEntries?: number | string;
  technicians?: number | string;
}

interface PersonnelTechnician {
  technicianId: string;
  name?: string | null;
  entries?: number | string | null;
  hours?: number | string | null;
}

interface PersonnelEntry {
  id: string;
  descripcion?: string | null;
  horas_trabajadas?: number | string | null;
  fecha?: string | null;
}

interface PersonnelResponse {
  summary?: PersonnelSummary;
  technicians?: PersonnelTechnician[];
  recentEntries?: PersonnelEntry[];
}

interface WorkOrderRow {
  id: string;
  work_order_number?: string | null;
  code?: string | null;
  title?: string | null;
  status?: string | null;
}

const fetcher = async (url: string): Promise<PersonnelResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
};

export function MaintenancePersonnelBoard() {
  const { data: workOrdersData, mutate: mutateWorkOrders } = useSWR<{ work_orders?: WorkOrderRow[]; workOrders?: WorkOrderRow[] }>(
    '/api/maintenance/work-orders',
    async (url: string) => {
      const response = await fetch(url, { credentials: 'include' });
      return response.json();
    },
  );
  const { data, error, isLoading, mutate } = useSWR<PersonnelResponse>('/api/maintenance/personal', fetcher);

  const workOrders = Array.isArray(workOrdersData?.work_orders)
    ? workOrdersData.work_orders
    : Array.isArray(workOrdersData?.workOrders)
      ? workOrdersData.workOrders
      : [];
  const [selectedOtId, setSelectedOtId] = useState('');
  const [hoursWorked, setHoursWorked] = useState('1');
  const [timeNotes, setTimeNotes] = useState('');
  const [savingTime, setSavingTime] = useState(false);

  useEffect(() => {
    if (!selectedOtId && workOrders[0]?.id) {
      setSelectedOtId(workOrders[0].id);
    }
  }, [selectedOtId, workOrders]);

  const summary: PersonnelSummary = data?.summary || { totalHours: 0, totalEntries: 0, technicians: 0 };
  const technicians: PersonnelTechnician[] = Array.isArray(data?.technicians) ? data.technicians : [];
  const recentEntries: PersonnelEntry[] = Array.isArray(data?.recentEntries) ? data.recentEntries : [];

  const handleRegisterTime = async () => {
    if (!selectedOtId) {
      toast.error('Selecciona una orden de trabajo');
      return;
    }

    const parsedHours = Number(hoursWorked);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      toast.error('Ingresa horas validas');
      return;
    }

    setSavingTime(true);
    try {
      const response = await fetch('/api/mantenimiento/tiempo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          otId: selectedOtId,
          horasTrabajadas: parsedHours,
          descripcion: timeNotes,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo registrar el tiempo');

      toast.success('Tiempo registrado correctamente');
      setTimeNotes('');
      await mutate();
      await mutateWorkOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el tiempo');
    } finally {
      setSavingTime(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personal de mantencion</h1>
          <p className="mt-2 text-muted-foreground">Horas reales, técnicos activos y registros recientes del módulo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/personal/importar">
              <Download className="h-4 w-4" />
              Importar Excel
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void mutate()}>
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/mantenimiento/bitacora">Bitácora</Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href="/dashboard/mantenimiento/gerencial">Gerencial</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock3 className="h-4 w-4 text-primary" />
              Horas totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Number(summary.totalHours || 0).toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-blue-500" />
              Registros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalEntries || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-green-500" />
              Técnicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.technicians || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Registrar horas en mantenimiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ot">Orden de trabajo</Label>
            <select
              id="ot"
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
              value={selectedOtId}
              onChange={(event) => setSelectedOtId(event.target.value)}
            >
              <option value="">Selecciona una OT</option>
              {workOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.work_order_number || order.code || order.title || order.id}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label htmlFor="hours">Horas trabajadas</Label>
              <Input id="hours" type="number" step="0.1" min="0" value={hoursWorked} onChange={(event) => setHoursWorked(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Descripcion del trabajo</Label>
              <Textarea
                id="notes"
                rows={3}
                value={timeNotes}
                onChange={(event) => setTimeNotes(event.target.value)}
                placeholder="Detalle breve de la tarea realizada"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Este registro se guarda en `mantenimiento_tiempo` y se refleja en el resumen del equipo humano.
            </p>
            <Button type="button" onClick={handleRegisterTime} disabled={savingTime}>
              {savingTime ? 'Guardando...' : 'Registrar horas'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground">Acceso rápido a mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/costos">
                Costo por equipo
                <Clock3 className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/componentes-mayores">
                Componentes mayores
                <Wrench className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/planificacion">
                Planificación
                <Wrench className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/dashboard/mantenimiento/vehiculos">
                Vehículos y QR
                <Users className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top técnicos por horas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando personal...</div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              No fue posible cargar el personal de mantenimiento.
            </div>
          ) : technicians.length > 0 ? (
            technicians.map((tech) => (
              <div key={tech.technicianId} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-semibold">{tech.name || 'Técnico'}</p>
                  <p className="text-xs text-muted-foreground">{tech.entries} registros</p>
                </div>
                <Badge variant="outline">{Number(tech.hours || 0).toFixed(1)} h</Badge>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Todavía no hay horas registradas para resumir.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos registros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentEntries.length > 0 ? (
            recentEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{entry.descripcion || 'Tiempo registrado'}</p>
                  <Badge variant="outline">{Number(entry.horas_trabajadas || 0).toFixed(1)} h</Badge>
                </div>
                <p className="text-muted-foreground">{entry.fecha ? new Date(entry.fecha).toLocaleDateString('es-CL') : 'Sin fecha'}</p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No hay registros recientes.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
