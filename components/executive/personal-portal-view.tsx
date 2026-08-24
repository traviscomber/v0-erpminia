'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleAlert, CircleCheck, Clock3, Gauge, Link2, Minus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

export type PortalSignal={level:'info'|'watch'|'alert';code?:string;title:string;detail:string};
export type PortalMetric={label:string;value:string};
export type PortalChange={label:string;current:number;previous:number;unit:string};
export type PortalBlocker={code:string;title:string;detail:string;dependsOn:string;count:number};
export type PersonalPortalData={
  portal:{label:string;title:string;areaPath:string;actionLabel:string;key:string};
  user:{name?:string;role?:string;cargo?:string|null};
  status:'stable'|'watch'|'attention';
  metrics:PortalMetric[];
  signals:PortalSignal[];
  interpretation:PortalSignal[];
  blockers?:PortalBlocker[];
  change:{available:boolean;note:string;items?:PortalChange[]};
  source:string;
};

type ActionState={source_key:string;status:'pending'|'read'|'snoozed';snoozed_until?:string|null};

const num=(v:number,d=1)=>Number(v||0).toLocaleString('es-CL',{maximumFractionDigits:d});
const safeKey=(value:string)=>value.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi,'-').replace(/^-|-$/g,'').slice(0,90);

export function PersonalPortalView({data,eyebrow='Mi portal',description}:{data:PersonalPortalData;eyebrow?:string;description?:string}){
  const statusLabel=data.status==='attention'?'Atención requerida':data.status==='watch'?'Con observaciones':'Operación estable';
  const statusCopy=data.status==='attention'?'Hay excepciones que requieren decisión o seguimiento.':data.status==='watch'?'Hay señales que conviene vigilar en el próximo corte.':'No hay alertas críticas en la evidencia disponible.';
  const variant=data.status==='attention'?'destructive':data.status==='watch'?'secondary':'outline';
  const changes=data.change.items||[];
  const blockers=data.blockers||[];
  const [states,setStates]=useState<Record<string,ActionState>>({});
  const [saving,setSaving]=useState<string|null>(null);

  useEffect(()=>{
    let active=true;
    fetch('/api/mi-portal/action-states',{credentials:'include',cache:'no-store'})
      .then((r)=>r.ok?r.json():null)
      .then((payload)=>{
        if(!active||!payload?.states)return;
        const next:Record<string,ActionState>={};
        for(const state of payload.states as ActionState[])next[state.source_key]=state;
        setStates(next);
      })
      .catch(()=>{});
    return()=>{active=false};
  },[]);

  const signalEntries=useMemo(()=>data.signals.slice(0,4).map((item,index)=>({
    item,
    key:`${data.portal.key}:${item.code||safeKey(item.title)||index}`,
  })),[data.portal.key,data.signals]);

  async function setPriorityState(sourceKey:string,status:'pending'|'read'|'snoozed'){
    setSaving(sourceKey);
    try{
      const response=await fetch('/api/mi-portal/action-states',{
        method:'POST',credentials:'include',headers:{'content-type':'application/json'},
        body:JSON.stringify({sourceKey,status}),
      });
      const payload=await response.json();
      if(response.ok&&payload?.state)setStates((current)=>({...current,[sourceKey]:payload.state}));
    }finally{setSaving(null)}
  }

  return <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-10">
    <section className="relative overflow-hidden rounded-xl border bg-card">
      <div className="grid gap-0 lg:grid-cols-[1.45fr_.55fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"><span>{eyebrow}</span><span className="text-border">/</span><span>{data.user.cargo||data.user.role||'Responsable de área'}</span></div>
          <div className="mt-5 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{data.portal.title}</h1><Badge variant={variant}>{statusLabel}</Badge></div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description||`Vista personal de ${data.user.name||'la jefatura'}, enfocada en estado, prioridades y evidencia trazable del área.`}</p>
        </div>
        <div className="border-t bg-muted/20 p-6 lg:border-l lg:border-t-0 lg:p-8"><div className="flex h-full flex-col justify-between gap-8"><div><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Gauge className="h-4 w-4"/>Estado del corte</div><p className="mt-3 text-lg font-medium leading-7">{statusCopy}</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-4 w-4"/>Lectura basada sólo en evidencia canónica.</div></div></div>
      </div>
      <div className="grid gap-px border-t bg-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{data.metrics.map((metric,index)=><MetricCard key={`${metric.label}-${index}`} metric={metric} index={index}/>)}</div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <SectionHeader index="01" title="Prioridades" subtitle="Sólo lo que requiere atención ahora."/>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {signalEntries.length?signalEntries.map(({item,key})=><SignalCard key={key} item={item} actionState={states[key]} saving={saving===key} onState={(status)=>setPriorityState(key,status)}/>):<Empty text="Sin prioridades en la evidencia actual."/>}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <SectionHeader index="02" title="Qué significa" subtitle="Lectura ejecutiva del corte."/>
        <div className="mt-5 space-y-3">{data.interpretation.length?data.interpretation.slice(0,4).map((item,index)=><SignalCard key={`${item.title}-${index}`} item={item} compact/>):<Empty text="No hay conclusiones adicionales para este corte."/>}</div>
      </section>
    </div>

    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <SectionHeader index="03" title="Bloqueos" subtitle="Sólo dependencias reales entre áreas."/>
      <div className="mt-5">
        {blockers.length?<div className="grid gap-3 md:grid-cols-2">{blockers.map((item)=><BlockerCard key={item.code} item={item}/>)}</div>:<Empty text="Sin bloqueos entre áreas identificados en la evidencia actual."/>}
      </div>
    </section>

    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <SectionHeader index="04" title="Qué cambió" subtitle="Comparación sólo cuando existen cortes equivalentes."/>
      <div className="mt-5">{data.change.available&&changes.length?<div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">{changes.map((item)=><ChangeCard key={item.label} item={item}/>)}</div>:<StatePanel tone="neutral" title="Comparación todavía no disponible" description={data.change.note} className="min-h-0 py-5"/>}</div>
    </section>

    <footer className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Trazabilidad</p><p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">Fuente: {data.source}</p></div><Button asChild className="w-full sm:w-auto"><Link href={data.portal.areaPath}>{data.portal.actionLabel}<ArrowRight className="h-4 w-4"/></Link></Button></footer>
  </div>;
}

function MetricCard({metric,index}:{metric:PortalMetric;index:number}){return <article className="bg-card p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{metric.label}</p><span className="text-[10px] tabular-nums text-muted-foreground/60">{String(index+1).padStart(2,'0')}</span></div><p className="mt-3 text-xl font-semibold tracking-tight tabular-nums">{metric.value}</p></article>}
function SectionHeader({index,title,subtitle}:{index:string;title:string;subtitle:string}){return <div className="flex items-start gap-3"><span className="pt-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{index}</span><div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div></div>}

function SignalCard({item,compact=false,actionState,saving=false,onState}:{item:PortalSignal;compact?:boolean;actionState?:ActionState;saving?:boolean;onState?:(status:'pending'|'read'|'snoozed')=>void}){
  const Icon=item.level==='alert'?CircleAlert:item.level==='watch'?Gauge:CircleCheck;
  const state=actionState?.status;
  return <article className={`rounded-lg border ${compact?'p-4':'p-5'} ${state==='read'?'opacity-60':''}`}>
    <div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-medium leading-5">{item.title}</p><Badge variant={item.level==='alert'?'destructive':item.level==='watch'?'secondary':'outline'}>{item.level==='alert'?'Atención':item.level==='watch'?'Observar':'En línea'}</Badge></div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
      {onState&&<div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        {state==='read'?<Badge variant="outline">Visto</Badge>:state==='snoozed'?<Badge variant="outline"><Clock3 className="mr-1 h-3 w-3"/>Mañana</Badge>:null}
        <Button type="button" size="sm" variant="ghost" disabled={saving||state==='read'} onClick={()=>onState('read')}>Visto</Button>
        <Button type="button" size="sm" variant="ghost" disabled={saving||state==='snoozed'} onClick={()=>onState('snoozed')}>Mañana</Button>
        {state&&state!=='pending'?<Button type="button" size="sm" variant="ghost" disabled={saving} onClick={()=>onState('pending')}>Reabrir</Button>:null}
      </div>}
    </div></div>
  </article>;
}

function BlockerCard({item}:{item:PortalBlocker}){return <article className="rounded-lg border p-5"><div className="flex items-start gap-3"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-medium leading-5">{item.title}</p><Badge variant="secondary">Depende de {item.dependsOn}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p></div></div></article>}
function ChangeCard({item}:{item:PortalChange}){const delta=item.current-item.previous;const variation=item.previous!==0?(delta/Math.abs(item.previous))*100:null;const Icon=delta>0?ArrowUpRight:delta<0?ArrowDownRight:Minus;return <article className="bg-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-2 text-lg font-semibold tabular-nums">{num(item.current)} {item.unit}</p></div><Icon className="mt-0.5 h-4 w-4 text-muted-foreground"/></div><p className="mt-3 text-xs"><span className="font-medium tabular-nums">{delta>0?'+':''}{num(delta)} {item.unit}</span><span className="ml-2 text-muted-foreground">{variation==null?'sin base':`${variation>0?'+':''}${num(variation)}%`}</span></p></article>}
function Empty({text}:{text:string}){return <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{text}</div>}
