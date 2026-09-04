'use client';

import { AlertTriangle, ArrowRight, Beaker, CheckCircle2, Compass, Drill, FileSearch, MapPinned, ShieldCheck } from 'lucide-react';

type Summary = {
  holes:number;
  locatedHoles:number;
  orientedHoles:number;
  purposeHoles:number;
  intervals:number;
  samples:number;
  samplesValidated:number;
  samplesReview:number;
  unresolvedLocations:number;
};

type PendingRow = {
  hole_code:string;
  resolution_state:string|null;
  review_priority:number|null;
  recommended_action:string|null;
  proposed_mine_name:string|null;
  proposed_sector_name:string|null;
};

type Props = {
  summary:Summary;
  pending:PendingRow[];
  onOpenHoles:()=>void;
  onOpenResults:()=>void;
  onOpenPending:()=>void;
};

function pct(done:number,total:number){
  return total>0?Math.round((done/total)*100):0;
}

function Signal({label,value,detail,tone='neutral'}:{label:string;value:string;detail:string;tone?:'neutral'|'warn'|'ok'}){
  const toneClass=tone==='warn'?'text-amber-700 dark:text-amber-400':tone==='ok'?'text-emerald-700 dark:text-emerald-400':'text-foreground';
  return <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold tracking-tight ${toneClass}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

export function GeologiaTodayDecisionBoard({summary:s,pending,onOpenHoles,onOpenResults,onOpenPending}:Props){
  const locatedPct=pct(s.locatedHoles,s.holes);
  const orientedPct=pct(s.orientedHoles,s.holes);
  const purposePct=pct(s.purposeHoles,s.holes);
  const validatedPct=pct(s.samplesValidated,s.samples);
  const topPending=[...pending].sort((a,b)=>(b.review_priority||0)-(a.review_priority||0)).slice(0,3);

  const decisions=[
    {
      title:'Completar ubicación de sondajes',
      detail:`${s.holes-s.locatedHoles} de ${s.holes} sondajes no tienen collar georreferenciado utilizable.`,
      impact:'Sin collar no se puede interpretar espacialmente la evidencia ni construir una vista de mina confiable.',
      action:'Abrir mapa y sondajes',
      onClick:onOpenHoles,
      icon:MapPinned,
      active:s.holes>s.locatedHoles,
    },
    {
      title:'Cerrar revisión de muestras',
      detail:`${s.samplesReview} muestras requieren revisión; ${s.samplesValidated} están validadas.`,
      impact:'Las muestras en revisión no deberían tratarse como evidencia cerrada para decisiones de ley o reconciliación.',
      action:'Abrir resultados',
      onClick:onOpenResults,
      icon:Beaker,
      active:s.samplesReview>0,
    },
    {
      title:'Resolver reconciliaciones pendientes',
      detail:`${s.unresolvedLocations} registros mantienen ubicación o reconciliación abierta.`,
      impact:'Resolver mina, sector y pozo mejora trazabilidad y evita atribuciones ambiguas en análisis posteriores.',
      action:'Abrir pendientes',
      onClick:onOpenPending,
      icon:AlertTriangle,
      active:s.unresolvedLocations>0,
    },
  ].sort((a,b)=>Number(b.active)-Number(a.active));

  return <div className="space-y-5">
    <section className="rounded-lg border bg-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Mesa de decisiones · Hoy</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Qué necesita atención geológica ahora</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Prioridades derivadas sólo de la evidencia canónica disponible en La Patagua. No se infiere geología inexistente ni se mezclan fuentes externas.</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-muted-foreground"/>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {decisions.map((item)=>{const Icon=item.icon;return <button key={item.title} type="button" onClick={item.onClick} className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/20">
          <div className="flex items-start justify-between gap-3"><Icon className={`h-5 w-5 ${item.active?'text-amber-700 dark:text-amber-400':'text-emerald-700 dark:text-emerald-400'}`}/><ArrowRight className="h-4 w-4 text-muted-foreground"/></div>
          <p className="mt-4 font-medium">{item.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.impact}</p>
          <p className="mt-4 text-xs font-medium">{item.action}</p>
        </button>})}
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Confianza de evidencia geológica">
      <Signal label="Collar georreferenciado" value={`${locatedPct}%`} detail={`${s.locatedHoles}/${s.holes} sondajes ubicados`} tone={locatedPct===100?'ok':locatedPct<70?'warn':'neutral'}/>
      <Signal label="Orientación completa" value={`${orientedPct}%`} detail={`${s.orientedHoles}/${s.holes} con azimut + inclinación`} tone={orientedPct===100?'ok':orientedPct<70?'warn':'neutral'}/>
      <Signal label="Propósito geológico" value={`${purposePct}%`} detail={`${s.purposeHoles}/${s.holes} con objetivo documentado`} tone={purposePct===100?'ok':purposePct<70?'warn':'neutral'}/>
      <Signal label="Muestras validadas" value={`${validatedPct}%`} detail={`${s.samplesValidated}/${s.samples} disponibles con validación`} tone={validatedPct===100?'ok':validatedPct<70?'warn':'neutral'}/>
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Lectura senior de la evidencia</p></div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex gap-3"><Compass className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Interpretación espacial</p><p className="mt-1 text-muted-foreground">{s.locatedHoles===s.holes?'Los collares disponibles permiten una lectura espacial completa del universo canónico de sondajes.':`La lectura espacial es parcial: faltan ${s.holes-s.locatedHoles} collares. Hasta resolverlos, cualquier análisis por posición debe tratarse como incompleto.`}</p></div></div>
          <div className="flex gap-3"><Drill className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Capacidad de interpretación geológica</p><p className="mt-1 text-muted-foreground">{s.intervals>0?`Hay ${s.intervals} intervalos de logging disponibles para interpretación litológica, de alteración o mineralización.`:'Aún no existen intervalos canónicos de logging. El sistema puede analizar sondajes y muestras, pero no debe afirmar litología, alteración, mineralización, RQD ni estructuras por profundidad.'}</p></div></div>
          <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Calidad de evidencia</p><p className="mt-1 text-muted-foreground">{s.samplesReview>0?`${s.samplesReview} muestras siguen abiertas a revisión. Conviene resolverlas antes de usarlas como evidencia cerrada en comparaciones o recomendaciones.`:'No hay muestras marcadas para revisión en el resumen actual.'}</p></div></div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="font-medium">Pendientes prioritarios</p><p className="mt-1 text-sm text-muted-foreground">Primeras acciones por prioridad de revisión.</p></div><AlertTriangle className="h-4 w-4 text-muted-foreground"/></div>
        {topPending.length?<div className="mt-4 space-y-3">{topPending.map((row,index)=><div key={`${row.hole_code}-${index}`} className="border-t pt-3 first:border-t-0 first:pt-0"><div className="flex items-center justify-between gap-3"><p className="font-medium">{row.hole_code}</p><span className="text-xs text-muted-foreground">P{row.review_priority??'—'}</span></div><p className="mt-1 text-xs text-muted-foreground">{[row.proposed_mine_name,row.proposed_sector_name].filter(Boolean).join(' · ')||'Sin ubicación propuesta'}</p><p className="mt-2 text-sm">{row.recommended_action||'Revisar y reconciliar evidencia.'}</p></div>)}</div>:<div className="mt-5 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No hay pendientes priorizados abiertos.</div>}
        {topPending.length?<button type="button" onClick={onOpenPending} className="mt-4 inline-flex items-center gap-1 text-sm font-medium">Ver todos los pendientes <ArrowRight className="h-4 w-4"/></button>:null}
      </section>
    </div>
  </div>;
}
