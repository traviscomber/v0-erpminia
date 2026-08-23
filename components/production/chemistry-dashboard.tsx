'use client';

import useSWR from 'swr';
import { AlertTriangle, Beaker, CheckCircle2, FlaskConical, Link2, Microscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type Range={min:number;max:number;avg:number};
type Pending={plantShiftId:string;operationDate:string;shiftCode:string|null;state:string;sourceFile:string|null;sourceRow:number|null};
type Recent={id:string;plant_shift_id:string;head_grade:number|null;concentrate_grade:number|null;tailings_grade:number|null;recovery_reported:number|null;analysis_status:string|null;validation_status:string|null;validation_notes:string|null;source_file:string|null;source_sheet:string|null;source_row:number|null;updated_at:string};
type Canonical={samples:number;results:number;holes_with_samples:number;sectors_with_samples:number;sample_review_rows:number;result_review_rows:number};
type Data={period:null|{periodStart:string;dataThrough:string;totalShifts:number;assayed:number;pending:number;coveragePct:number;headGrade:Range|null;concentrateGrade:Range|null;tailingsGrade:Range|null;recovery:Range|null};pending:Pending[];recent:Recent[];canonical:Canonical;scope:{canonicalChemistryAvailable:boolean;currentProjection:string;limitations:string};lineage:{processAssays:string;canonicalSamples:string;targetLineage:string;note:string}};
const fetcher=async(url:string):Promise<Data>=>{const r=await fetch(url,{credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar Química');return d};
const pct=(v:number|null|undefined,d=2)=>v==null?'—':`${v.toLocaleString('es-CL',{maximumFractionDigits:d})}%`;
const n=(v:number)=>v.toLocaleString('es-CL');
const date=(v:string)=>new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(`${v}T12:00:00`));

export function ChemistryDashboard(){
  const {data,error,isLoading,mutate}=useSWR<Data>('/api/produccion/quimica',fetcher);
  const p=data?.period;
  const canonical=data?.canonical;
  const cards=[
    {label:'Cobertura proceso',value:p?pct(p.coveragePct,1):'—',detail:p?`${p.assayed} de ${p.totalShifts} turnos`:'—',icon:CheckCircle2},
    {label:'Ley cabeza Cu',value:pct(p?.headGrade?.avg,3),detail:p?.headGrade?`${pct(p.headGrade.min,3)} – ${pct(p.headGrade.max,3)}`:'Sin datos',icon:Beaker},
    {label:'Recuperación',value:pct(p?.recovery?.avg,2),detail:p?.recovery?`${pct(p.recovery.min,2)} – ${pct(p.recovery.max,2)}`:'Sin datos',icon:FlaskConical},
    {label:'Ley relave',value:pct(p?.tailingsGrade?.avg,3),detail:p?.tailingsGrade?`${pct(p.tailingsGrade.min,3)} – ${pct(p.tailingsGrade.max,3)}`:'Sin datos',icon:Microscope},
  ];
  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Producción · Química</PageHeaderEyebrow><PageHeaderTitle>Química</PageHeaderTitle><PageHeaderDescription>{p?`Ensayos de proceso hasta ${date(p.dataThrough)} y preparación del linaje químico independiente.`:'Ensayos analíticos y trazabilidad de muestras.'}</PageHeaderDescription></PageHeaderContent></PageHeader>
    {error?<StatePanel tone="error" title="No fue posible cargar Química" description={error.message} actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>}/>:null}

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4" aria-label="KPI químicos de proceso">{cards.map(c=>{const Icon=c.icon;return <div key={c.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{c.label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading?'—':c.value}</p><p className="mt-1 text-xs text-muted-foreground">{c.detail}</p></div>})}</section>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4" aria-label="Química independiente">
      <Metric label="Muestras laboratorio" value={canonical?n(canonical.samples):'—'} detail="Fuente independiente"/>
      <Metric label="Resultados analíticos" value={canonical?n(canonical.results):'—'} detail="Analitos registrados"/>
      <Metric label="Pozos con muestras" value={canonical?n(canonical.holes_with_samples):'—'} detail="Linaje Pozo"/>
      <Metric label="Sectores con muestras" value={canonical?n(canonical.sectors_with_samples):'—'} detail="Linaje Sector"/>
    </section>

    {data?.scope&&!data.scope.canonicalChemistryAvailable?<div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Geoquímica de Pozo/Sector aún sin fuente</p><p className="mt-1 text-muted-foreground">{data.scope.limitations}</p><p className="mt-2 text-xs text-muted-foreground">El modelo ya está preparado para Muestra → Pozo → Mina → Sector → Analito. No se reutilizan las leyes de Planta como si fueran muestras de sondaje.</p></div></div>:null}

    {data?.pending?.length?<section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="font-medium">Ensayos de proceso pendientes</h2><p className="mt-1 text-xs text-muted-foreground">Turnos con evidencia incompleta; no se imputan valores.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Turno</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Fuente</th></tr></thead><tbody>{data.pending.map(r=><tr key={r.plantShiftId} className="border-b last:border-0"><td className="px-4 py-3">{date(r.operationDate)}</td><td className="px-4 py-3">{r.shiftCode||'—'}</td><td className="px-4 py-3">{r.state}</td><td className="px-4 py-3 text-muted-foreground">{r.sourceFile||'—'}{r.sourceRow?` · fila ${r.sourceRow}`:''}</td></tr>)}</tbody></table></div></section>:null}

    {data?.recent?.length?<section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="font-medium">Resultados de proceso recientes</h2><p className="mt-1 text-xs text-muted-foreground">Ensayos de Planta/Metalurgia, separados de la futura geoquímica de muestras.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Cabeza</th><th className="px-4 py-3 font-medium">Concentrado</th><th className="px-4 py-3 font-medium">Relave</th><th className="px-4 py-3 font-medium">Recuperación</th><th className="px-4 py-3 font-medium">Validación</th><th className="px-4 py-3 font-medium">Fuente</th></tr></thead><tbody>{data.recent.map(r=><tr key={r.id} className="border-b last:border-0"><td className="px-4 py-3">{pct(r.head_grade,3)}</td><td className="px-4 py-3">{pct(r.concentrate_grade,2)}</td><td className="px-4 py-3">{pct(r.tailings_grade,3)}</td><td className="px-4 py-3">{pct(r.recovery_reported,2)}</td><td className="px-4 py-3">{r.validation_status||r.analysis_status||'—'}</td><td className="px-4 py-3 text-muted-foreground">{r.source_file||'—'}{r.source_row?` · fila ${r.source_row}`:''}</td></tr>)}</tbody></table></div></section>:null}

    {data?.lineage?<div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground"><Link2 className="mt-0.5 h-4 w-4 shrink-0"/><div><strong className="font-medium text-foreground">Linaje objetivo:</strong> {data.lineage.targetLineage}. <span>{data.lineage.note}</span></div></div>:null}
  </div>;
}
function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>}
