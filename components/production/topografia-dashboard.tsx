'use client';

import useSWR from 'swr';
import { AlertTriangle, Map, Ruler, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type TopografiaData = {
  plan: null | { plan_code:string; period_start:string; period_end:string };
  summary: { canonicalSectors:number; planLines:number; plannedAdvanceM:number; plannedDrillingM:number; plannedTons:number; actualSurveyPoints:number|null; actualAdvanceM:number|null };
  lines: Array<{ id:string; line_type:string; mine_name_raw:string|null; sector_raw:string|null; level_raw:string|null; section_raw:string|null; planned_tons:number|null; planned_grade_pct:number|null; planned_advance_m:number|null; planned_drilling_m:number|null; priority:number|null; source_reference:string|null }>;
  intelligenceStatus: { surveyCanonical:boolean; coordinatesCanonical:boolean; actualAdvanceCanonical:boolean; note:string };
};

const fetcher=async(url:string):Promise<TopografiaData>=>{const r=await fetch(url,{credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar Topografía');return d;};
const n=(v:number,d=0)=>v.toLocaleString('es-CL',{maximumFractionDigits:d});

export function TopografiaDashboard(){
 const {data,error,isLoading,mutate}=useSWR('/api/produccion/topografia',fetcher);
 const s=data?.summary;
 return <div className="space-y-6">
  <PageHeader><PageHeaderContent><PageHeaderEyebrow>Producción · Control espacial</PageHeaderEyebrow><PageHeaderTitle>Topografía</PageHeaderTitle><PageHeaderDescription>Plan espacial de labores y avance. Los datos reales de levantamiento se mostrarán sólo cuando exista una fuente topográfica canónica.</PageHeaderDescription></PageHeaderContent></PageHeader>
  {error?<StatePanel tone="error" title="No fue posible cargar Topografía" description="Reintenta la consulta." actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/>:null}
  <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">{[
   {label:'Sectores canónicos',value:s?n(s.canonicalSectors):'—',detail:'Maestro operacional',icon:Map},
   {label:'Avance planificado',value:s?`${n(s.plannedAdvanceM)} m`:'—',detail:data?.plan?.plan_code||'Plan vigente',icon:Ruler},
   {label:'Sondaje planificado',value:s?`${n(s.plannedDrillingM)} m`:'—',detail:`${s?.planLines??0} líneas de plan`,icon:Target},
   {label:'Avance real topográfico',value:s?.actualAdvanceM==null?'N/D':`${n(s.actualAdvanceM)} m`,detail:'Pendiente fuente canónica',icon:AlertTriangle},
  ].map(m=>{const Icon=m.icon;return <div key={m.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{m.label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold">{isLoading?'—':m.value}</p><p className="mt-1 text-xs text-muted-foreground">{m.detail}</p></div>})}</section>
  {data?<div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">ACTUAL topográfico todavía no disponible</p><p className="mt-1 text-muted-foreground">{data.intelligenceStatus.note}</p></div></div>:null}
  {data?<section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Plan de labores</p><p className="mt-1 text-sm text-muted-foreground">Base preparada para reconciliar posteriormente avance real, coordenadas y cotas.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Mina / sector</th><th className="px-4 py-3">Nivel / sección</th><th className="px-4 py-3 text-right">Toneladas</th><th className="px-4 py-3 text-right">Avance</th><th className="px-4 py-3 text-right">Perforación</th></tr></thead><tbody className="divide-y">{data.lines.map(l=><tr key={l.id}><td className="px-4 py-3">{l.line_type}</td><td className="px-4 py-3"><p>{l.mine_name_raw||'—'}</p><p className="text-xs text-muted-foreground">{l.sector_raw||'Sin sector'}</p></td><td className="px-4 py-3"><p>{l.level_raw||'—'}</p><p className="text-xs text-muted-foreground">{l.section_raw||'—'}</p></td><td className="px-4 py-3 text-right tabular-nums">{l.planned_tons==null?'—':n(Number(l.planned_tons),1)}</td><td className="px-4 py-3 text-right tabular-nums">{l.planned_advance_m==null?'—':`${n(Number(l.planned_advance_m),1)} m`}</td><td className="px-4 py-3 text-right tabular-nums">{l.planned_drilling_m==null?'—':`${n(Number(l.planned_drilling_m),1)} m`}</td></tr>)}</tbody></table></div></section>:null}
 </div>;
}
