'use client';

import useSWR from 'swr';
import { AlertTriangle, Boxes, CheckCircle2, Gauge, History, PackageSearch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

type ForecastData = {
  readiness: 'ready' | 'insufficient_history';
  snapshotDate: string | null;
  current: { productsWithStock:number; outOfStockProducts:number; reorderProducts:number; negativeStockProducts:number };
  history: { movementRows:number; consumptionRows:number; productsWithMovements:number; productsWithConsumption:number; firstDate:string|null; lastDate:string|null; historyDays:number; minHistoryDays:number };
  policy: string;
};

const fetcher = async (url:string) => { const r = await fetch(url,{credentials:'include',cache:'no-store'}); const j = await r.json().catch(()=>null); if(!r.ok) throw new Error(j?.error || 'No fue posible cargar inteligencia de inventario'); return j; };
const n = (value:number) => value.toLocaleString('es-CL');
const date = (value:string|null) => value ? new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(`${value}T12:00:00`)) : 'N/D';

export default function InventoryIntelligencePage(){
  const {data,error,isLoading} = useSWR<ForecastData>('/api/inventory/forecast',fetcher,{revalidateOnFocus:false});
  if(error) return <StatePanel tone="error" title="Inteligencia de Inventario no disponible" description={error.message}/>;
  if(isLoading || !data) return <StatePanel tone="neutral" title="Evaluando Inventario" description="Midiendo snapshot, movimientos y evidencia de consumo."/>;

  const ready = data.readiness === 'ready';
  return <div className="space-y-6">
    <section className="border-b pb-6">
      <p className="text-sm font-medium text-muted-foreground">Bodega · inteligencia operacional</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Cobertura y riesgo de inventario</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Separa posición actual de stock de predicción de consumo. Motil no calcula días de cobertura hasta contar con historial real suficiente.</p>
    </section>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Con stock', n(data.current.productsWithStock), Boxes],
        ['Sin stock', n(data.current.outOfStockProducts), PackageSearch],
        ['Bajo reposición', n(data.current.reorderProducts), Gauge],
        ['Stock negativo', n(data.current.negativeStockProducts), AlertTriangle],
      ].map(([label,value,Icon]:any)=><div key={label} className="bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
    </section>

    <Card>
      <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Forecast de cobertura</CardTitle><CardDescription>Requiere salidas observadas por producto durante al menos {data.history.minHistoryDays} días.</CardDescription></div>{ready?<CheckCircle2 className="h-5 w-5"/>:<AlertTriangle className="h-5 w-5"/>}</div></CardHeader>
      <CardContent className="space-y-4">
        {ready ? <div className="rounded-lg border p-4"><p className="font-medium">Historial suficiente para calcular cobertura por producto</p><p className="mt-1 text-sm text-muted-foreground">El motor puede usar consumo observado; los productos sin salidas históricas seguirán sin forecast.</p></div> : <div className="rounded-lg border border-dashed p-4"><p className="font-medium">Forecast suspendido por falta de historial</p><p className="mt-1 text-sm text-muted-foreground">Actualmente no hay evidencia suficiente para estimar consumo futuro sin inventar demanda.</p></div>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Movimientos" value={n(data.history.movementRows)} />
          <Metric label="Salidas de consumo" value={n(data.history.consumptionRows)} />
          <Metric label="Productos con movimientos" value={n(data.history.productsWithMovements)} />
          <Metric label="Días de historia" value={n(data.history.historyDays)} />
        </div>
        <p className="text-xs text-muted-foreground"><strong className="font-medium text-foreground">Regla:</strong> {data.policy}</p>
      </CardContent>
    </Card>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4"/>Frescura y preparación</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Metric label="Snapshot actual" value={date(data.snapshotDate)}/><Metric label="Primer movimiento" value={date(data.history.firstDate)}/><Metric label="Último movimiento" value={date(data.history.lastDate)}/></CardContent></Card>

    <Card><CardHeader><CardTitle>Qué falta para volver predictivo Inventario</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>1. Registrar entradas y salidas reales en <code>stock_movements</code>.</p><p>2. Acumular al menos {data.history.minHistoryDays} días de historial.</p><p>3. Calcular consumo móvil sólo para productos con evidencia suficiente.</p><p>4. Recién entonces cruzar cobertura con OT, criticidad y lead time de Compras.</p></CardContent></Card>
  </div>;
}

function Metric({label,value}:{label:string;value:string}){return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>}
