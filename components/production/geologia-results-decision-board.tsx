'use client';

import { AlertTriangle, Beaker, CheckCircle2, FileSearch, Link2, Ruler, ShieldCheck } from 'lucide-react';

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

type Props = {
  samples:Sample[];
  holes:Hole[];
  samplesValidated:number;
  samplesReview:number;
  assaysCanonical:boolean;
};

function isValidated(value:string|null){
  return ['validated','valid','approved','verified','ok'].includes(String(value||'').trim().toLowerCase());
}

function Metric({label,value,detail}:{label:string;value:string|number;detail:string}){
  return <div className="bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function formatDate(value:string|null){
  if(!value)return 'Sin fecha';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString('es-CL');
}

export function GeologiaResultsDecisionBoard({samples,holes,samplesValidated,samplesReview,assaysCanonical}:Props){
  const sorted=[...samples].sort((a,b)=>{
    const ta=a.sample_date?new Date(a.sample_date).getTime():0;
    const tb=b.sample_date?new Date(b.sample_date).getTime():0;
    return tb-ta || a.sample_code.localeCompare(b.sample_code,'es',{numeric:true});
  });
  const holeLinked=samples.filter((s)=>Boolean(s.drill_hole_id)).length;
  const intervalLinked=samples.filter((s)=>s.depth_from_m!=null&&s.depth_to_m!=null).length;
  const sourceLinked=samples.filter((s)=>Boolean(s.source_file||s.source_sheet)).length;
  const validationPct=samples.length?Math.round((samplesValidated/samples.length)*100):0;

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
          <div className="flex gap-3"><Beaker className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Interpretación de ley</p><p className="mt-1 text-muted-foreground">{assaysCanonical?'Existen ensayos canónicos en el dominio de Geología. Las comparaciones de ley deben usar únicamente esos valores y sus unidades explícitas.':'La vista actual no dispone de ensayos canónicos utilizables para interpretar ley. Motil debe limitarse a trazabilidad, estado y contexto de las muestras; no estimar ni inferir Cu, espesor mineralizado o continuidad.'}</p></div></div>
          <div className="flex gap-3"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Trazabilidad</p><p className="mt-1 text-muted-foreground">{holeLinked===samples.length&&samples.length>0?'Todas las muestras visibles están vinculadas a sondaje.':`${samples.length-holeLinked} muestras no están vinculadas a un sondaje canónico; esas filas deben reconciliarse antes de análisis por pozo.`}</p></div></div>
          <div className="flex gap-3"><Ruler className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Intervalos</p><p className="mt-1 text-muted-foreground">{intervalLinked===samples.length&&samples.length>0?'Todas las muestras tienen profundidad desde/hasta.':`${samples.length-intervalLinked} muestras no tienen intervalo completo. Sin profundidad no corresponde atribuirlas a un tramo del sondaje.`}</p></div></div>
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">QA / validación</p><p className="mt-1 text-muted-foreground">{samplesReview>0?`${samplesReview} muestras requieren revisión. Deben quedar fuera de conclusiones cerradas hasta resolver su estado.`:'No hay muestras marcadas para revisión en el resumen actual.'}</p></div></div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Siguiente automatización útil</p></div>
        <p className="mt-3 text-sm text-muted-foreground">Cuando los ensayos canónicos estén disponibles, esta misma vista debe calcular automáticamente por muestra e intervalo: ley reportada, unidad, validación QA/QC, comparación con referencia definida por La Patagua y señal de excepción.</p>
        <div className="mt-4 rounded-lg border bg-muted/10 p-4 text-sm"><p className="font-medium">Regla de producto</p><p className="mt-1 text-muted-foreground">No mezclar ley de cabeza, ensayo de muestra, ley planificada u otras medidas sin una regla operacional explícita que defina la comparación.</p></div>
        <p className="mt-4 text-xs text-muted-foreground">{sourceLinked}/{samples.length} muestras conservan referencia de archivo o planilla fuente.</p>
      </section>
    </div>

    {sorted.length?<section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3"><p className="font-medium">Muestras · más recientes primero</p><p className="mt-1 text-sm text-muted-foreground">Trazabilidad operacional. La fecha más nueva siempre aparece arriba cuando está disponible.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Muestra</th><th className="px-4 py-3">Sondaje</th><th className="px-4 py-3">Intervalo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Fuente</th></tr></thead><tbody className="divide-y">{sorted.map((sample)=>{const hole=holes.find((row)=>row.id===sample.drill_hole_id);const valid=isValidated(sample.validation_status);return <tr key={sample.id}><td className="whitespace-nowrap px-4 py-3">{formatDate(sample.sample_date)}</td><td className="px-4 py-3"><p className="font-medium">{sample.sample_code}</p><p className="text-xs text-muted-foreground">{sample.sample_type||'Tipo no informado'}</p></td><td className="px-4 py-3">{hole?.hole_code||'Sin vínculo'}</td><td className="px-4 py-3">{sample.depth_from_m!=null&&sample.depth_to_m!=null?`${sample.depth_from_m}–${sample.depth_to_m} m`:'Incompleto'}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-xs ${valid?'text-emerald-700 dark:text-emerald-400':'text-muted-foreground'}`}><CheckCircle2 className="h-3.5 w-3.5"/>{sample.validation_status||'Sin validar'}</span>{sample.validation_notes?<p className="mt-1 max-w-xs text-xs text-muted-foreground">{sample.validation_notes}</p>:null}</td><td className="px-4 py-3 text-xs text-muted-foreground">{sample.source_file||sample.source_sheet||'—'}</td></tr>})}</tbody></table></div>
    </section>:<div className="rounded-lg border border-dashed bg-muted/10 px-5 py-8 text-center"><p className="font-medium">Sin muestras cargadas</p><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Los resultados aparecerán cuando exista evidencia canónica vinculada a la operación.</p></div>}
  </div>;
}
