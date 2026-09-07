'use client';

import { AlertTriangle, ArrowRight, Beaker, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GeologiaImmediateTaskQueue } from '@/components/production/geologia-immediate-task-queue';

type PendingRow = {
  drill_hole_id:string;
  hole_code:string;
  resolution_state:string|null;
  review_priority:number|null;
  recommended_action:string|null;
  proposed_mine_name:string|null;
  proposed_sector_name:string|null;
  operational_bucket?:string|null;
  operational_priority?:number|null;
  last_report_date?:string|null;
};

type DrillingRow = {
  id:string;
  operation_date:string|null;
  hole_code_raw:string|null;
  mine_raw:string|null;
  sector_raw:string|null;
  drilled_meters:number|null;
  reconciliation_status:string|null;
  canonical_mine_source_id:string|null;
  canonical_mine_sector_id:string|null;
  canonical_drill_hole_id:string|null;
};

type Mine = { id:string; code:string|null; name:string };

type Props = {
  unlocatedCount:number;
  noPurposeCount:number;
  samplesReview:number;
  pending:PendingRow[];
  recentDrilling:DrillingRow[];
  mines:Mine[];
  canWrite:boolean;
  selectedMines:Record<string,string>;
  savingId:string|null;
  onSelectMine:(reportId:string,mineId:string)=>void;
  onAssignMine:(reportId:string)=>void;
};

function priorityLabel(value:number|null){
  const p=value??0;
  if(p>=80)return 'Crítica';
  if(p>=50)return 'Alta';
  if(p>0)return 'Media';
  return 'Sin prioridad';
}

function dateValue(value:string|null){
  if(!value)return 0;
  const time=new Date(value).getTime();
  return Number.isNaN(time)?0:time;
}

function formatDate(value:string|null){
  if(!value)return 'Sin fecha';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString('es-CL');
}

function isResolved(value:string|null){
  return ['resolved','verified','matched'].includes(String(value||'').toLowerCase());
}

function bucketLabel(value:string|null|undefined){
  if(value==='critico')return 'Crítico';
  if(value==='activo_agosto')return 'Activo agosto';
  if(value==='reciente_julio')return 'Reciente julio';
  if(value==='historico')return 'Histórico';
  return 'Operacional';
}

function Metric({label,value,detail}:{label:string;value:number;detail:string}){
  return <section className="rounded-lg border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></section>;
}

export function GeologiaPendingDecisionQueue(props:Props){
  const unresolved=props.pending.filter((row)=>!isResolved(row.resolution_state));
  const activePending=unresolved
    .filter((row)=>String(row.operational_bucket||'').toLowerCase()!=='historico')
    .sort((a,b)=>(a.operational_priority??999)-(b.operational_priority??999)||(b.review_priority||0)-(a.review_priority||0)||a.hole_code.localeCompare(b.hole_code,'es',{numeric:true}));
  const historicalPending=unresolved.filter((row)=>String(row.operational_bucket||'').toLowerCase()==='historico');
  const criticalCount=activePending.filter((row)=>row.operational_bucket==='critico').length;
  const augustCount=activePending.filter((row)=>row.operational_bucket==='activo_agosto').length;
  const julyCount=activePending.filter((row)=>row.operational_bucket==='reciente_julio').length;
  const unresolvedDrilling=[...props.recentDrilling]
    .filter((r)=>!r.canonical_mine_source_id||!r.canonical_mine_sector_id||!r.canonical_drill_hole_id)
    .sort((a,b)=>dateValue(b.operation_date)-dateValue(a.operation_date)||String(a.hole_code_raw||'').localeCompare(String(b.hole_code_raw||''),'es',{numeric:true}));

  return <div className="space-y-5">
    <GeologiaImmediateTaskQueue />

    <section className="rounded-lg border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Otras revisiones humanas</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Conflictos, reconciliaciones y validaciones abiertas</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Esta segunda cola contiene sólo excepciones explícitas y vigentes. La ausencia general de una fuente no se convierte automáticamente en cientos de tareas.</p>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <Metric label="Revisiones de ubicación operacionales" value={activePending.length} detail={`${criticalCount} críticas · ${augustCount} agosto · ${julyCount} julio`}/>
        <Metric label="Reportes por reconciliar" value={unresolvedDrilling.length} detail="Evidencia reciente con vínculo canónico incompleto"/>
        <Metric label="Muestras por revisar" value={props.samplesReview} detail="Validación de calidad abierta"/>
      </div>
      {historicalPending.length>0?<div className="mt-4 border-t pt-4 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Backlog histórico separado:</span> {historicalPending.length.toLocaleString('es-CL')} reconciliaciones antiguas se conservan para recuperación de evidencia, pero quedan fuera de la cola operacional diaria.</div>:null}
      {(props.unlocatedCount>0||props.noPurposeCount>0)?<div className="mt-4 border-t pt-4 text-xs leading-5 text-muted-foreground">
        <span className="font-medium text-foreground">Cobertura documental, no cola de tareas:</span> {props.unlocatedCount.toLocaleString('es-CL')} sondajes sin collar completo y {props.noPurposeCount.toLocaleString('es-CL')} sin propósito geológico documentado en la fuente actual. Se mantienen como límites de cobertura hasta que aparezca evidencia original suficiente.
      </div>:null}
    </section>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border bg-card p-4"><div className="flex items-start gap-3"><MapPinned className="mt-0.5 h-4 w-4 text-muted-foreground"/><div><p className="font-medium">Ubicación · sólo casos revisables</p><p className="mt-1 text-sm text-muted-foreground">Se priorizan conflictos o propuestas con evidencia trazable y vigencia operacional; el histórico permanece separado.</p></div></div></div>
      <div className="rounded-lg border bg-card p-4"><div className="flex items-start gap-3"><Beaker className="mt-0.5 h-4 w-4 text-muted-foreground"/><div><p className="font-medium">Validación</p><p className="mt-1 text-sm text-muted-foreground">Una muestra abierta a revisión no debe alimentar conclusiones cerradas ni recomendaciones de ley.</p></div></div></div>
    </div>

    {activePending.length?<section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3"><p className="font-medium">Decisiones priorizadas</p><p className="mt-1 text-sm text-muted-foreground">Primero urgencia operacional y luego prioridad de revisión; no se completa información por inferencia.</p></div>
      <div className="divide-y">{activePending.slice(0,100).map((row)=>{const priority=priorityLabel(row.review_priority);return <div key={row.drill_hole_id} className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(150px,.7fr)_minmax(0,1.5fr)_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{row.hole_code}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{bucketLabel(row.operational_bucket)}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{priority}</span></div><p className="mt-1 text-xs text-muted-foreground">{row.resolution_state||'Pendiente'} · P{row.review_priority??'—'}{row.last_report_date?` · ${formatDate(row.last_report_date)}`:''}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Acción recomendada</p><p className="mt-1 text-sm">{row.recommended_action||'Revisar evidencia y confirmar ubicación.'}</p><p className="mt-2 text-xs text-muted-foreground">Impacto: la evidencia queda ambigua hasta cerrar su ubicación canónica.</p><p className="mt-1 text-xs text-muted-foreground">Propuesta: {row.proposed_mine_name||'sin mina'}{row.proposed_sector_name?` · ${row.proposed_sector_name}`:''}</p></div><ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block"/></div>})}</div>
    </section>:<div className="rounded-lg border border-dashed bg-muted/10 px-5 py-8 text-center"><p className="font-medium">Sin revisiones operacionales activas</p><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">No hay casos vigentes que deban competir por atención geológica diaria. El histórico permanece registrado para recuperación de evidencia.</p></div>}

    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground"/><div><p className="font-medium">Evidencia de perforación por reconciliar</p><p className="mt-1 text-sm text-muted-foreground">Más reciente primero. Asignar mina sólo con evidencia suficiente; sector y pozo no se infieren.</p></div></div></div>
      {unresolvedDrilling.length?<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Pozo</th><th className="px-4 py-3">Mina / sector fuente</th><th className="px-4 py-3 text-right">Metros</th><th className="px-4 py-3">Qué falta</th>{props.canWrite?<th className="px-4 py-3">Acción</th>:null}</tr></thead><tbody className="divide-y">{unresolvedDrilling.slice(0,100).map((r)=><tr key={r.id}><td className="whitespace-nowrap px-4 py-3">{formatDate(r.operation_date)}</td><td className="px-4 py-3 font-medium">{r.hole_code_raw||'—'}</td><td className="px-4 py-3"><p>{r.mine_raw&&r.mine_raw!=='#ERROR!'?r.mine_raw:'Sin mina en fuente'}</p><p className="text-xs text-muted-foreground">{r.sector_raw||'Sin sector fuente'}</p></td><td className="px-4 py-3 text-right tabular-nums">{Number(r.drilled_meters||0).toLocaleString('es-CL',{maximumFractionDigits:1})}</td><td className="px-4 py-3 text-xs text-muted-foreground">{r.canonical_mine_source_id?'Mina ✓':'Mina'} · {r.canonical_mine_sector_id?'Sector ✓':'Sector'} · {r.canonical_drill_hole_id?'Pozo ✓':'Pozo'}</td>{props.canWrite?<td className="min-w-[300px] px-4 py-3"><div className="flex items-center gap-2"><Select value={props.selectedMines[r.id]||''} onValueChange={(value)=>props.onSelectMine(r.id,value)}><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar mina"/></SelectTrigger><SelectContent>{props.mines.map((m)=><SelectItem key={m.id} value={m.id}>{m.name}{m.code?` · ${m.code}`:''}</SelectItem>)}</SelectContent></Select><Button size="sm" disabled={!props.selectedMines[r.id]||props.savingId===r.id} onClick={()=>props.onAssignMine(r.id)}>{props.savingId===r.id?'Guardando…':'Asignar'}</Button></div></td>:null}</tr>)}</tbody></table></div>:<div className="px-5 py-8 text-center text-sm text-muted-foreground">No hay evidencia reciente pendiente de reconciliación.</div>}
    </section>
  </div>;
}