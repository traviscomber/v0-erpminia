'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Gauge, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

type Signal={level:'info'|'watch'|'alert';code?:string;title:string;detail:string};
type PortalResponse={portal:{label:string;title:string;areaPath:string};user:{name?:string;role?:string};status:'stable'|'watch'|'attention';metrics:{activeWorkOrders:number;criticalWorkOrders:number;waitingSupply:number;missingOwner:number;totalCost:number;purchaseCommitment:number};signals:Signal[];interpretation:Signal[];change:{available:boolean;note:string};source:string};

const fetcher=async(url:string):Promise<PortalResponse>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'No fue posible cargar Mi área');return j};
const money=(v:number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(v||0);

export default function MiAreaPage(){
  const {data,error,isLoading}=useSWR<PortalResponse>('/api/mi-area',fetcher,{revalidateOnFocus:false});
  if(isLoading)return <StatePanel tone="loading" title="Cargando Mi área" description="Leyendo la evidencia operacional del área."/>;
  if(error)return <StatePanel tone="error" title="Portal no disponible" description={error.message}/>;
  if(!data)return null;
  const statusLabel=data.status==='attention'?'Atención requerida':data.status==='watch'?'Con observaciones':'Área estable';
  const variant=data.status==='attention'?'destructive':data.status==='watch'?'secondary':'outline';
  const metrics=[
    ['OT activas',String(data.metrics.activeWorkOrders)],
    ['OT críticas',String(data.metrics.criticalWorkOrders)],
    ['Esperando abastecimiento',String(data.metrics.waitingSupply)],
    ['Sin responsable',String(data.metrics.missingOwner)],
    ['Costo ejecutado',money(data.metrics.totalCost)],
    ['Compras comprometidas',money(data.metrics.purchaseCommitment)],
  ];
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Mi área · Centro de Control</p>
        <div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">{data.portal.title}</h1><Badge variant={variant}>{statusLabel}</Badge></div>
        <p className="mt-2 text-sm text-muted-foreground">Resumen ejecutivo para {data.user.name||'el responsable del área'}. La evidencia permanece trazable al módulo operacional.</p>
      </div>
      <div className="grid gap-px border-t bg-border sm:grid-cols-2 xl:grid-cols-6">{metrics.map(([label,value])=><div key={label} className="bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{value}</p></div>)}</div>
      <Block title="Lo que requiere atención"><div className="grid gap-3 lg:grid-cols-3">{data.signals.length?data.signals.slice(0,3).map((item,index)=><SignalCard key={`${item.title}-${index}`} item={item}/>):<Empty text="Sin señales prioritarias en la evidencia actual."/>}</div></Block>
      <Block title="Qué cambió"><StatePanel tone="neutral" title="Comparación todavía no disponible" description={data.change.note} className="min-h-0 py-5"/></Block>
      <Block title="Qué significa"><div className="grid gap-3 lg:grid-cols-2">{data.interpretation.length?data.interpretation.map((item,index)=><SignalCard key={`${item.title}-${index}`} item={item}/>):<Empty text="No hay conclusiones adicionales para este corte."/>}</div></Block>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5"><p className="text-xs text-muted-foreground">Fuente: {data.source}</p><Button asChild variant="outline"><Link href={data.portal.areaPath}><Wrench className="h-4 w-4"/>Abrir mantenimiento<ArrowRight className="h-4 w-4"/></Link></Button></div>
    </section>
  </div>;
}

function Block({title,children}:{title:string;children:React.ReactNode}){return <section className="border-t p-5"><div className="mb-4 flex items-center gap-2"><Gauge className="h-4 w-4 text-muted-foreground"/><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p></div>{children}</section>}
function SignalCard({item}:{item:Signal}){return <article className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{item.title}</p><Badge variant={item.level==='alert'?'destructive':item.level==='watch'?'secondary':'outline'}>{item.level==='alert'?'Atención':item.level==='watch'?'Observar':'En línea'}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p></article>}
function Empty({text}:{text:string}){return <div className="rounded-lg border p-4 text-sm text-muted-foreground">{text}</div>}
