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
type ChemistrySector={mineName:string;sectorRaw:string|null;samples:number;results:number;firstSampleDate:string|null;lastSampleDate:string|null;avgCuPct:number|null;minCuPct:number|null;maxCuPct:number|null;linkedHoles:number;linkedCanonicalSectors:number;resolutionState:string};
type ChemistryMine={mineName:string;results:number;rawLocations:number;avgCuPct:number|null;minCuPct:number|null;maxCuPct:number|null;firstSampleDate:string|null;lastSampleDate:string|null;sectorLinkedResults:number;holeLinkedResults:number};
type LineageCheck={check_key:string;expected_value:number;actual_value:number;status:string};
type Data={period:null|{periodStart:string;dataThrough:string;totalShifts:number;assayed:number;pending:number;coveragePct:number;headGrade:Range|null;concentrateGrade:Range|null;tailingsGrade:Range|null;recovery:Range|null};pending:Pending[];recent:Recent[];canonical:Canonical;chemistrySectors:ChemistrySector[];chemistryMines:ChemistryMine[];lineageChecks:LineageCheck[];scope:{canonicalChemistryAvailable:boolean;currentProjection:string;limitations:string};lineage:{processAssays:string;canonicalSamples:string;targetLineage:string;note:string}};
const fetcher=async(url:string):Promise<Data>=>{const r=await fetch(url,{credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar Química');return d};
const pct=(v:number|null|undefined,d=2)=>v==null?'—':`${v.toLocaleString('es-CL',{maximumFractionDigits:d})}%`;
const n=(v:number)=>v.toLocaleString('es-CL');
const date=(v:string|null)=>v?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(`${v}T12:00:00`)):'—';

export function ChemistryDashboard(){
  const {data,error,isLoading,mutate}=useSWR<Data>('/api/produccion/quimica',fetcher);
  const p=data?.period;
  const canonical=data?.canonical;
  const sourceSectors=data?.chemistrySectors||[];
  const sourceSectorCount=new Set(sourceSectors.filter(x=>x.mineName!=='Sin mina'&&x.sectorRaw).map(x=>`${x.mineName}|${x.sectorRaw}`)).size;
  const lineagePass=(data?.lineageChecks||[]).filter(x=>x.status==='PASS').length;
  const cards=[
    {label:'Cobertura proceso',value:p?pct(p.coveragePct,1):'—',detail:p?`${p.assayed} de ${p.totalShifts} turnos`:'—',icon:CheckCircle2},
    {label:'Ley cabeza Cu',value:pct(p?.headGrade?.avg,3),detail:p?.headGrade?`${pct(p.headGrade.min,3)} – ${pct(p.headGrade.max,3)}`:'Sin datos',icon:Beaker},
    {label:'Recuperación',value:pct(p?.recovery?.avg,2),detail:p?.recovery?`${pct(p.recovery.min,2)} – ${pct(p.recovery.max,2)}`:'Sin datos',icon:FlaskConical},
    {label:'Ley relave',value:pct(p?.tailingsGrade?.avg,3),detail:p?.tailingsGrade?`${pct(p.tailingsGrade.min,3)} – ${pct(p.tailingsGrade.max,3)}`:'Sin datos',icon:Microscope},
  ];
  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Producción · Química</PageHeaderEyebrow><PageHeaderTitle>Química</PageHeaderTitle><PageHeaderDescription>{p?`Muestras especiales históricas y ensayos de proceso. Planta disponible hasta ${date(p.dataThrough)}.`:'Ensayos analíticos y trazabilidad de muestras.'}</PageHeaderDescription></PageHeaderContent></PageHeader>
    {error?<StatePanel tone="error" title="No fue posible cargar Química" description={error.message} actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>}/>:null}

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5" aria-label="Química de mina">
      <Metric label="Muestras especiales" value={canonical?n(canonical.samples):'—'} detail="Con Cu explícito en fuente"/>
      <Metric label="Resultados Cu" value={canonical?n(canonical.results):'—'} detail="Sin imputaciones"/>
      <Metric label="Ubicaciones fuente" value={n(sourceSectorCount)} detail="Mina + texto original"/>
      <Metric label="Pozos vinculados" value={canonical?n(canonical.holes_with_samples):'—'} detail="Sólo match demostrable"/>
      <Metric label="Gate linaje" value={`${lineagePass}/${data?.lineageChecks?.length||0}`} detail="Sin enlaces forzados"/>
    </section>

    {data?.chemistryMines?.length?<section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="font-medium">Contexto histórico por Mina</h2><p className="mt-1 text-xs text-muted-foreground">Muestras puntuales 2016–2017. Contexto histórico, no ley representativa del plan 2026.</p></div><div className="grid gap-px bg-border md:grid-cols-3">{data.chemistryMines.map(m=><div key={m.mineName} className="bg-card px-5 py-4"><p className="font-medium">{m.mineName}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{pct(m.avgCuPct,3)}</p><p className="mt-1 text-xs text-muted-foreground">{m.results} resultados · {m.rawLocations} ubicaciones · rango {pct(m.minCuPct,2)}–{pct(m.maxCuPct,2)}</p><p className="mt-2 text-xs text-muted-foreground">{date(m.firstSampleDate)} → {date(m.lastSampleDate)}</p></div>)}</div></section>:null}

    {sourceSectors.length?<section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3"><h2 className="font-medium">Química por Mina / Sector fuente</h2><p className="mt-1 text-xs text-muted-foreground">Valores Cu extraídos de observaciones explícitas de `LEY (1).xlsx`. El nombre del sector se conserva tal como aparece en la fuente.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Mina</th><th className="px-4 py-3 font-medium">Sector / ubicación</th><th className="px-4 py-3 text-right font-medium">Muestras</th><th className="px-4 py-3 text-right font-medium">Cu medio</th><th className="px-4 py-3 text-right font-medium">Rango Cu</th><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Linaje</th></tr></thead><tbody>{sourceSectors.map((r,i)=><tr key={`${r.mineName}-${r.sectorRaw}-${i}`} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{r.mineName}</td><td className="px-4 py-3">{r.sectorRaw||'Sin ubicación explícita'}</td><td className="px-4 py-3 text-right">{n(r.samples)}</td><td className="px-4 py-3 text-right">{pct(r.avgCuPct,3)}</td><td className="px-4 py-3 text-right">{r.minCuPct==null?'—':`${pct(r.minCuPct,2)} – ${pct(r.maxCuPct,2)}`}</td><td className="px-4 py-3">{date(r.lastSampleDate)}</td><td className="px-4 py-3 text-muted-foreground">{r.linkedHoles>0?`${r.linkedHoles} pozo(s)`:'Mina acreditada · Sector RAW · Pozo no acreditado'}</td></tr>)}</tbody></table></div>
    </section>:null}

    <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Sector/Pozo no se fuerzan</p><p className="mt-1 text-muted-foreground">{data?.scope?.limitations||'Sin evidencia suficiente para relacionar muestras con un sector canónico o pozo.'}</p></div></div>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4" aria-label="KPI químicos de proceso">{cards.map(c=>{const Icon=c.icon;return <div key={c.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{c.label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading?'—':c.value}</p><p className="mt-1 text-xs text-muted-foreground">{c.detail}</p></div>})}</section>

    {data?.pending?.length?<section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="font-medium">Ensayos de proceso pendientes</h2><p className="mt-1 text-xs text-muted-foreground">Turnos con evidencia incompleta; no se imputan valores.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Fecha</th><th className="px-4 py-3 font-medium">Turno</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Fuente</th></tr></thead><tbody>{data.pending.map(r=><tr key={r.plantShiftId} className="border-b last:border-0"><td className="px-4 py-3">{date(r.operationDate)}</td><td className="px-4 py-3">{r.shiftCode||'—'}</td><td className="px-4 py-3">{r.state}</td><td className="px-4 py-3 text-muted-foreground">{r.sourceFile||'—'}{r.sourceRow?` · fila ${r.sourceRow}`:''}</td></tr>)}</tbody></table></div></section>:null}

    {data?.recent?.length?<section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><h2 className="font-medium">Resultados de proceso recientes</h2><p className="mt-1 text-xs text-muted-foreground">Ensayos de Planta/Metalurgia, separados de las muestras especiales de mina.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Cabeza</th><th className="px-4 py-3 font-medium">Concentrado</th><th className="px-4 py-3 font-medium">Relave</th><th className="px-4 py-3 font-medium">Recuperación</th><th className="px-4 py-3 font-medium">Validación</th><th className="px-4 py-3 font-medium">Fuente</th></tr></thead><tbody>{data.recent.map(r=><tr key={r.id} className="border-b last:border-0"><td className="px-4 py-3">{pct(r.head_grade,3)}</td><td className="px-4 py-3">{pct(r.concentrate_grade,2)}</td><td className="px-4 py-3">{pct(r.tailings_grade,3)}</td><td className="px-4 py-3">{pct(r.recovery_reported,2)}</td><td className="px-4 py-3">{r.validation_status||r.analysis_status||'—'}</td><td className="px-4 py-3 text-muted-foreground">{r.source_file||'—'}{r.source_row?` · fila ${r.source_row}`:''}</td></tr>)}</tbody></table></div></section>:null}

    {data?.lineage?<div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground"><Link2 className="mt-0.5 h-4 w-4 shrink-0"/><div><strong className="font-medium text-foreground">Linaje:</strong> {data.lineage.targetLineage}. <span>{data.lineage.note}</span></div></div>:null}
  </div>;
}
function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>}
