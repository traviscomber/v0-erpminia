'use client';

import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

type Summary = { data: { total:number; completed:number } };
type Trend = { data: { timeline: Array<{ date:string; created:number; completed:number }> }; policy:string };

const fetcher=async(url:string)=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error(j?.error||'No se pudo cargar');return j;};
const n=(v:number,d=1)=>v.toLocaleString('es-CL',{maximumFractionDigits:d});

export function MaintenanceWorkloadForecast(){
 const summary=useSWR<Summary>('/api/maintenance/analytics/summary',fetcher,{revalidateOnFocus:false});
 const trend=useSWR<Trend>('/api/maintenance/analytics/work-order-trends',fetcher,{revalidateOnFocus:false});
 const error=summary.error||trend.error;
 const loading=summary.isLoading||trend.isLoading;
 if(error)return <StatePanel tone="error" title="No fue posible calcular tendencia de carga" description={error.message}/>;
 if(loading||!summary.data||!trend.data)return <StatePanel tone="neutral" title="Calculando carga de Mantención" description="Comparando creación y cierre de OT de los últimos 30 días."/>;

 const openNow=Math.max(0,Number(summary.data.data.total||0)-Number(summary.data.data.completed||0));
 const timeline=trend.data.data.timeline||[];
 const created=timeline.reduce((sum,row)=>sum+Number(row.created||0),0);
 const completed=timeline.reduce((sum,row)=>sum+Number(row.completed||0),0);
 const spanDays=timeline.length?Math.max(1,Math.round((new Date(timeline[timeline.length-1].date+'T12:00:00Z').getTime()-new Date(timeline[0].date+'T12:00:00Z').getTime())/86400000)+1):0;
 const enough=spanDays>=7&&(created+completed)>0;
 const netPerDay=enough?(created-completed)/spanDays:0;
 const projectedBacklog=enough?Math.max(0,openNow+netPerDay*30):null;
 const direction=!enough?'insufficient':netPerDay>0.05?'growing':netPerDay<-0.05?'shrinking':'stable';

 return <Card>
  <CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>Proyección de carga de OT</CardTitle><CardDescription>Extrapola sólo el flujo observado de aperturas y cierres; no estima horas-hombre ni capacidad técnica.</CardDescription></div>{direction==='growing'?<TrendingUp className="h-5 w-5"/>:direction==='shrinking'?<TrendingDown className="h-5 w-5"/>:<Wrench className="h-5 w-5"/>}</div></CardHeader>
  <CardContent className="space-y-4">
   <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
    {[['Backlog actual',openNow],['OT creadas · ventana',created],['OT cerradas · ventana',completed],['Backlog +30 días',projectedBacklog===null?'—':n(projectedBacklog,0)]].map(([label,value])=><div key={String(label)} className="bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
   </div>
   {!enough?<div className="flex gap-3 rounded-lg border border-dashed p-4"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><div><p className="text-sm font-medium">Serie insuficiente para proyectar</p><p className="mt-1 text-xs text-muted-foreground">Se requieren al menos 7 días de actividad registrada entre aperturas y cierres.</p></div></div>:<div className="flex gap-3 rounded-lg border p-4">{direction==='growing'?<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>:<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>}<div><p className="text-sm font-medium">{direction==='growing'?'Backlog con tendencia a crecer':direction==='shrinking'?'Backlog con tendencia a bajar':'Backlog estable'}</p><p className="mt-1 text-xs text-muted-foreground">Flujo neto observado: {netPerDay>=0?'+':''}{n(netPerDay,2)} OT/día durante {spanDays} días. Si ese flujo persistiera 30 días, el backlog sería aproximadamente {n(projectedBacklog||0,0)} OT.</p></div></div>}
   <p className="text-xs text-muted-foreground">Regla: backlog proyectado = backlog actual + (OT creadas − OT cerradas) / días observados × 30. Es una extrapolación operacional, no una predicción de falla ni productividad.</p>
  </CardContent>
 </Card>;
}
