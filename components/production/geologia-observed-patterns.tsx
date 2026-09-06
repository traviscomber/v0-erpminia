'use client';

import { AlertTriangle, GitCompareArrows, SearchCheck } from 'lucide-react';

type Pattern = {
  pattern_type:string;
  pattern_label:string;
  evidence_strength:string;
  evidence_value:number|null;
  evidence_unit:string|null;
  from_m:number|null;
  to_m:number|null;
  source_rows:number[]|null;
  evidence_summary:string;
  review_question:string;
  required_validation:string;
  pattern_scope:string;
  guardrail:string;
};

const strengthLabel:Record<string,string>={
  strong_observed_signal:'Señal observada fuerte',
  observed_signal:'Señal observada',
  observed_variability:'Variabilidad observada',
};

export function GeologiaObservedPatterns({patterns}:{patterns:Pattern[]}){
  if(!patterns.length) return null;
  return <section className="rounded-lg border bg-card p-5">
    <div className="flex items-start justify-between gap-4 border-b pb-4">
      <div><p className="font-medium">Patrones observados</p><p className="mt-1 text-sm text-muted-foreground">Relaciones determinísticas dentro del mismo sondaje. Son preguntas de revisión, no conclusiones geológicas.</p></div>
      <SearchCheck className="h-5 w-5 text-muted-foreground"/>
    </div>
    <div className="divide-y">
      {patterns.map((pattern,index)=><article key={`${pattern.pattern_type}-${index}`} className="py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium">{pattern.pattern_label}</p><p className="mt-1 text-xs text-muted-foreground">{strengthLabel[pattern.evidence_strength]||pattern.evidence_strength}{pattern.evidence_value!=null?` · ${Number(pattern.evidence_value).toLocaleString('es-CL',{maximumFractionDigits:2})} ${pattern.evidence_unit||''}`:''}</p></div>{pattern.pattern_type==='mineral_structure_overlap'?<GitCompareArrows className="h-4 w-4 text-muted-foreground"/>:<AlertTriangle className="h-4 w-4 text-muted-foreground"/>}</div>
        <p className="mt-3 text-sm">{pattern.evidence_summary}</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2"><div className="border-l-2 pl-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pregunta</p><p className="mt-1 text-sm">{pattern.review_question}</p></div><div className="border-l-2 pl-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Para validar</p><p className="mt-1 text-sm">{pattern.required_validation}</p></div></div>
        <p className="mt-3 text-xs text-muted-foreground">{pattern.guardrail}{pattern.source_rows?.length?` · Filas fuente: ${pattern.source_rows.join(', ')}`:''}</p>
      </article>)}
    </div>
  </section>;
}
