'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, Gauge, RefreshCw, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el preventivo por horas');
  return payload;
};

const number = (value: unknown) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(Number(value || 0));

export default function PreventiveHoursPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/preventive-hours', fetcher, { revalidateOnFocus: false });
  const summary = data?.summary || {};
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Mantenimiento · planificación por uso</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Preventivo por horómetro</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Compara el horómetro disponible con la pauta real configurada para cada equipo. No existen umbrales genéricos ni alertas antes del vencimiento configurado.</p>
      </div>
      <div className="flex gap-2"><Button asChild variant="outline"><Link href="/dashboard/mantenimiento/horometros"><Gauge className="mr-2 h-4 w-4"/>Horómetros</Link></Button><Button variant="outline" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button></div>
    </section>

    {error ? <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="p-6 text-sm text-destructive">No se pudo cargar la pauta preventiva por horas.</CardContent></Card> : null}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ['Pautas configuradas', summary.configured_tasks || 0],
        ['Activos configurados', summary.configured_assets || 0],
        ['Vencidas', summary.overdue_tasks || 0],
        ['Pendientes', summary.pending_tasks || 0],
        ['Con lectura nueva', summary.tasks_using_runtime_reading || 0],
      ].map(([label, value]) => <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}
    </div>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-lg">Pautas horarias</CardTitle></CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando pauta real…</div> : tasks.length === 0 ? <div className="p-8 text-center"><p className="font-medium">No hay pautas horarias configuradas</p><p className="mt-2 text-sm text-muted-foreground">Motil no crea frecuencias por defecto. La planificación aparecerá cuando exista una pauta fuente.</p></div> : <div className="divide-y">{tasks.map((row: any) => {
          const overdue = row.hour_status === 'overdue';
          const review = row.hour_status === 'needs_review';
          const missing = row.hour_status === 'missing_meter' || row.hour_status === 'missing_due_meter';
          return <div key={row.schedule_id} className="p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {overdue ? <Badge variant="destructive">Vencida</Badge> : review ? <Badge variant="secondary">Revisar horómetro</Badge> : missing ? <Badge variant="outline">Sin base suficiente</Badge> : <Badge variant="outline">Pendiente</Badge>}
                  <Badge variant="outline">Cada {number(row.frequency_hours)} h</Badge>
                  <span className="text-xs text-muted-foreground">{row.meter_evidence_source === 'runtime_reading' ? 'Lectura Motil' : 'Snapshot fuente'}</span>
                </div>
                <p className="mt-2 font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Activo sin nombre'}</p>
                <p className="mt-1 text-sm">{row.task_name}</p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span>Actual: {row.effective_current_meter == null ? 'Sin lectura' : `${number(row.effective_current_meter)} h`}</span>
                  <span>Vence: {row.due_meter == null ? 'Sin pauta' : `${number(row.due_meter)} h`}</span>
                  <span>{row.remaining_hours == null ? 'Sin diferencia calculable' : row.remaining_hours < 0 ? `${number(Math.abs(Number(row.remaining_hours)))} h vencidas` : `${number(row.remaining_hours)} h restantes`}</span>
                  <span>Fuente: {row.source_reference || 'Sin referencia'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {overdue ? <Button asChild size="sm"><Link href="/dashboard/mantenimiento/planificacion"><Wrench className="mr-2 h-4 w-4"/>Planificar intervención</Link></Button> : null}
                {(review || missing) ? <Button asChild size="sm" variant="outline"><Link href="/dashboard/mantenimiento/horometros">Resolver horómetro</Link></Button> : null}
              </div>
            </div>
          </div>;
        })}</div>}
      </CardContent>
    </Card>

    <Card className="shadow-none"><CardContent className="p-4 text-xs text-muted-foreground"><AlertTriangle className="mr-1 inline h-3.5 w-3.5"/>Una pauta sólo genera alerta cuando el horómetro efectivo alcanza o supera su vencimiento configurado. Si la base del medidor es inconsistente, Motil exige revisión en vez de alertar.</CardContent></Card>
  </div>;
}
