'use client';

import useSWR from 'swr';
import { AlertTriangle, Beaker, CheckCircle2, FileSearch, Link2, Ruler, ShieldCheck } from 'lucide-react';
import { periodUrl, useDashboardPeriod } from '@/components/dashboard/dashboard-period-provider';

type Hole = { id:string; hole_code:string };
type Sample = {
  id:string;
  sample_code:string;
  sample_type:string|null;
  sample_date:string|null;
  drill_hole_id:string|null;
  depth_from_m:number|null;
  depth_to_m:number|null;
  source_file:string|null;
  source_sheet:string|null;
  validation_status:string|null;
  validation_notes:string|null;
};

type ChemistryResult = {
  id:string;
  sample_id:string;
  sample_code:string|null;
  sample_type:string|null;
  sample_date:string|null;
  analyte_code:string|null;
  analyte_name:string|null;
  result_value:number|null;
  result_unit:string|null;
  method_code:string|null;
  laboratory:string|null;
  result_date:string|null;
  source_file:string|null;
  source_sheet:string|null;
  validation_status:string|null;
  mine_name:string|null;
  drill_hole_id:string|null;
  depth_from_m:number|null;
  depth_to_m:number|null;
};

type SupplementalData = { chemistryResults:ChemistryResult[] };

type Props = {
  samples:Sample[];
  holes:Hole[];
  samplesValidated:number;
  samplesReview:number;
  assaysCanonical:boolean;
};

const supplementalFetcher=async(url:string):Promise<SupplementalData>=>{
  const response=await fetch(url,{credentials:'include'});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'No fue posible cargar ensayes canónicos');
  return data;
};

function isValidated(value:string|null){
  return ['validated','valid','approved','verified','ok'].includes(String(value||'').trim().toLowerCase());
}

function Metric({label,value,detail}:{label:string;value:string|number;detail:string}){
  return <div className="bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function formatDate(value:string|null){
  if(!value)return 'Sin fecha';
  const date=new Date(`${value.slice(0,10)}T12:00:00`);
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString('es-CL');
}

function formatResult(value:number|null,unit:string|null){
  if(value==null)return '—';
  const formatted=Number(value).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:3});
  return `${formatted}${unit==='%'?'%':unit?` ${unit}`:''}`;
}

function resultTimestamp(row:ChemistryResult){
  const value=row.result_date||row.sample_date;
  return value?new Date(`${value.slice(0,10)}T12:00:00`).getTime():0;
}

export function GeologiaResultsDecisionBoard({samples,holes,samplesValidated,samplesReview,assaysCanonical}:Props){
  const {month}=useDashboardPeriod();
  const {data:supplemental,error:assayError}=useSWR(periodUrl('/api/produccion/geologia',month),supplementalFetcher);
  const assays=[...(supplemental?.chemistryResults||[])].sort((a,b)=>resultTimestamp(b)-resultTimestamp(a)||String(a.sample_code||'').localeCompare(String(b.sample_code||''),'es',{numeric:true}));
  const sorted=[...samples].sort((a,b)=>{
    const ta=a.sample_date?new Date(a.sample_date).getTime():0;
    const tb=b.sample_date?new Date(b.sample_date).getTime():0;
    return tb-ta || a.sample_code.localeCompare(b.sample_code,'es',{numeric:true});
  });
  const holeLinked=samples.filter((s)=>Boolean(s.drill_hole_id)).length;
  const intervalLinked=samples.filter((s)=>s.depth_from_m!=null&&s.depth_to_m!=null).length;
  const sourceLinked=samples.filter((s)=>Boolean(s.source_file||s.source_sheet)).length;
  const validationPct=samples.length?Math.round((samplesValidated/samples.length)*100):0;
  const assaysValidated=assays.filter((row)=>isValidated(row.validation_status)).length;
  const assaysLinkedToHole=assays.filter((row)=>Boolean(row.drill_hole_id)).length;

  return <div className="space-y-5">
    <section className="rounded-lg border bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Resultados · evidencia canónica</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Qué puede interpretar Geología hoy</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Primero se valida trazabilidad y calidad de la evidencia. Una muestra no se presenta como resultado de ley si el ensayo canónico correspondiente no está disponible.</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-muted-foreground"/>
      </div>

      <div className="mt-5 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Muestras" value={samples.length} detail="Registros canónicos"/>
        <Metric label="Validadas" value={`${validationPct}%`} detail={`${samplesValidated}/${samples.length} con validación`}/>
        <Metric label="Ligadas a sondaje" value={`${holeLinked}/${samples.length}`} detail="Trazabilidad hacia pozo"/>
        <Metric label="Con intervalo" value={`${intervalLinked}/${samples.length}`} detail="Desde / hasta disponibles"/>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Lectura senior</p></div>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex gap-3"><Beaker className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Interpretación de ley</p><p className="mt-1 text-muted-foreground">{assaysCanonical?'Existen ensayes canónicos. Se muestran con valor, unidad, fecha y fuente, preservando su carácter histórico cuando corresponde.':'La vista actual no dispone de ensayes canónicos utilizables para interpretar ley. Motil debe limitarse a trazabilidad, estado y contexto de las muestras; no estimar ni inferir Cu, espesor mineralizado o continuidad.'}</p></div></div>
          <div className="flex gap-3"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Trazabilidad</p><p className="mt-1 text-muted-foreground">{holeLinked===samples.length&&samples.length>0?'Todas las muestras visibles están vinculadas a sondaje.':`${samples.length-holeLinked} muestras no están vinculadas a un sondaje canónico; esas filas no deben atribuirse a un pozo por fecha, nombre o proximidad.`}</p></div></div>
          <div className="flex gap-3"><Ruler className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Intervalos</p><p className="mt-1 text-muted-foreground">{intervalLinked===samples.length&&samples.length>0?'Todas las muestras tienen profundidad desde/hasta.':`${samples.length-intervalLinked} muestras no tienen intervalo completo. Sin profundidad no corresponde atribuirlas a un tramo del sondaje.`}</p></div></div>
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">QA / validación</p><p className="mt-1 text-muted-foreground">{samplesReview>0?`${samplesReview} muestras requieren revisión. Deben quedar fuera de conclusiones cerradas hasta resolver su estado.`:'No hay muestras marcadas para revisión en el resumen actual.'}</p></div></div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Qué falta para una lectura geológica completa</p></div>
        <p className="mt-3 text-sm text-muted-foreground">Los ensayes históricos de Cu sí existen, pero hoy no están vinculados canónicamente a sondajes ni intervalos. Por eso pueden analizarse como resultados de muestra/mina, no como continuidad mineralizada por pozo.</p>
        <div className="mt-4 rounded-lg border bg-muted/10 p-4 text-sm"><p className="font-medium">Regla de producto</p><p className="mt-1 text-muted-foreground">No mezclar ley de cabeza, ensayo de muestra, ley planificada u otras medidas sin una regla operacional explícita que defina la comparación.</p></div>
        <p className="mt-4 text-xs text-muted-foreground">{sourceLinked}/{samples.length} muestras conservan referencia de archivo o planilla fuente.</p>
      </section>
    </div>

    {sorted.length?<section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3"><p className="font-medium">Muestras · más recientes primero</p><p className="mt-1 text-sm text-muted-foreground">Trazabilidad operacional. La fecha más nueva siempre aparece arriba cuando está disponible.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Muestra</th><th className="px-4 py-3">Sondaje</th><th className="px-4 py-3">Intervalo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Fuente</th></tr></thead><tbody className="divide-y">{sorted.map((sample)=>{const hole=holes.find((row)=>row.id===sample.drill_hole_id);const valid=isValidated(sample.validation_status);return <tr key={sample.id}><td className="whitespace-nowrap px-4 py-3">{formatDate(sample.sample_date)}</td><td className="px-4 py-3"><p className="font-medium">{sample.sample_code}</p><p className="text-xs text-muted-foreground">{sample.sample_type||'Tipo no informado'}</p></td><td className="px-4 py-3">{hole?.hole_code||'Sin vínculo'}</td><td className="px-4 py-3">{sample.depth_from_m!=null&&sample.depth_to_m!=null?`${sample.depth_from_m}–${sample.depth_to_m} m`:'Incompleto'}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs ${valid?'text-emerald-700 dark:text-emerald-400':'text-muted-foreground'}`}><CheckCircle2 className="h-3.5 w-3.5"/>{sample.validation_status||'Sin validar'}</span>{sample.validation_notes?<p className="mt-1 max-w-xs text-xs text-muted-foreground">{sample.validation_notes}</p>:null}</td><td className="px-4 py-3 text-xs text-muted-foreground">{sample.source_file||sample.source_sheet||'—'}</td></tr>})}</tbody></table></div>
    </section>:<div className="rounded-lg border border-dashed bg-muted/10 px-5 py-8 text-center"><p className="font-medium">Sin muestras cargadas</p><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Los resultados aparecerán cuando exista evidencia canónica vinculada a la operación.</p></div>}

    {assays.length?<section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Ensayes canónicos históricos · más recientes primero</p><p className="mt-1 text-sm text-muted-foreground">Resultados reales de La Patagua. Son evidencia histórica y no representan por sí solos la condición geológica vigente de 2026.</p></div><p className="text-xs text-muted-foreground">{assaysValidated}/{assays.length} validados · {assaysLinkedToHole} ligados a sondaje</p></div></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Muestra</th><th className="px-4 py-3">Mina</th><th className="px-4 py-3">Analito</th><th className="px-4 py-3 text-right">Resultado</th><th className="px-4 py-3">Método</th><th className="px-4 py-3">Sondaje</th><th className="px-4 py-3">Fuente</th></tr></thead><tbody className="divide-y">{assays.map((row)=><tr key={row.id}><td className="whitespace-nowrap px-4 py-3">{formatDate(row.result_date||row.sample_date)}</td><td className="px-4 py-3"><p className="font-medium">{row.sample_code||'Sin código'}</p><p className="text-xs text-muted-foreground">{row.sample_type||'Tipo no informado'}</p></td><td className="px-4 py-3">{row.mine_name||'Sin mina canónica'}</td><td className="px-4 py-3">{row.analyte_name||row.analyte_code||'—'}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{formatResult(row.result_value,row.result_unit)}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.method_code||row.laboratory||'—'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.drill_hole_id?'Vínculo canónico':'Sin vínculo'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.source_file||row.source_sheet||'—'}</td></tr>)}</tbody></table></div>
    </section>:assaysCanonical&&!assayError?<div className="rounded-lg border border-dashed bg-muted/10 px-5 py-6 text-sm text-muted-foreground">Cargando ensayes canónicos…</div>:null}
  </div>;
}
