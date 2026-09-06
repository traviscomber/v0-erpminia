'use client';

import useSWR from 'swr';
import { AlertTriangle, ChevronRight, CircleDot, Layers3, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url:string) => { const r=await fetch(url,{credentials:'include',cache:'no-store'}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'No fue posible cargar interpretación'); return d; };

type Signal = {
  drill_hole_id:string; hole_code:string; mine_name:string|null; sector_name:string|null; drilled_depth_m:number|null;
  interpretation_state:string; interpretation_guardrail:string; effective_attention_reason:string|null; effective_priority_rank:number;
  structured_intervals:number; structured_mineral_intervals:number; structured_structure_intervals:number; structured_lithology_intervals:number;
  point_observations:number; mineral_points:number; structure_points:number; transition_points:number;
  visual_mineral_m:number; explicit_no_mineral_m:number; structure_m:number; lithology_m:number; rock_condition_m:number;
  first_observed_at:string|null; last_observed_at:string|null;
};

type ListResponse = { rows:Signal[]; summary:Record<string,number> };
type DetailResponse = { signal:Signal; evidence:{ contiguousUnits:any[]; points:any[]; transitions:any[]; intervals:any[] } };

const stateLabel:Record<string,string> = {
  structured_evidence:'Evidencia estructurada', operational_evidence:'Evidencia operacional', partial_evidence:'Evidencia parcial',
  blocked:'Bloqueado', insufficient_evidence:'Insuficiente',
};

const n=(value:number|null|undefined)=>Number(value||0).toLocaleString('es-CL',{maximumFractionDigits:1});

function SignalLine({label,value,detail}:{label:string;value:string;detail:string}){
  return <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[170px_120px_1fr]"><p className="text-sm text-muted-foreground">{label}</p><p className="font-medium tabular-nums">{value}</p><p className="text-sm text-muted-foreground">{detail}</p></div>;
}

export function GeologiaInterpretation(){
  const {data,error,isLoading}=useSWR<ListResponse>('/api/produccion/geologia/interpretation',fetcher);
  const [query,setQuery]=useState('');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const rows=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return (data?.rows||[]).filter(row=>!q||[row.hole_code,row.mine_name,row.sector_name].some(v=>String(v||'').toLowerCase().includes(q)));
  },[data?.rows,query]);
  const activeId=selectedId || rows[0]?.drill_hole_id || null;
  const {data:detail,error:detailError,isLoading:detailLoading}=useSWR<DetailResponse>(activeId?`/api/produccion/geologia/interpretation?holeId=${activeId}`:null,fetcher);

  if(error) return <StatePanel tone="error" title="No fue posible cargar Interpretación" description="La evidencia canónica sigue disponible; falló la capa de lectura consolidada." className="min-h-0 py-5"/>;
  if(isLoading||!data) return <StatePanel title="Cargando interpretación" description="Consolidando intervalos, puntos, transiciones y evidencia operacional." className="min-h-0 py-5"/>;

  const s=data.summary;
  return <div className="space-y-5">
    <section className="border-b pb-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Interpretación geológica</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">De evidencia a decisión</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Lectura técnica sobre evidencia canónica. Separa observación operacional de interpretación y no reemplaza logging, survey, ensayes ni validación del geólogo.</p>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span><strong>{s.structured_evidence||0}</strong> estructurados</span><span><strong>{s.operational_evidence||0}</strong> operacionales</span><span><strong>{s.partial_evidence||0}</strong> parciales</span><span><strong>{s.blocked||0}</strong> bloqueados</span><span><strong>{s.insufficient_evidence||0}</strong> insuficientes</span></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar sondaje" className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none"/></div></div>
        <div className="max-h-[720px] overflow-auto divide-y">{rows.map(row=><button key={row.drill_hole_id} onClick={()=>setSelectedId(row.drill_hole_id)} className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/40 ${activeId===row.drill_hole_id?'bg-muted/50':''}`}><div className="flex items-center justify-between gap-2"><p className="font-medium">{row.hole_code}</p><ChevronRight className="h-4 w-4 text-muted-foreground"/></div><p className="mt-1 text-xs text-muted-foreground">{[row.mine_name,row.sector_name].filter(Boolean).join(' · ')||'Ubicación incompleta'}</p><p className="mt-2 text-xs">{stateLabel[row.interpretation_state]||row.interpretation_state}</p></button>)}</div>
      </aside>

      <main className="min-w-0">
        {detailError?<StatePanel tone="error" title="No fue posible cargar este sondaje" description="Selecciona otro sondaje o revisa la capa canónica." className="min-h-0 py-5"/>:null}
        {detailLoading||!detail?<StatePanel title="Leyendo evidencia" description="Ordenando señales por profundidad y tipo." className="min-h-0 py-5"/>:<InterpretationDetail data={detail}/>} 
      </main>
    </div>
  </div>;
}

function InterpretationDetail({data}:{data:DetailResponse}){
  const r=data.signal; const e=data.evidence;
  const strengths:string[]=[];
  if(r.structured_intervals>0) strengths.push(`${r.structured_intervals} intervalos estructurados`);
  if(r.transition_points>0) strengths.push(`${r.transition_points} transiciones explícitas`);
  if(r.point_observations>0) strengths.push(`${r.point_observations} observaciones puntuales`);
  if(r.visual_mineral_m>0) strengths.push(`${n(r.visual_mineral_m)} m con señal visual operacional`);
  if(r.structure_m>0) strengths.push(`${n(r.structure_m)} m con evidencia estructural operacional`);

  const limitations:string[]=[];
  if(r.interpretation_state==='blocked') limitations.push('La continuidad está bloqueada por reconciliación canónica.');
  if(r.structured_intervals===0) limitations.push('No existe columna geológica estructurada suficiente para cerrar contactos o dominios.');
  if(r.visual_mineral_m>0) limitations.push('Mineralización visual no equivale a ley ni a ensaye.');
  if(r.drilled_depth_m==null) limitations.push('Profundidad final canónica no disponible.');
  if(!r.mine_name||!r.sector_name) limitations.push('Mina/sector incompleto limita comparación espacial.');

  return <div className="space-y-5">
    <section className="rounded-lg border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{stateLabel[r.interpretation_state]||r.interpretation_state}</p><h3 className="mt-1 text-2xl font-semibold">{r.hole_code}</h3><p className="mt-1 text-sm text-muted-foreground">{[r.mine_name,r.sector_name].filter(Boolean).join(' · ')||'Ubicación incompleta'} · profundidad {r.drilled_depth_m==null?'—':`${n(r.drilled_depth_m)} m`}</p></div>{r.interpretation_state==='blocked'?<AlertTriangle className="h-5 w-5"/>:<ShieldCheck className="h-5 w-5"/>}</div><p className="mt-4 text-sm">{r.interpretation_guardrail}</p></section>

    <section className="rounded-lg border bg-card p-5"><p className="font-medium">Señales principales</p><div className="mt-3"><SignalLine label="Mineralización visual" value={`${n(r.visual_mineral_m)} m`} detail={`${r.structured_mineral_intervals} intervalos estructurados · ${r.mineral_points} puntos`}/><SignalLine label="Ausencia explícita" value={`${n(r.explicit_no_mineral_m)} m`} detail="Observación operacional negativa; no prueba esterilidad fuera del tramo observado."/><SignalLine label="Estructuras" value={`${n(r.structure_m)} m`} detail={`${r.structured_structure_intervals} intervalos · ${r.structure_points} puntos estructurales`}/><SignalLine label="Litología" value={`${n(r.lithology_m)} m`} detail={`${r.structured_lithology_intervals} intervalos · ${r.transition_points} transiciones`}/><SignalLine label="Condición de roca" value={`${n(r.rock_condition_m)} m`} detail="Evidencia operacional de dureza, fracturamiento u otras condiciones descritas por perforación."/></div></section>

    <section className="grid gap-4 lg:grid-cols-2"><div className="rounded-lg border bg-card p-5"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4"/><p className="font-medium">Lectura permitida</p></div><div className="mt-3 space-y-2 text-sm">{strengths.length?strengths.map(x=><p key={x}>• {x}</p>):<p className="text-muted-foreground">No hay evidencia suficiente para una lectura técnica responsable.</p>}</div></div><div className="rounded-lg border bg-card p-5"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4"/><p className="font-medium">Limitaciones</p></div><div className="mt-3 space-y-2 text-sm text-muted-foreground">{limitations.length?limitations.map(x=><p key={x}>• {x}</p>):<p>Sin limitaciones adicionales detectadas en esta capa.</p>}</div></div></section>

    <section className="rounded-lg border bg-card p-5"><div className="flex items-center gap-2"><CircleDot className="h-4 w-4"/><p className="font-medium">Próxima decisión</p></div><p className="mt-3 text-sm">{r.effective_attention_reason||'Revisar la evidencia más reciente y confirmar si requiere estructuración adicional.'}</p><p className="mt-2 text-xs text-muted-foreground">La IA debe explicar esta evidencia y proponer la próxima revisión, pero no puede convertir observaciones visuales en ley, contactos o recursos.</p></section>

    <details className="rounded-lg border bg-card"><summary className="cursor-pointer px-5 py-4 text-sm font-medium">Ver evidencia fuente ({e.intervals.length+e.points.length+e.transitions.length+e.contiguousUnits.length})</summary><div className="border-t p-5 text-xs text-muted-foreground"><p>{e.intervals.length} intervalos · {e.points.length} puntos · {e.transitions.length} transiciones · {e.contiguousUnits.length} unidades operacionales.</p><div className="mt-3 max-h-72 space-y-2 overflow-auto">{e.intervals.slice(0,40).map((x:any,i:number)=><p key={`i-${i}`}><strong>{x.from_m}–{x.to_m} m</strong> · {[x.lithology,x.mineralization,x.operational_result].filter(Boolean).join(' · ')||'intervalo estructurado'}</p>)}{e.points.slice(0,40).map((x:any,i:number)=><p key={`p-${i}`}><strong>{x.at_depth_m} m</strong> · {x.observation}</p>)}{e.transitions.slice(0,40).map((x:any,i:number)=><p key={`t-${i}`}><strong>{x.at_depth_m} m</strong> · {x.observed_transition}</p>)}</div></div></details>
  </div>;
}
