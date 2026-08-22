'use client';

import useSWR from 'swr';
import { Activity, AlertTriangle, Factory, FlaskConical, Gauge, Layers3, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type Row = { plant_shift_id:string; operation_date:string; shift_code:string|null; treated_metric_tons:number|null; mineral_moisture_pct:number|null; head_grade:number|null; concentrate_grade:number|null; tailings_grade:number|null; recovery_reported:number|null; recovery_by_grades_pct:number|null; metallurgy_state:string; source_file:string|null; source_row:number|null };
type Data = {
  period:null|{periodStart:string;dataThrough:string;shifts:number;treatedTons:number;mineralMoisturePct:number|null;headGradePct:number|null;concentrateGradePct:number|null;tailingsGradePct:number|null;recoveryPct:number|null;fineMetalReportedTons:number;concentrateWetTons:number;assayed:number;partial:number;noAssay:number;assayCoveragePct:number};
  daily:Array<{operationDate:string;shifts:number;treatedTons:number;headGradePct:number|null;concentrateGradePct:number|null;tailingsGradePct:number|null;recoveryPct:number|null;assayed:number;noAssay:number}>;
  recent:Row[];
  historical:null|{rows:number;minDate:string|null;maxDate:string;assayed:number;partial:number;noAssay:number};
  lineage:{source:string;model:string;note:string};
};
const fetcher=async(url:string):Promise<Data>=>{const r=await fetch(url,{credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar Planta / Metalurgia');return d};
const pct=(v:number|null|undefined,d=2)=>v==null?'—':`${v.toLocaleString('es-CL',{maximumFractionDigits:d})}%`;
const tons=(v:number|null|undefined,d=1)=>`${Number(v||0).toLocaleString('es-CL',{maximumFractionDigits:d})} t`;
const date=(v:string|null|undefined)=>v?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(`${v}T12:00:00`)):'—';

export function PlantMetallurgyDashboard(){
  const {data,error,isLoading,mutate}=useSWR('/api/produccion/planta-metalurgia',fetcher);
  const p=data?.period;
  const metrics=[
    {label:'Mineral tratado',value:p?tons(p.treatedTons):'—',detail:`${p?.shifts??0} turnos`,icon:Factory},
    {label:'Ley cabeza Cu',value:pct(p?.headGradePct,3),detail:'Ponderada por tonelaje',icon:Gauge},
    {label:'Recuperación',value:pct(p?.recoveryPct,2),detail:'Ponderada por tonelaje',icon:Activity},
    {label:'Ley concentrado',value:pct(p?.concentrateGradePct,2),detail:'Ensayos disponibles',icon:FlaskConical},
    {label:'Ley relave',value:pct(p?.tailingsGradePct,3),detail:'Ensayos disponibles',icon:Scale},
  ];
  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Producción · Planta</PageHeaderEyebrow><PageHeaderTitle>Planta / Metalurgia</PageHeaderTitle><PageHeaderDescription>{p?`Desempeño acumulado ${date(p.periodStart)} – ${date(p.dataThrough)}. Datos observados y cálculos determinísticos se mantienen diferenciados.`:'Tratamiento, leyes y recuperación metalúrgica por turno.'}</PageHeaderDescription></PageHeaderContent></PageHeader>
    {error?<StatePanel tone="error" title="No fue posible cargar Planta / Metalurgia" description={error.message} actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>}/>:null}
    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores metalúrgicos">{metrics.map(m=>{const Icon=m.icon;return <div key={m.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{m.label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading?'—':m.value}</p><p className="mt-1 text-xs text-muted-foreground">{m.detail}</p></div>})}</section>
    {p?<section className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4"><div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Cobertura de ensayo</p><p className="mt-2 text-xl font-semibold">{pct(p.assayCoveragePct,1)}</p><p className="mt-1 text-xs text-muted-foreground">{p.assayed} ensayados · {p.noAssay} sin ensayo</p></div><div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Humedad mineral</p><p className="mt-2 text-xl font-semibold">{pct(p.mineralMoisturePct,2)}</p><p className="mt-1 text-xs text-muted-foreground">Promedio ponderado</p></div><div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Estados parciales</p><p className="mt-2 text-xl font-semibold">{p.partial}</p><p className="mt-1 text-xs text-muted-foreground">Requieren revisión analítica</p></div><div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Fuente vigente</p><p className="mt-2 text-sm font-medium">LEY / LEYES</p><p className="mt-1 text-xs text-muted-foreground">Linaje preservado</p></div></section>:null}
    {p&&p.noAssay>0?<div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Cobertura analítica incompleta</p><p className="mt-1 text-muted-foreground">Hay {p.noAssay} turno(s) del período sin ensayo. MOTIL no reemplaza esos valores por cero ni estima leyes faltantes.</p></div></div>:null}
    {data?.daily?.length?<section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-muted-foreground"/><h2 className="font-medium">Evolución diaria</h2></div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Tratado</th><th className="px-4 py-3 font-medium">Ley cabeza</th><th className="px-4 py-3 font-medium">Concentrado</th><th className="px-4 py-3 font-medium">Relave</th><th className="px-4 py-3 font-medium">Recuperación</th><th className="px-4 py-3 font-medium">Ensayos</th></tr></thead><tbody>{data.daily.map(r=><tr key={r.operationDate} className="border-b last:border-0"><td className="px-4 py-3">{date(r.operationDate)}</td><td className="px-4 py-3">{tons(r.treatedTons)}</td><td className="px-4 py-3">{pct(r.headGradePct,3)}</td><td className="px-4 py-3">{pct(r.concentrateGradePct,2)}</td><td className="px-4 py-3">{pct(r.tailingsGradePct,3)}</td><td className="px-4 py-3">{pct(r.recoveryPct,2)}</td><td className="px-4 py-3">{r.assayed}/{r.shifts}</td></tr>)}</tbody></table></div></section>:null}
    {data?.recent?.length?<section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="font-medium">Turnos recientes</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Turno</th><th className="px-4 py-3 font-medium">Tratado</th><th className="px-4 py-3 font-medium">Cabeza</th><th className="px-4 py-3 font-medium">Concentrado</th><th className="px-4 py-3 font-medium">Relave</th><th className="px-4 py-3 font-medium">Estado</th></tr></thead><tbody>{data.recent.map(r=><tr key={r.plant_shift_id} className="border-b last:border-0"><td className="px-4 py-3">{date(r.operation_date)}</td><td className="px-4 py-3">{r.shift_code||'—'}</td><td className="px-4 py-3">{tons(r.treated_metric_tons)}</td><td className="px-4 py-3">{pct(r.head_grade,3)}</td><td className="px-4 py-3">{pct(r.concentrate_grade,2)}</td><td className="px-4 py-3">{pct(r.tailings_grade,3)}</td><td className="px-4 py-3">{r.metallurgy_state}</td></tr>)}</tbody></table></div></section>:null}
    {data?.lineage?<div className="rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground"><strong className="font-medium text-foreground">Linaje:</strong> {data.lineage.source}. {data.lineage.note}</div>:null}
  </div>;
}
