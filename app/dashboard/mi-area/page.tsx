'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Gauge, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { useAuth } from '@/hooks/use-auth';

type Signal={level:'info'|'watch'|'alert';code?:string;title:string;detail:string};
type Metric={label:string;value:string};
type ChangeItem={label:string;current:number;previous:number;unit:string};
type PortalResponse={portal:{label:string;title:string;areaPath:string;actionLabel:string;key:string};user:{name?:string;role?:string;cargo?:string|null};status:'stable'|'watch'|'attention';metrics:Metric[];signals:Signal[];interpretation:Signal[];change:{available:boolean;note:string;items?:ChangeItem[]};source:string};

const fetcher=async(url:string):Promise<PortalResponse>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'No fue posible cargar Mi área');return j};
const num=(v:number,d=1)=>Number(v||0).toLocaleString('es-CL',{maximumFractionDigits:d});
function endpointForCargo(cargo?:string|null){
  const normalized=String(cargo||'').trim().toUpperCase();
  if(normalized==='JEFE BODEGA')return'/api/mi-area/bodega';
  if(normalized==='JEFE ADM.')return'/api/mi-area/administracion';
  if(normalized==='JEFE GEÓLOGIA')return'/api/mi-area/geologia';
  if(normalized==='JEFE SONDAJE')return'/api/mi-area/sondaje';
  return'/api/mi-area';
}

export default function MiAreaPage(){
  const {user,loading:authLoading}=useAuth();
  const endpoint=authLoading?null:endpointForCargo(user?.cargo);
  const {data,error,isLoading}=useSWR<PortalResponse>(endpoint,fetcher,{revalidateOnFocus:false});
  if(authLoading||isLoading)return <StatePanel tone="loading" title="Cargando Mi área" description="Leyendo la evidencia operacional del área."/>;
  if(error)return <StatePanel tone="error" title="Portal no disponible" description={error.message}/>;
  if(!data)return null;
  const statusLabel=data.status==='attention'?'Atención requerida':data.status==='watch'?'Con observaciones':'Área estable';
  const variant=data.status==='attention'?'destructive':data.status==='watch'?'secondary':'outline';
  const changes=data.change.items||[];
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Mi área · Centro de Control</p>
        <div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">{data.portal.title}</h1><Badge variant={variant}>{statusLabel}</Badge></div>
        <p className="mt-2 text-sm text-muted-foreground">Resumen ejecutivo para {data.user.name||'el responsable del área'}. La evidencia permanece trazable al módulo operacional.</p>
      </div>
      <div className="grid gap-px border-t bg-border sm:grid-cols-2 xl:grid-cols-6">{data.metrics.map((metric)=><div key={metric.label} className="bg-card p-4"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{metric.value}</p></div>)}</div>
      <Block title="Lo que requiere atención"><div className="grid gap-3 lg:grid-cols-3">{data.signals.length?data.signals.slice(0,3).map((item,index)=><SignalCard key={`${item.title}-${index}`} item={item}/>):<Empty text="Sin señales prioritarias en la evidencia actual."/>}</div></Block>
      <Block title="Qué cambió">{data.change.available&&changes.length?<div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-3">{changes.map((item)=><ChangeCard key={item.label} item={item}/>)}</div>:<StatePanel tone="neutral" title="Comparación todavía no disponible" description={data.change.note} className="min-h-0 py-5"/>}</Block>
      <Block title="Qué significa"><div className="grid gap-3 lg:grid-cols-2">{data.interpretation.length?data.interpretation.map((item,index)=><SignalCard key={`${item.title}-${index}`} item={item}/>):<Empty text="No hay conclusiones adicionales para este corte."/>}</div></Block>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5"><p className="max-w-2xl text-xs text-muted-foreground">Fuente: {data.source}</p><Button asChild variant="outline"><Link href={data.portal.areaPath}>{data.portal.actionLabel}<ArrowRight className="h-4 w-4"/></Link></Button></div>
    </section>
  </div>;
}

function Block({title,children}:{title:string;children:React.ReactNode}){return <section className="border-t p-5"><div className="mb-4 flex items-center gap-2"><Gauge className="h-4 w-4 text-muted-foreground"/><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p></div>{children}</section>}
function SignalCard({item}:{item:Signal}){return <article className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{item.title}</p><Badge variant={item.level==='alert'?'destructive':item.level==='watch'?'secondary':'outline'}>{item.level==='alert'?'Atención':item.level==='watch'?'Observar':'En línea'}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p></article>}
function ChangeCard({item}:{item:ChangeItem}){const delta=item.current-item.previous;const variation=item.previous!==0?(delta/Math.abs(item.previous))*100:null;const Icon=delta>0?ArrowUpRight:delta<0?ArrowDownRight:Minus;return <article className="bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{num(item.current)} {item.unit}</p></div><Icon className="mt-0.5 h-4 w-4 text-muted-foreground"/></div><p className="mt-3 text-xs"><span className="font-medium">{delta>0?'+':''}{num(delta)} {item.unit}</span><span className="ml-2 text-muted-foreground">{variation==null?'sin base':`${variation>0?'+':''}${num(variation)}%`}</span></p></article>}
function Empty({text}:{text:string}){return <div className="rounded-lg border p-4 text-sm text-muted-foreground">{text}</div>}
