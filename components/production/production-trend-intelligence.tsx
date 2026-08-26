'use client';

import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Gauge } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

type TrendState='improving'|'declining'|'stable'|'insufficient';
type TrendMetric={state:TrendState;recent:number|null;prior:number|null;delta:number|null;deltaPct:number|null;points:Array<{date:string;value:number}>};
type Payload={method:{window:string;policy:string};metrics:{treatedTons:TrendMetric;headGrade:TrendMetric;recovery:TrendMetric;drillingMeters:TrendMetric;availability:TrendMetric};alerts:Array<{key:string;severity:'warning'|'info';title:string;evidence:string;action:string}>};
const fetcher=async(url:string)=>{const r=await fetch(url,{credentials:'include'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Error');return j;};
const n=(v:number|null,d=1)=>v===null?'—':v.toLocaleString('es-CL',{maximumFractionDigits:d});

export function ProductionTrendIntelligence(){
  const {data,error,isLoading}=useSWR<Payload>('/api/produccion/tendencias',fetcher,{revalidateOnFocus:false});
  if(error)return <StatePanel tone="error" title="No fue posible cargar tendencias" description={error.message}/>;
  if(isLoading||!data)return <StatePanel tone="neutral" title="Calculando tendencias" description="Comparando los últimos 3 días contra los 3 días anteriores."/>;
  const cards=[
    ['Tratamiento',data.metrics.treatedTons,'t',1],
    ['Ley cabeza',data.metrics.headGrade,'% Cu',3],
    ['Recuperación',data.metrics.recovery,'%',2],
    ['Sondaje',data.metrics.drillingMeters,'m',1],
    ['Disponibilidad',data.metrics.availability,'%',1],
  ] as const;
  return <section className="space-y-3">
    <div><h2 className="text-lg font-semibold">Tendencia operacional</h2><p className="text-sm text-muted-foreground">Cambio de estado basado en ventanas móviles; no es una predicción estadística.</p></div>
    <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label,metric,unit,digits])=><TrendCard key={label} label={label} metric={metric} unit={unit} digits={digits}/>)}</div>
    {data.alerts.length>0?<div className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><h3 className="font-medium">Cambios que requieren atención</h3></div><div className="divide-y">{data.alerts.map(a=><div key={a.key} className="grid gap-2 px-4 py-4 lg:grid-cols-[220px_1fr_1fr]"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><p className="text-sm font-medium">{a.title}</p></div><p className="text-sm text-muted-foreground">{a.evidence}</p><p className="text-sm"><span className="font-medium">Acción: </span>{a.action}</p></div>)}</div></div>:null}
    <p className="text-xs leading-5 text-muted-foreground"><strong className="font-medium text-foreground">Método:</strong> {data.method.policy}</p>
  </section>;
}

function TrendCard({label,metric,unit,digits}:{label:string;metric:TrendMetric;unit:string;digits:number}){
  const Icon=metric.state==='improving'?ArrowUpRight:metric.state==='declining'?ArrowDownRight:metric.state==='stable'?ArrowRight:Gauge;
  const state=metric.state==='improving'?'Mejorando':metric.state==='declining'?'Deteriorando':metric.state==='stable'?'Estable':'Sin serie suficiente';
  return <div className="bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-xl font-semibold">{metric.recent===null?'—':`${n(metric.recent,digits)} ${unit}`}</p><p className="mt-1 text-xs font-medium">{state}</p>{metric.prior!==null?<p className="mt-1 text-xs text-muted-foreground">Previo {n(metric.prior,digits)} {unit}</p>:null}</div>;
}
