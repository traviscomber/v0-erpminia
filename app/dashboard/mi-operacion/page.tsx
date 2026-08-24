'use client';

import useSWR from 'swr';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';

type Daily={operation_date:string;treated_wet_t:number|null;recovered_fine_cu_t:number|null;transported_t:number|null;dispatched_concentrate_t:number|null};
type Signal={level:'info'|'watch'|'alert';code:string;title:string;detail:string};
type Reading={level:'info'|'watch'|'alert';title:string;detail:string};
type O={quality:{status:'PASS'|'HOLD';pass:number;hold:number};currentPeriod:null|{treatedTons:number;avgHeadGradePct:number|null;avgRecoveryPct:number|null;plan:null|{treatmentProgressPct:number|null;paceIndexPct:number|null;gradeDeltaPctPoints?:number|null}};intelligence:Signal[];daily?:Daily[]};

const fetcher=async(url:string):Promise<O>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'No fue posible cargar la vista ejecutiva');return j};
const pct=(v:number|null|undefined,d=1)=>v==null?'—':`${v.toLocaleString('es-CL',{maximumFractionDigits:d})}%`;
const num=(v:number|null|undefined,d=1)=>Number(v||0).toLocaleString('es-CL',{maximumFractionDigits:d});
const date=(v:string)=>new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short'}).format(new Date(`${v}T12:00:00`));
const deltaPct=(current:number,previous:number)=>previous!==0?((current-previous)/Math.abs(previous))*100:null;
const readingRank:Record<Reading['level'],number>={alert:0,watch:1,info:2};

export default function MiOperacionPage(){
  const {data,error,isLoading}=useSWR<O>('/api/mi-operacion',fetcher,{revalidateOnFocus:false});
  if(isLoading) return <StatePanel tone="neutral" title="Cargando Mi operación" description="Leyendo producción desde la capa canónica."/>;
  if(error) return <StatePanel tone="error" title="Vista no disponible" description={error.message}/>;
  if(!data) return null;

  const current=data.currentPeriod;
  const plan=current?.plan;
  const alerts=data.intelligence.filter(s=>s.level==='alert');
  const watches=data.intelligence.filter(s=>s.level==='watch');
  const priority=[...alerts,...watches].slice(0,3);
  const critical=alerts.length+(data.quality.status==='HOLD'?1:0);
  const pace=plan?.paceIndexPct??null;
  const days=(data.daily||[]).filter(row=>row.operation_date).slice(-2);
  const previous=days.length===2?days[0]:null;
  const latest=days.length===2?days[1]:days[0]||null;
  const changes=latest&&previous?[
    {label:'Tratamiento diario',value:Number(latest.treated_wet_t||0),previous:Number(previous.treated_wet_t||0),unit:'t'},
    {label:'Cu fino recuperado',value:Number(latest.recovered_fine_cu_t||0),previous:Number(previous.recovered_fine_cu_t||0),unit:'t'},
    {label:'Transporte acreditado',value:Number(latest.transported_t||0),previous:Number(previous.transported_t||0),unit:'t'},
    {label:'Concentrado despachado',value:Number(latest.dispatched_concentrate_t||0),previous:Number(previous.dispatched_concentrate_t||0),unit:'t'},
  ]:[];

  const readings:Reading[]=[];
  if(plan?.paceIndexPct!=null){
    readings.push(plan.paceIndexPct<90?{level:'alert',title:'El ritmo mensual requiere atención',detail:`Índice de ritmo ${pct(plan.paceIndexPct)}. El tratamiento acumulado está por debajo del calendario.`}:plan.paceIndexPct<97?{level:'watch',title:'El ritmo está levemente bajo calendario',detail:`Índice de ritmo ${pct(plan.paceIndexPct)}. Conviene vigilar los próximos cortes.`}:{level:'info',title:'El tratamiento mantiene el ritmo del mes',detail:`Índice de ritmo ${pct(plan.paceIndexPct)}. El avance está alineado con el calendario.`});
  }
  if(plan?.gradeDeltaPctPoints!=null){
    readings.push(plan.gradeDeltaPctPoints<-0.08?{level:'alert',title:'La ley de cabeza está materialmente bajo objetivo',detail:`Brecha de ${num(Math.abs(plan.gradeDeltaPctPoints),3)} pp bajo el objetivo activo.`}:plan.gradeDeltaPctPoints<0?{level:'watch',title:'La ley de cabeza está bajo objetivo',detail:`Brecha de ${num(Math.abs(plan.gradeDeltaPctPoints),3)} pp bajo el objetivo.`}:{level:'info',title:'La ley de cabeza está en o sobre objetivo',detail:`La ley se mantiene ${num(plan.gradeDeltaPctPoints,3)} pp sobre el objetivo.`});
  }
  if(latest&&previous){
    const variation=deltaPct(Number(latest.treated_wet_t||0),Number(previous.treated_wet_t||0));
    if(variation!=null&&Math.abs(variation)>=10) readings.push({level:'watch',title:`El último corte ${variation<0?'redujo':'aumentó'} el tratamiento diario`,detail:`Cambio ${variation>0?'+':''}${num(variation)}% frente al corte anterior. Es una variación operacional, no una causa inferida.`});
  }
  if(data.quality.status==='HOLD') readings.push({level:'watch',title:'Parte de la evidencia sigue en HOLD',detail:`Hay ${data.quality.hold} chequeo(s) pendientes. Los vacíos no se completan como cero.`});
  const executive=readings.sort((a,b)=>readingRank[a.level]-readingRank[b.level]).slice(0,4);

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Mi operación · Centro de Control Ejecutivo</p>
        <div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">Estado de la mina</h1><Badge variant={critical?'destructive':watches.length?'secondary':'outline'}>{critical?'Atención requerida':watches.length?'Con observaciones':'Operación estable'}</Badge></div>
        <p className="mt-2 text-sm text-muted-foreground">{critical?`${critical} asuntos requieren atención.`:watches.length?`${watches.length} señales en observación.`:'Sin desviaciones críticas en la evidencia disponible.'}</p>
      </div>
      <div className="grid gap-px border-t bg-border sm:grid-cols-2 xl:grid-cols-6">
        <K label="Tratado" value={current?`${current.treatedTons.toLocaleString('es-CL',{maximumFractionDigits:1})} t`:'—'}/>
        <K label="Ritmo" value={pace==null?'—':pace>=97?'En ritmo':pace>=90?'Leve desvío':'Bajo ritmo'}/>
        <K label="Avance plan" value={pct(plan?.treatmentProgressPct)}/>
        <K label="Ley cabeza Cu" value={pct(current?.avgHeadGradePct,3)}/>
        <K label="Recuperación" value={pct(current?.avgRecoveryPct,2)}/>
        <K label="Calidad" value={`${data.quality.pass} PASS · ${data.quality.hold} HOLD`}/>
      </div>
      <Block title="Lo que requiere atención">
        <div className="grid gap-3 lg:grid-cols-3">{priority.length?priority.map(item=><article key={item.code} className="rounded-lg border p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{item.title}</p><Badge variant={item.level==='alert'?'destructive':'secondary'}>{item.level==='alert'?'Crítico':'Observar'}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p></article>):<Empty text="Sin señales prioritarias para este período."/>}</div>
      </Block>
      <Block title="Qué cambió" subtitle={latest&&previous?`${date(previous.operation_date)} → ${date(latest.operation_date)}`:undefined}>
        {changes.length?<div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">{changes.map(item=><Change key={item.label} {...item}/>)}</div>:<Empty text="Aún no hay dos cortes operacionales comparables."/>}
      </Block>
      <Block title="Qué significa"><div className="grid gap-3 lg:grid-cols-2">{executive.length?executive.map((item,index)=><article key={`${item.title}-${index}`} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{item.title}</p><Badge variant={item.level==='alert'?'destructive':item.level==='watch'?'secondary':'outline'}>{item.level==='alert'?'Atención':item.level==='watch'?'Observar':'En línea'}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p></article>):<Empty text="Todavía no existe evidencia suficiente para una lectura comparativa."/>}</div></Block>
    </section>
  </div>;
}

function K({label,value}:{label:string;value:string}){return <div className="bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{value}</p></div>}
function Block({title,subtitle,children}:{title:string;subtitle?:string;children:React.ReactNode}){return <section className="border-t p-5"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p></div>{subtitle?<p className="text-xs text-muted-foreground">{subtitle}</p>:null}</div>{children}</section>}
function Empty({text}:{text:string}){return <div className="rounded-lg border p-4 text-sm text-muted-foreground">{text}</div>}
function Change({label,value,previous,unit}:{label:string;value:number;previous:number;unit:string}){const delta=value-previous;const variation=previous!==0?(delta/Math.abs(previous))*100:null;const Icon=delta>0?ArrowUpRight:delta<0?ArrowDownRight:Minus;return <div className="bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{num(value)} {unit}</p></div><Icon className="mt-0.5 h-4 w-4 text-muted-foreground"/></div><div className="mt-3 flex items-center gap-2 text-xs"><span className="font-medium tabular-nums">{delta>0?'+':''}{num(delta)} {unit}</span><ArrowRight className="h-3 w-3 text-muted-foreground"/><span className="text-muted-foreground">{variation==null?'sin base':`${variation>0?'+':''}${num(variation)}%`}</span></div></div>}
