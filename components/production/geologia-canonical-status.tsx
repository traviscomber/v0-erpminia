'use client';

import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, Compass, Layers3, MapPinned, Search, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatePanel } from '@/components/ui/state-panel';

type HoleContext = {
  drill_hole_id:string; hole_code:string; mine_name:string|null; sector_name:string|null; status:string|null; drilled_depth_m:number|null;
  orientation_confidence:string|null; interval_count:number; point_observation_count:number; transition_count:number; daily_span_count:number;
  topography_evidence_count:number; survey_evidence_count:number; severe_chronology_count:number; material_chronology_count:number;
  mineralization_conflict_count:number; effective_priority_rank:number; effective_attention_reason:string|null; ai_grounding_state:string;
};

type CanonicalData = {
  summary:{ holes:number; structuredIntervals:number; pointObservations:number; transitions:number; dailySpans:number; blocked:number; reviewRequired:number; geometryGaps:number; operationalReady:number; insufficientEvidence:number; topographyPending:number; surveyPending:number; severeChronology:number; mineralizationConflicts:number };
  holes:HoleContext[];
};

const fetcher=async(url:string):Promise<CanonicalData>=>{
  const response=await fetch(url,{credentials:'include'});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'No fue posible cargar el estado canónico');
  return data;
};

const stateLabel:Record<string,string>={
  operational_geology_available:'Operacional',
  usable_with_geometry_gaps:'Brecha geométrica',
  review_required:'Revisión',
  blocked_reconciliation:'Bloqueado',
  insufficient_geology_evidence:'Sin evidencia suficiente',
};

function Metric({label,value,detail}:{label:string;value:number|string;detail:string}){
  return <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

export function GeologiaCanonicalStatus(){
  const {data,error,isLoading}=useSWR('/api/produccion/geologia/canonical',fetcher);
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('attention');

  const rows=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return (data?.holes||[]).filter((row)=>{
      if(q && ![row.hole_code,row.mine_name,row.sector_name,row.effective_attention_reason].some((value)=>String(value||'').toLowerCase().includes(q)))return false;
      if(filter==='attention')return row.effective_priority_rank<=2;
      if(filter==='blocked')return row.ai_grounding_state==='blocked_reconciliation';
      if(filter==='geometry')return row.ai_grounding_state==='usable_with_geometry_gaps';
      if(filter==='ready')return row.ai_grounding_state==='operational_geology_available';
      return true;
    });
  },[data?.holes,query,filter]);

  if(error)return <StatePanel tone="error" title="No fue posible cargar el estado canónico" description="La vista de Geología permanece disponible, pero no se pudo consultar la capa de calidad." className="min-h-0 py-5"/>;
  if(isLoading||!data)return <StatePanel title="Cargando estado canónico" description="Revisando evidencia, reconciliación y brechas por sondaje." className="min-h-0 py-5"/>;

  const s=data.summary;
  return <div className="space-y-5">
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Control geológico</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Estado canónico de La Patagua</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Separa evidencia utilizable, brechas y casos que deben reconciliarse antes de interpretar continuidad geológica.</p></div><ShieldAlert className="h-5 w-5 text-muted-foreground"/></div>
    </section>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Operacionales" value={s.operationalReady} detail="Geología utilizable"/>
      <Metric label="Brecha geométrica" value={s.geometryGaps} detail="Collar / survey pendiente"/>
      <Metric label="Revisión" value={s.reviewRequired} detail="Cronología material"/>
      <Metric label="Bloqueados" value={s.blocked} detail="No interpretar continuidad"/>
      <Metric label="Sin evidencia" value={s.insufficientEvidence} detail="Cobertura insuficiente"/>
    </section>

    <section className="grid gap-4 lg:grid-cols-4">
      <div className="rounded-lg border bg-card p-4"><Layers3 className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.structuredIntervals}</p><p className="text-sm text-muted-foreground">intervalos estructurados</p></div>
      <div className="rounded-lg border bg-card p-4"><Compass className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.pointObservations+s.transitions}</p><p className="text-sm text-muted-foreground">puntos + transiciones</p></div>
      <div className="rounded-lg border bg-card p-4"><MapPinned className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.topographyPending}</p><p className="text-sm text-muted-foreground">con evidencia topográfica</p></div>
      <div className="rounded-lg border bg-card p-4"><AlertTriangle className="h-4 w-4 text-muted-foreground"/><p className="mt-3 text-2xl font-semibold tabular-nums">{s.mineralizationConflicts}</p><p className="text-sm text-muted-foreground">conflictos mineralógicos</p></div>
    </section>

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-medium">Cola del geólogo</p><p className="mt-1 text-sm text-muted-foreground">Primero reconciliación y geometría; después estructuración de evidencia.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Buscar sondaje" className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none sm:w-64"/></div><select value={filter} onChange={(event)=>setFilter(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="attention">Requiere atención</option><option value="blocked">Bloqueados</option><option value="geometry">Brecha geométrica</option><option value="ready">Operacionales</option><option value="all">Todos</option></select></div></div>
      <div className="max-h-[560px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted/70 text-left text-xs text-muted-foreground backdrop-blur"><tr><th className="px-4 py-3">Sondaje</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Evidencia</th><th className="px-4 py-3">Atención</th></tr></thead><tbody className="divide-y">{rows.map((row)=><tr key={row.drill_hole_id}><td className="px-4 py-3 align-top"><p className="font-medium">{row.hole_code}</p><p className="mt-1 text-xs text-muted-foreground">{[row.mine_name,row.sector_name].filter(Boolean).join(' · ')||'Mina/sector pendiente'}</p></td><td className="px-4 py-3 align-top"><div className="flex items-center gap-2">{row.ai_grounding_state==='operational_geology_available'?<CheckCircle2 className="h-4 w-4"/>:<AlertTriangle className="h-4 w-4"/>}<span>{stateLabel[row.ai_grounding_state]||row.ai_grounding_state}</span></div><p className="mt-1 text-xs text-muted-foreground">P{row.effective_priority_rank}</p></td><td className="px-4 py-3 align-top text-xs text-muted-foreground"><p>{row.interval_count} intervalos · {row.point_observation_count} puntos</p><p className="mt-1">{row.transition_count} transiciones · {row.daily_span_count} tramos diarios</p></td><td className="max-w-xl px-4 py-3 align-top"><p className="text-sm">{row.effective_attention_reason||'Sin acción prioritaria'}</p>{row.severe_chronology_count>0||row.mineralization_conflict_count>0?<p className="mt-1 text-xs font-medium">Continuidad bloqueada hasta reconciliar.</p>:null}</td></tr>)}</tbody></table>{rows.length===0?<div className="px-5 py-8 text-center text-sm text-muted-foreground">No hay sondajes para este filtro.</div>:null}</div>
    </section>
  </div>;
}
