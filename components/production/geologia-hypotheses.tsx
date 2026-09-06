'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, CircleDot, LockKeyhole, SearchCheck, XCircle } from 'lucide-react';

type Pattern = {
  pattern_type:string;
  pattern_label:string;
  evidence_summary:string;
  review_question:string;
  required_validation:string;
  guardrail:string;
  source_rows?:number[]|null;
};

type Hypothesis = {
  id:string;
  drill_hole_id:string;
  hole_code:string;
  origin_pattern_type:string|null;
  title:string;
  hypothesis_text:string;
  canonical_observation:string;
  required_validation:string;
  guardrail:string;
  source_rows:number[];
  evidence_for:string[];
  evidence_against:string[];
  missing_evidence:string[];
  state:'detected'|'in_review'|'supported'|'rejected'|'closed';
  assigned_to:string|null;
  reviewer_comment:string|null;
  reviewed_by_name:string|null;
  reviewed_at:string|null;
  updated_at:string;
};

const stateLabel:Record<Hypothesis['state'],string>={
  detected:'Detectada',
  in_review:'En revisión',
  supported:'Soportada',
  rejected:'Rechazada',
  closed:'Cerrada',
};

const nextActions:Record<Hypothesis['state'],Array<{state:Hypothesis['state'];label:string}>>={
  detected:[{state:'in_review',label:'Iniciar revisión'}],
  in_review:[{state:'supported',label:'Marcar soportada'},{state:'rejected',label:'Rechazar'}],
  supported:[{state:'closed',label:'Cerrar revisión'}],
  rejected:[{state:'closed',label:'Cerrar revisión'}],
  closed:[],
};

const lines=(value:string)=>value.split('\n').map(x=>x.trim()).filter(Boolean);
const text=(items:string[]|null|undefined)=>Array.isArray(items)?items.join('\n'):'';

export function GeologiaHypotheses({drillHoleId,patterns,initialHypotheses}:{drillHoleId:string;patterns:Pattern[];initialHypotheses:Hypothesis[]}){
  const [rows,setRows]=useState<Hypothesis[]>(initialHypotheses||[]);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const existingTypes=useMemo(()=>new Set(rows.map(row=>row.origin_pattern_type).filter(Boolean)),[rows]);
  const pendingPatterns=patterns.filter(pattern=>!existingTypes.has(pattern.pattern_type));

  async function create(pattern:Pattern){
    setBusy(`create:${pattern.pattern_type}`); setError(null);
    try{
      const response=await fetch('/api/produccion/geologia/hypotheses',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({drillHoleId,patternType:pattern.pattern_type})});
      const data=await response.json(); if(!response.ok) throw new Error(data.error||'No fue posible crear la hipótesis');
      setRows(current=>current.some(row=>row.id===data.row.id)?current:[data.row,...current]);
    }catch(e:any){setError(e?.message||'No fue posible crear la hipótesis');}finally{setBusy(null);}
  }

  async function update(row:Hypothesis,patch:Record<string,unknown>){
    setBusy(row.id); setError(null);
    try{
      const response=await fetch('/api/produccion/geologia/hypotheses',{method:'PATCH',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({id:row.id,...patch})});
      const data=await response.json(); if(!response.ok) throw new Error(data.error||'No fue posible actualizar la hipótesis');
      setRows(current=>current.map(item=>item.id===row.id?data.row:item));
    }catch(e:any){setError(e?.message||'No fue posible actualizar la hipótesis');}finally{setBusy(null);}
  }

  if(!patterns.length&&!rows.length) return null;
  return <section className="rounded-lg border bg-card p-5">
    <div className="flex items-start justify-between gap-4 border-b pb-4">
      <div><p className="font-medium">Hipótesis geológicas revisables</p><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Objetos de trabajo derivados de patrones observados. Incluso una hipótesis soportada sigue siendo una conclusión de revisión y no modifica logging, ensayes, survey, contactos ni dominios canónicos.</p></div>
      <SearchCheck className="h-5 w-5 text-muted-foreground"/>
    </div>

    {error?<p className="mt-4 rounded-md border px-3 py-2 text-sm">{error}</p>:null}

    {pendingPatterns.length?<div className="mt-4 space-y-3"><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Patrones disponibles para abrir revisión</p>{pendingPatterns.map(pattern=><div key={pattern.pattern_type} className="flex flex-col gap-3 border-b pb-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium">{pattern.pattern_label}</p><p className="mt-1 text-sm text-muted-foreground">{pattern.review_question}</p></div><button disabled={busy!=null} onClick={()=>create(pattern)} className="shrink-0 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50">{busy===`create:${pattern.pattern_type}`?'Creando…':'Abrir hipótesis'}</button></div>)}</div>:null}

    {rows.length?<div className="mt-5 divide-y">{rows.map(row=><HypothesisCard key={row.id} row={row} busy={busy===row.id} onUpdate={patch=>update(row,patch)}/>)}</div>:<p className="mt-4 text-sm text-muted-foreground">Aún no hay hipótesis abiertas para este sondaje.</p>}
  </section>;
}

function HypothesisCard({row,busy,onUpdate}:{row:Hypothesis;busy:boolean;onUpdate:(patch:Record<string,unknown>)=>void}){
  const [comment,setComment]=useState(row.reviewer_comment||'');
  const [forText,setForText]=useState(text(row.evidence_for));
  const [againstText,setAgainstText]=useState(text(row.evidence_against));
  const [missingText,setMissingText]=useState(text(row.missing_evidence));
  const [assignedTo,setAssignedTo]=useState(row.assigned_to||'');
  const actions=nextActions[row.state];
  const needsComment=(state:string)=>['supported','rejected','closed'].includes(state);

  const saveEvidence=()=>onUpdate({assignedTo,evidenceFor:lines(forText),evidenceAgainst:lines(againstText),missingEvidence:lines(missingText),reviewerComment:comment});
  const transition=(state:Hypothesis['state'])=>{
    if(needsComment(state)&&!comment.trim()) return;
    onUpdate({state,assignedTo,evidenceFor:lines(forText),evidenceAgainst:lines(againstText),missingEvidence:lines(missingText),reviewerComment:comment});
  };

  const Icon=row.state==='supported'?CheckCircle2:row.state==='rejected'?XCircle:row.state==='closed'?LockKeyhole:CircleDot;
  return <article className="py-5 first:pt-0 last:pb-0">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground"/><p className="text-sm font-medium">{row.title}</p></div><p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{stateLabel[row.state]}</p></div><p className="text-xs text-muted-foreground">{row.source_rows?.length?`Filas fuente: ${row.source_rows.join(', ')}`:'Sin filas fuente explícitas'}</p></div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="border-l-2 pl-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dato canónico</p><p className="mt-1 text-sm">{row.canonical_observation}</p></div><div className="border-l-2 pl-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hipótesis</p><p className="mt-1 text-sm">{row.hypothesis_text}</p></div></div>
    <p className="mt-3 text-xs text-muted-foreground">{row.guardrail}</p>

    {row.state!=='closed'?<div className="mt-4 grid gap-3 lg:grid-cols-3"><EvidenceEditor label="Evidencia a favor" value={forText} onChange={setForText} placeholder="Una evidencia por línea"/><EvidenceEditor label="Evidencia en contra" value={againstText} onChange={setAgainstText} placeholder="Una evidencia por línea"/><EvidenceEditor label="Evidencia faltante" value={missingText} onChange={setMissingText} placeholder={row.required_validation}/></div>:<div className="mt-4 grid gap-3 lg:grid-cols-3"><EvidenceList label="A favor" items={row.evidence_for}/><EvidenceList label="En contra" items={row.evidence_against}/><EvidenceList label="Faltante" items={row.missing_evidence}/></div>}

    <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]"><label className="text-xs font-medium text-muted-foreground">Responsable<input disabled={row.state==='closed'} value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} placeholder="Geólogo responsable" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm font-normal text-foreground outline-none disabled:opacity-60"/></label><label className="text-xs font-medium text-muted-foreground">Comentario del geólogo<textarea disabled={row.state==='closed'} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Obligatorio para soportar, rechazar o cerrar" className="mt-1 min-h-20 w-full rounded-md border bg-background p-3 text-sm font-normal text-foreground outline-none disabled:opacity-60"/></label></div>

    {row.state!=='closed'?<div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={saveEvidence} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">Guardar evidencia</button>{actions.map(action=><button key={action.state} disabled={busy||(needsComment(action.state)&&!comment.trim())} onClick={()=>transition(action.state)} className="rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50">{action.label}</button>)}</div>:null}
    {row.reviewed_by_name?<p className="mt-3 text-xs text-muted-foreground">Última revisión: {row.reviewed_by_name}{row.reviewed_at?` · ${new Date(row.reviewed_at).toLocaleString('es-CL')}`:''}</p>:null}
  </article>;
}

function EvidenceEditor({label,value,onChange,placeholder}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string}){
  return <label className="text-xs font-medium text-muted-foreground">{label}<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="mt-1 min-h-24 w-full rounded-md border bg-background p-3 text-sm font-normal text-foreground outline-none"/></label>;
}
function EvidenceList({label,items}:{label:string;items:string[]}){
  return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><div className="mt-2 space-y-1 text-sm">{items?.length?items.map((item,index)=><p key={`${label}-${index}`}>• {item}</p>):<p className="text-muted-foreground">Sin evidencia registrada.</p>}</div></div>;
}
