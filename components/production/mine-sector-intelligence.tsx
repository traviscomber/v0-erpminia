'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Activity, AlertTriangle, Beaker, Drill, Factory, Layers3, MapPinned, Target, Truck } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

type Row = {
  key:string; mineName:string; sectorName:string; actualTons:number; movements:number; plannedTons:number; plannedGradePct:number|null; plannedAdvanceM:number; plannedDrillingM:number;
  drillingMetersHistorical:number; drillingReportsHistorical:number; drillingHoles:number; drillingReconciliationPct:number|null; actualVsPlanPct:number|null; planMatch:string;
};
type Data = {
  periodStart:string|null; dataThrough:string|null; plan:any; sectors:Row[];
  plantContext:null|{scope:string;treatedTons:number;avgHeadGradePct:number|null;avgRecoveryPct:number|null;shifts:number;assayed:number;assayCoveragePct:number;note:string};
  drillingFreshness:any;
};
const fetcher = async (url:string) => { const r = await fetch(url,{credentials:'include'}); const j = await r.json(); if(!r.ok) throw new Error(j.error || 'Error'); return j; };
const n = (v:number,d=0) => v.toLocaleString('es-CL',{maximumFractionDigits:d});
const pct = (v:number|null,d=1) => v === null ? '—' : `${n(v,d)}%`;
const date = (v:string|null) => v ? new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(`${v}T12:00:00`)) : 'N/D';

export function MineSectorIntelligence(){
  const {data,error,isLoading} = useSWR<Data>('/api/produccion/inteligencia',fetcher);
  const [selected,setSelected] = useState<string>('');
  const row = useMemo(() => data?.sectors.find(x=>x.key===selected) || data?.sectors[0] || null,[data,selected]);
  if(error) return <StatePanel tone="error" title="No fue posible cargar inteligencia de Producción" description={error.message}/>;
  if(isLoading || !data) return <StatePanel tone="neutral" title="Cargando inteligencia operacional" description="Integrando plan, transporte, sondaje y planta."/>;

  return <div className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Producción · Inteligencia integrada</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Mina / Sector</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Lectura transversal con datos hasta {date(data.dataThrough)}. Los KPI de planta se mantienen como contexto global cuando no existe linaje directo hacia un sector.</p>
    </div>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4">
      <Metric icon={Truck} label="Sectores con movimiento" value={n(data.sectors.filter(x=>x.actualTons>0).length)} detail="Período vigente"/>
      <Metric icon={Target} label="Sectores en plan" value={n(data.sectors.filter(x=>x.plannedTons>0 || x.plannedAdvanceM>0 || x.plannedDrillingM>0).length)} detail={data.plan?.plan_code || 'Sin plan activo'}/>
      <Metric icon={Factory} label="Tratado planta" value={data.plantContext ? `${n(data.plantContext.treatedTons,1)} t` : '—'} detail="Contexto global"/>
      <Metric icon={Beaker} label="Cobertura ensayo" value={data.plantContext ? pct(data.plantContext.assayCoveragePct) : '—'} detail={data.plantContext ? `${data.plantContext.assayed}/${data.plantContext.shifts} turnos` : 'Sin datos'}/>
    </section>

    <section className="rounded-lg border bg-card p-4">
      <label className="text-xs font-medium text-muted-foreground" htmlFor="sector-select">Mina / sector</label>
      <select id="sector-select" value={row?.key || ''} onChange={(e)=>setSelected(e.target.value)} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm md:max-w-xl">
        {data.sectors.map(x=><option key={x.key} value={x.key}>{x.mineName} · {x.sectorName}</option>)}
      </select>
    </section>

    {row ? <>
      <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Truck} label="Actual transportado" value={`${n(row.actualTons,1)} t`} detail={`${n(row.movements)} movimientos`}/>
        <Metric icon={Target} label="Plan toneladas" value={row.plannedTons ? `${n(row.plannedTons,1)} t` : 'N/D'} detail={row.plannedTons ? `${pct(row.actualVsPlanPct)} ejecutado` : 'Sin meta atribuible'}/>
        <Metric icon={Drill} label="Sondaje histórico" value={row.drillingReportsHistorical ? `${n(row.drillingMetersHistorical,1)} m` : 'N/D'} detail={row.drillingReportsHistorical ? `${n(row.drillingReportsHistorical)} reportes · ${n(row.drillingHoles)} pozos raw` : 'Sin evidencia asociada'}/>
        <Metric icon={Layers3} label="Avance plan" value={row.plannedAdvanceM ? `${n(row.plannedAdvanceM,1)} m` : 'N/D'} detail="Topografía actual pendiente"/>
        <Metric icon={MapPinned} label="Reconciliación sondaje" value={pct(row.drillingReconciliationPct)} detail="Reportes vinculados a sector canónico"/>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-medium">Lectura del sector</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Item label="Mina" value={row.mineName}/><Item label="Sector" value={row.sectorName}/>
            <Item label="Ley plan" value={row.plannedGradePct === null ? 'N/D' : `${n(row.plannedGradePct,3)}% Cu`}/>
            <Item label="Perforación plan" value={row.plannedDrillingM ? `${n(row.plannedDrillingM,1)} m` : 'N/D'}/>
            <Item label="Coincidencia plan" value={row.planMatch === 'canonical_mine+normalized_sector' ? 'Mina canónica + sector normalizado' : row.planMatch === 'plan_label' ? 'Etiqueta de plan sin sector canónico' : 'Sin plan asociado'}/>
            <Item label="Último sondaje global" value={date(data.drillingFreshness?.max_date || null)}/>
          </dl>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-medium">Contexto planta</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Item label="Ley cabeza" value={data.plantContext?.avgHeadGradePct == null ? 'N/D' : `${n(data.plantContext.avgHeadGradePct,3)}% Cu`}/>
            <Item label="Recuperación" value={data.plantContext?.avgRecoveryPct == null ? 'N/D' : pct(data.plantContext.avgRecoveryPct,2)}/>
          </div>
          <div className="mt-4 flex gap-2 rounded-md border px-3 py-3 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><p>{data.plantContext?.note || 'Sin contexto metalúrgico.'}</p></div>
        </div>
      </section>
    </> : <StatePanel tone="neutral" title="Sin sectores disponibles" description="No existe información suficiente para construir la vista integrada."/>}

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3"><h2 className="font-medium">Comparación de sectores</h2><p className="mt-1 text-xs text-muted-foreground">Actual y plan sólo se comparan cuando la atribución de sector es explícita o reconciliable.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-muted/30 text-xs text-muted-foreground"><tr><th className="px-4 py-3 text-left">Mina / sector</th><th className="px-4 py-3 text-right">Actual t</th><th className="px-4 py-3 text-right">Plan t</th><th className="px-4 py-3 text-right">Cumpl.</th><th className="px-4 py-3 text-right">Sondaje m</th><th className="px-4 py-3 text-right">Reconcil.</th></tr></thead><tbody className="divide-y">{data.sectors.slice(0,30).map(x=><tr key={x.key} className="hover:bg-muted/20"><td className="px-4 py-3"><button className="text-left font-medium hover:underline" onClick={()=>setSelected(x.key)}>{x.mineName} · {x.sectorName}</button></td><td className="px-4 py-3 text-right">{n(x.actualTons,1)}</td><td className="px-4 py-3 text-right">{x.plannedTons?n(x.plannedTons,1):'—'}</td><td className="px-4 py-3 text-right">{pct(x.actualVsPlanPct)}</td><td className="px-4 py-3 text-right">{x.drillingReportsHistorical?n(x.drillingMetersHistorical,1):'—'}</td><td className="px-4 py-3 text-right">{pct(x.drillingReconciliationPct)}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
function Metric({icon:Icon,label,value,detail}:{icon:any;label:string;value:string;detail:string}){return <div className="bg-card px-4 py-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>}
function Item({label,value}:{label:string;value:string}){return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>}
