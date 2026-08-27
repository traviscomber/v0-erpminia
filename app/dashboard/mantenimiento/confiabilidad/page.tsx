'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, Clock3, ExternalLink, RefreshCw, Repeat2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la confiabilidad auditada');
  return payload;
};

const money = (value: unknown) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value: unknown, digits = 1) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(Number(value || 0));
const interval = (value: unknown) => value == null ? 'Sin base suficiente' : `${number(value)} días`;
const hours = (value: unknown) => value == null ? 'Sin base suficiente' : `${number(value)} h`;

export default function ReliabilityPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/maintenance/reliability', fetcher, { revalidateOnFocus: false });
  const summary = data?.summary || {};
  const assets = Array.isArray(data?.assets) ? data.assets : [];
  const recurringCauses = Array.isArray(data?.recurringCauses) ? data.recurringCauses : [];

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Mantenimiento · evidencia auditada</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Confiabilidad y recurrencia</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Cruza cierres auditados con horómetro real. MTBF sólo aparece cuando existen dos eventos correctivos comparables y el medidor no se reinició entre ellos.</p>
      </div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/dashboard/mantenimiento/horometros">Horómetros</Link></Button><Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo/cierre">Cerrar OT</Link></Button><Button variant="outline" onClick={() => void mutate()}><RefreshCw className="mr-2 h-4 w-4"/>Actualizar</Button></div>
    </section>

    {error ? <Card className="border-destructive/30 bg-destructive/5 shadow-none"><CardContent className="p-6 text-sm text-destructive">No se pudo cargar la confiabilidad auditada.</CardContent></Card> : null}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {[
        ['Activos con evidencia', summary.assets_with_audited_closures || 0],
        ['Cierres auditados', summary.audited_closures || 0],
        ['Con MTBF válido', summary.assets_with_valid_mtbf || 0],
        ['Intervalos MTBF', summary.valid_mtbf_intervals || 0],
        ['Horas reales OT', number(summary.total_actual_hours || 0)],
        ['Costo auditado', money(summary.audited_total_cost || 0)],
      ].map(([label, value]) => <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}
    </div>

    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-lg">Confiabilidad por equipo</CardTitle></CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="p-6 text-sm text-muted-foreground">Cargando evidencia auditada…</div> : assets.length === 0 ? <div className="p-8 text-center"><p className="font-medium">Todavía no hay cierres auditados</p><p className="mt-2 text-sm text-muted-foreground">Las OT históricas sin snapshot no se usan para inferir recurrencia, costo ni MTBF. La vista empezará a aprender con cierres nuevos y lecturas reales de horómetro.</p><div className="mt-4 flex justify-center gap-2"><Button asChild variant="outline"><Link href="/dashboard/mantenimiento/horometros">Registrar horómetro</Link></Button><Button asChild variant="outline"><Link href="/dashboard/mantenimiento/ordenes-trabajo/cierre">Ir a cierre progresivo</Link></Button></div></div> : <div className="divide-y">{assets.map((row: any) => <div key={row.canonical_asset_id} className="p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{row.audited_closures} cierre{Number(row.audited_closures) === 1 ? '' : 's'}</Badge>{Number(row.runtime?.valid_mtbf_intervals || 0) > 0 ? <Badge variant="secondary">MTBF con evidencia</Badge> : <Badge variant="outline">MTBF pendiente</Badge>}{row.has_recurring_root_cause ? <Badge variant="destructive">Causa recurrente</Badge> : null}</div><p className="mt-3 font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name || 'Equipo sin nombre'}</p><div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-3 xl:grid-cols-6"><span><Repeat2 className="mr-1 inline h-3.5 w-3.5"/>MTBF: {hours(row.runtime?.mtbf_operating_hours)}</span><span>MTTR: {hours(row.runtime?.mttr_hours)}</span><span>Cobertura horómetro: {row.runtime?.meter_event_coverage_percent == null ? 'Sin base' : `${number(row.runtime.meter_event_coverage_percent)}%`}</span><span><Clock3 className="mr-1 inline h-3.5 w-3.5"/>Detención: {number(row.total_downtime_hours)} h</span><span>Intervalo calendario: {interval(row.avg_days_between_audited_interventions)}</span><span>Costo: {money(row.audited_total_cost)}</span></div></div><Button asChild size="sm" variant="outline"><Link href={`/dashboard/mantenimiento/equipos/${row.canonical_asset_id}`}><ExternalLink className="mr-2 h-4 w-4"/>Equipo</Link></Button></div></div>)}</div>}
      </CardContent>
    </Card>

    <Card className="shadow-none"><CardHeader><CardTitle className="text-lg">Causas raíz recurrentes</CardTitle></CardHeader><CardContent className="space-y-3">{recurringCauses.length === 0 ? <p className="text-sm text-muted-foreground">No hay causas raíz repetidas con evidencia auditada. Motil no infiere causas ausentes.</p> : recurringCauses.map((row: any) => <div key={`${row.canonical_asset_id}-${row.root_cause_key}`} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{row.asset_code ? `${row.asset_code} · ` : ''}{row.asset_name}</p><p className="mt-1 text-sm">{row.root_cause}</p></div><Badge variant="destructive">{row.occurrences} veces</Badge></div><p className="mt-2 text-xs text-muted-foreground">Costo auditado {money(row.audited_total_cost)} · Horas OT {number(row.total_actual_hours)} · Detención {number(row.total_downtime_hours)} h</p></div>)}</CardContent></Card>

    <Card className="shadow-none"><CardContent className="p-4 text-xs text-muted-foreground"><AlertTriangle className="mr-1 inline h-3.5 w-3.5"/>MTBF usa diferencia de horómetro entre cierres correctivos auditados consecutivos. Si falta una lectura o se detecta reinicio del medidor, ese intervalo se excluye. MTTR usa las horas reales de ejecución registradas en la OT.</CardContent></Card>
  </div>;
}
