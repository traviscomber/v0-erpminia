'use client';

import useSWR from 'swr';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Escalation = {
  cargo_name:string|null;
  task_key:string|null;
  domain:string|null;
  severity:string|null;
  priority_score:number|null;
  title:string|null;
  evidence_summary:string|null;
  responsibility:string|null;
  recommended_action:string|null;
  due_at:string|null;
  escalation_at:string|null;
  age_hours:number|null;
  urgency_state:string|null;
};

type Response = {
  summary:{
    total:number;
    critical:number;
    escalated:number;
    topCargo:{name:string;count:number}|null;
    topDomain:{name:string;count:number}|null;
  };
  escalations:Escalation[];
  generatedAt:string;
};

const fetcher=async(url:string)=>{
  const response=await fetch(url,{credentials:'include',cache:'no-store'});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error||'No se pudo cargar el seguimiento ejecutivo');
  return payload;
};

function fmtDate(value:string|null){
  if(!value)return 'Sin fecha';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return 'Sin fecha';
  return date.toLocaleString('es-CL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}

function fmtAge(hours:number|null){
  if(hours==null)return 'Sin antigüedad';
  if(hours<24)return `${hours} h`;
  return `${Math.floor(hours/24)} d ${hours%24} h`;
}

export function ExecutiveEscalationsPanel(){
  const {data,error,isLoading}=useSWR<Response>('/api/dashboard/executive-escalations',fetcher,{revalidateOnFocus:false});
  if(error)return <Card className="border-dashed"><CardContent className="p-4 text-sm text-muted-foreground">No se pudo cargar el seguimiento de SLA. Las decisiones ejecutivas siguen disponibles arriba.</CardContent></Card>;
  const rows=data?.escalations||[];
  const summary=data?.summary;
  return <Card className="shadow-none">
    <CardHeader className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Escalaciones vencidas / responsables</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Seguimiento por SLA existente. No crea nuevas tareas: muestra las que ya requieren escalamiento.</p>
        </div>
        <Badge variant={summary?.escalated?'destructive':'outline'}>{isLoading?'Cargando':`${summary?.escalated||0} escaladas`}</Badge>
      </div>
      {!isLoading&&summary?<div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="Total" value={String(summary.total)} detail="En seguimiento"/>
        <Mini label="Críticas" value={String(summary.critical)} detail="Severidad crítica"/>
        <Mini label="Mayor presión" value={summary.topCargo?.name||'—'} detail={summary.topCargo?`${summary.topCargo.count} tarea(s)`:'Sin datos'}/>
        <Mini label="Dominio" value={summary.topDomain?.name||'—'} detail={summary.topDomain?`${summary.topDomain.count} tarea(s)`:'Sin datos'}/>
      </div>:null}
    </CardHeader>
    <CardContent className="p-0">
      {isLoading?<div className="space-y-2 border-t p-5">{Array.from({length:3}).map((_,i)=><div key={i} className="h-24 animate-pulse rounded-lg bg-muted"/>)}</div>:rows.length===0?<div className="border-t p-8 text-center text-sm text-muted-foreground">Sin escalaciones activas.</div>:<div className="divide-y border-t">{rows.slice(0,6).map((row,index)=><div key={`${row.task_key||row.title||'task'}-${index}`} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px_220px] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2"><Badge variant={row.severity==='critical'?'destructive':'outline'}>{row.severity==='critical'?'Crítica':'Escalada'}</Badge><Badge variant="secondary">{row.domain||'Sin dominio'}</Badge></div>
          <p className="mt-2 font-medium">{row.title||'Tarea operacional escalada'}</p>
          {row.evidence_summary?<p className="mt-1 text-sm text-muted-foreground">{row.evidence_summary}</p>:null}
          {row.recommended_action?<p className="mt-2 text-sm"><span className="font-medium">Acción:</span> {row.recommended_action}</p>:null}
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">Responsable</p>
          <p className="mt-1 font-medium">{row.cargo_name||row.responsibility||'Sin responsable'}</p>
          <p className="mt-3 text-xs text-muted-foreground">Antigüedad</p>
          <p className="mt-1 font-medium">{fmtAge(row.age_hours)}</p>
        </div>
        <div className="text-sm">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5"/>Fecha límite</p>
          <p className="mt-1 font-medium">{fmtDate(row.due_at)}</p>
          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5"/>Escaló</p>
          <p className="mt-1 font-medium">{fmtDate(row.escalation_at)}</p>
        </div>
      </div>)}</div>}
      {!isLoading&&rows.length>6?<div className="border-t bg-muted/20 px-5 py-4 text-sm text-muted-foreground">Se muestran las 6 escalaciones de mayor prioridad de {rows.length}. El resto permanece en la bandeja operacional por cargo.</div>:null}
    </CardContent>
  </Card>;
}

function Mini({label,value,detail}:{label:string;value:string;detail:string}){return <div className="min-w-0 bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate font-semibold" title={value}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;}
