'use client';

import useSWR from 'swr';
import { AlertTriangle, Beaker, CheckCircle2, FlaskConical, Microscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type Range={min:number;max:number;avg:number};
type Pending={plantShiftId:string;operationDate:string;shiftCode:string|null;state:string;sourceFile:string|null;sourceRow:number|null};
type Recent={id:string;plant_shift_id:string;head_grade:number|null;concentrate_grade:number|null;tailings_grade:number|null;recovery_reported:number|null;analysis_status:string|null;validation_status:string|null;validation_notes:string|null;source_file:string|null;source_sheet:string|null;source_row:number|null;updated_at:string};
type Data={period:null|{periodStart:string;dataThrough:string;totalShifts:number;assayed:number;pending:number;coveragePct:number;headGrade:Range|null;concentrateGrade:Range|null;tailingsGrade:Range|null};pending:Pending[];recent:Recent[];scope:{canonicalChemistryAvailable:boolean;currentProjection:string;limitations:string};lineage:{source:string;currentModel:string;note:string}};
const fetcher=async(url:string):Promise<Data>=>{const r=await fetch(url,{credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar Química');return d};
const pct=(v:number|null|undefined,d=2)=>v==null?'—':`${v.toLocaleString('es-CL',{maximumFractionDigits:d})}%`;
const date=(v:string)=>new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(`${v}T12:00:00`));

export function ChemistryDashboard(){
  const {data,error,isLoading,mutate}=useSWR('/api/produccion/quimica',fetcher);
  const p=data?.period;
  const cards=[
    {label:'Cobertura analítica',value:p?pct(p.coveragePct,1):'—',detail:p?`${p.assayed} de ${p.totalShifts} turnos`:'—',icon:CheckCircle2},
    {label:'Ley cabeza Cu',value:pct(p?.headGrade?.avg,3),detail:p?.headGrade?`${pct(p.headGrade.min,3)} – ${pct(p.headGrade.max,3)}`:'Sin datos',icon:Beaker},
    {label:'Ley concentrado',value:pct(p?.concentrateGrade?.avg,2),detail:p?.concentrateGrade?`${pct(p.concentrateGrade.min,2)} – ${pct(p.concentrateGrade.max,2)}`:'Sin datos',icon:FlaskConical},
    {label:'Ley relave',value:pct(p?.tailingsGrade?.avg,3),detail:p?.tailingsGrade?`${pct(p.tailingsGrade.min,3)} – ${pct(p.tailingsGrade.max,3)}`:'Sin datos',icon:Microscope},
  ];
  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Producción · Evidencia analítica</PageHeaderEyebrow><PageHeaderTitle>Química</PageHeaderTitle><PageHeaderDescription>{p?`Cobertura de ensayos disponibles para Planta / Metalurgia hasta ${date(p.dataThrough)}.`:'Resultados analíticos disponibles y trazabilidad de su fuente.'}</PageHeaderDescription></PageHeaderContent></PageHeader>
    {error?<StatePanel tone="error" title="No fue posible cargar Química" description={error.message} actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>}/>:null}
    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4" aria-label="Cobertura analítica">{cards.map(c=>{const Icon=c.icon;return <div key={c.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{c.label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading?'—':c.value}</p><p className="mt-1 text-xs text-muted-foreground">{c.detail}</p></div>})}</section>
    {data?.scope&&!data.scope.canonicalChemistryAvailable?<div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Química todavía es una proyección analítica de Planta</p><p className="mt-1 text-muted-foreground">{data.scope.limitations}</p></div></div>:null}
    {data?.pending?.length?<section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="font-medium">Ensayos pendientes del período</h2><p className="mt-1 text-xs text-muted-foreground">Turnos donde la evidencia analítica está incompleta; no se imputan valores.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Turno</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Fuente</th></tr></thead><tbody>{data.pending.map(r=><tr key={r.plantShiftId} className="border-b last:border-0"><td className="px-4 py-3">{date(r.operationDate)}</td><td className="px-4 py-3">{r.shiftCode||'—'}</td><td className="px-4 py-3">{r.state}</td><td className="px-4 py-3 text-muted-foreground">{r.sourceFile||'—'}{r.sourceRow?` · fila ${r.sourceRow}`:''}</td></tr>)}</tbody></table></div></section>:null}
    {data?.recent?.length?<section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="font-medium">Resultados analíticos recientes</h2><p className="mt-1 text-xs text-muted-foreground">Vista sobre los resultados de Planta/Metalurgia existentes, no sobre un laboratorio canónico independiente.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Cabeza</th><th className="px-4 py-3 font-medium">Concentrado</th><th className="px-4 py-3 font-medium">Relave</th><th className="px-4 py-3 font-medium">Recuperación</th><th className="px-4 py-3 font-medium">Validación</th><th className="px-4 py-3 font-medium">Fuente</th></tr></thead><tbody>{data.recent.map(r=><tr key={r.id} className="border-b last:border-0"><td className="px-4 py-3">{pct(r.head_grade,3)}</td><td className="px-4 py-3">{pct(r.concentrate_grade,2)}</td><td className="px-4 py-3">{pct(r.tailings_grade,3)}</td><td className="px-4 py-3">{pct(r.recovery_reported,2)}</td><td className="px-4 py-3">{r.validation_status||r.analysis_status||'—'}</td><td className="px-4 py-3 text-muted-foreground">{r.source_file||'—'}{r.source_row?` · fila ${r.source_row}`:''}</td></tr>)}</tbody></table></div></section>:null}
    {data?.lineage?<div className="rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground"><strong className="font-medium text-foreground">Alcance actual:</strong> {data.lineage.note}</div>:null}
  </div>;
}
