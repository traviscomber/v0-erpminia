'use client';

import useSWR from 'swr';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import { ProduccionDashboard } from '@/components/dashboard/produccion-dashboard';
import { Badge } from '@/components/ui/badge';

type Daily={operation_date:string;treated_wet_t:number|null;recovered_fine_cu_t:number|null;transported_t:number|null;dispatched_concentrate_t:number|null;shift_rows:number|null;valid_shipment_rows:number|null;review_shipment_rows:number|null};
type O={quality:{status:'PASS'|'HOLD';pass:number;hold:number};currentPeriod:null|{dataThrough:string;treatedTons:number;avgHeadGradePct:number|null;avgRecoveryPct:number|null;plan:null|{treatmentProgressPct:number|null;paceIndexPct:number|null}};intelligence:Array<{level:'info'|'watch'|'alert';code:string;title:string;detail:string}>;daily?:Daily[]};
const f=async(u:string):Promise<O>=>{const r=await fetch(u,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error);return j};
const p=(v:number|null|undefined,d=1)=>v==null?'—':`${v.toLocaleString('es-CL',{maximumFractionDigits:d})}%`;
const n=(v:number|null|undefined,d=1)=>Number(v||0).toLocaleString('es-CL',{maximumFractionDigits:d});
const d=(v:string)=>new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short'}).format(new Date(`${v}T12:00:00`));

export default function ProduccionPage(){
  const {data}=useSWR<O>('/api/produccion/canonical-overview',f,{revalidateOnFocus:false});
  const x=data?.currentPeriod,plan=x?.plan,alerts=data?.intelligence.filter(s=>s.level==='alert')||[],watch=data?.intelligence.filter(s=>s.level==='watch')||[],top=[...alerts,...watch].slice(0,3),critical=alerts.length+(data?.quality.status==='HOLD'?1:0),pace=plan?.paceIndexPct??null;
  const days=(data?.daily||[]).filter(row=>row.operation_date).slice(-2); const previous=days.length===2?days[0]:null; const latest=days.length===2?days[1]:days[0]||null;
  const changes=latest&&previous?[
    {label:'Tratamiento diario',value:Number(latest.treated_wet_t||0),previous:Number(previous.treated_wet_t||0),unit:'t'},
    {label:'Cu fino recuperado',value:Number(latest.recovered_fine_cu_t||0),previous:Number(previous.recovered_fine_cu_t||0),unit:'t'},
    {label:'Transporte acreditado',value:Number(latest.transported_t||0),previous:Number(previous.transported_t||0),unit:'t'},
    {label:'Concentrado despachado',value:Number(latest.dispatched_concentrate_t||0),previous:Number(previous.dispatched_concentrate_t||0),unit:'t'},
  ]:[];
  return <div className="space-y-6">
    {data?<section className="overflow-hidden rounded-lg border bg-card">
      <div className="p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Producción · Centro de Control Ejecutivo</p><div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">Estado de la mina</h1><Badge variant={critical?'destructive':watch.length?'secondary':'outline'}>{critical?'Atención requerida':watch.length?'Con observaciones':'Operación estable'}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{critical?`${critical} asuntos requieren atención.`:watch.length?`${watch.length} señales en observación.`:'Sin desviaciones críticas en la evidencia disponible.'}</p></div>
      <div className="grid gap-px border-t bg-border sm:grid-cols-2 xl:grid-cols-6"><K l="Tratado" v={x?`${x.treatedTons.toLocaleString('es-CL',{maximumFractionDigits:1})} t`:'—'}/><K l="Ritmo" v={pace==null?'—':pace>=97?'En ritmo':pace>=90?'Leve desvío':'Bajo ritmo'}/><K l="Avance plan" v={p(plan?.treatmentProgressPct)}/><K l="Ley cabeza Cu" v={p(x?.avgHeadGradePct,3)}/><K l="Recuperación" v={p(x?.avgRecoveryPct,2)}/><K l="Calidad" v={`${data.quality.pass} PASS · ${data.quality.hold} HOLD`}/></div>
      <div className="border-t p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Lo que requiere atención</p><div className="mt-3 grid gap-3 lg:grid-cols-3">{top.length?top.map(s=><div key={s.code} className="rounded-lg border p-4"><div className="flex items-center gap-2"><p className="text-sm font-medium">{s.title}</p><Badge variant={s.level==='alert'?'destructive':'secondary'}>{s.level==='alert'?'Crítico':'Observar'}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{s.detail}</p></div>):<div className="rounded-lg border p-4 text-sm text-muted-foreground">Sin señales prioritarias para este período.</div>}</div></div>
      <div className="border-t p-5"><div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Qué cambió</p><h2 className="mt-1 text-lg font-semibold">Desde el último corte operacional</h2></div>{latest&&previous?<p className="text-xs text-muted-foreground">{d(previous.operation_date)} → {d(latest.operation_date)}</p>:null}</div>{changes.length?<div className="mt-4 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">{changes.map(item=><Change key={item.label} {...item}/>)}</div>:<div className="mt-4 rounded-lg border p-4 text-sm text-muted-foreground">Aún no hay dos cortes operacionales comparables en la serie canónica.</div>}<p className="mt-3 text-xs text-muted-foreground">Variación contra el corte operacional inmediatamente anterior. No se interpreta ausencia de fuente como cero operacional.</p></div>
    </section>:null}
    <ProduccionDashboard />
  </div>
}

function K({l,v}:{l:string;v:string}){return <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-2 text-lg font-semibold tabular-nums">{v}</p></div>}
function Change({label,value,previous,unit}:{label:string;value:number;previous:number;unit:string}){const delta=value-previous;const pctDelta=previous!==0?(delta/Math.abs(previous))*100:null;const Icon=delta>0?ArrowUpRight:delta<0?ArrowDownRight:Minus;return <div className="bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{n(value)} {unit}</p></div><Icon className="mt-0.5 h-4 w-4 text-muted-foreground"/></div><div className="mt-3 flex items-center gap-2 text-xs"><span className="font-medium tabular-nums">{delta>0?'+':''}{n(delta)} {unit}</span><ArrowRight className="h-3 w-3 text-muted-foreground"/><span className="text-muted-foreground">{pctDelta==null?'sin base':`${pctDelta>0?'+':''}${n(pctDelta)}%`}</span></div></div>}
