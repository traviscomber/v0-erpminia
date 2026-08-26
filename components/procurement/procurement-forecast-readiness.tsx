'use client';

import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = async (url:string) => { const r=await fetch(url,{credentials:'include',cache:'no-store'}); const j=await r.json().catch(()=>null); if(!r.ok) throw new Error(j?.error || 'No fue posible cargar forecast de Compras'); return j; };
const n=(v:number)=>v.toLocaleString('es-CL');

export function ProcurementForecastReadiness(){
  const {data,error,isLoading}=useSWR('/api/procurement/forecast',fetcher,{revalidateOnFocus:false});
  return <Card className="shadow-none"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-4 w-4"/>Forecast de entrega</CardTitle><CardDescription>Lead time sólo desde órdenes operacionales con emisión y entrega reales.</CardDescription></div>{!isLoading&&!error&&(data?.readiness==='ready'?<CheckCircle2 className="h-5 w-5"/>:<AlertTriangle className="h-5 w-5"/>)}</div></CardHeader><CardContent className="space-y-4">{error?<p className="text-sm text-destructive">{error.message}</p>:isLoading?<div className="h-16 animate-pulse rounded-lg bg-muted"/>:<><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Órdenes operacionales" value={n(Number(data.operational?.orders||0))}/><Metric label="Entregas con fechas" value={n(Number(data.operational?.deliveredWithDates||0))}/><Metric label="OC operacionales vencidas" value={n(Number(data.operational?.overdueOpen||0))}/><Metric label="Lead time observado" value={data.operational?.avgObservedLeadTimeDays==null?'N/D':`${Number(data.operational.avgObservedLeadTimeDays).toLocaleString('es-CL',{maximumFractionDigits:1})} días`}/></div><div className="rounded-lg border border-dashed p-4"><p className="text-sm font-medium">{data.readiness==='ready'?'Forecast habilitado':'Forecast suspendido'}</p><p className="mt-1 text-sm text-muted-foreground">{data.policy}</p></div></>}</CardContent></Card>;
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>}
