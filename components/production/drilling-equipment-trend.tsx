'use client';

import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, Gauge, Wrench } from 'lucide-react';
import { StatePanel } from '@/components/ui/state-panel';

type Row={
  canonicalAssetId:string;assetCode:string;assetName:string;lastDate:string;lastStatus:string|null;lastObservation:string|null;
  recentAvgMeters:number;priorAvgMeters:number;deltaPct:number|null;activityDecline:boolean;
  classification:'decline_with_maintenance_evidence'|'decline_without_cause'|'maintenance_signal_without_activity_decline'|'stable';
  openWorkOrders:Array<{id:string;number:string|null;status:string|null;priority:string|null;flowStatus:string|null}>;
  pendingMaintenanceReviews:Array<{operation_date:string;review_reason:string;equipment_status_raw:string|null;machine_observations:string|null;has_linked_work_order:boolean}>;
};
type Payload={policy:string;rows:Row[]};
const fetcher=async(url:string)=>{const r=await fetch(url,{credentials:'include'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Error');return j;};
const n=(v:number|null,d=1)=>v===null?'—':v.toLocaleString('es-CL',{maximumFractionDigits:d});

export function DrillingEquipmentTrend(){
  const {data,error,isLoading}=useSWR<Payload>('/api/produccion/equipos-tendencia',fetcher,{revalidateOnFocus:false});
  if(error)return <StatePanel tone="error" title="No fue posible cargar tendencia por equipo" description={error.message}/>;
  if(isLoading||!data)return <StatePanel tone="neutral" title="Analizando equipos de Sondaje" description="Cruzando actividad, estado y Mantención por activo canónico."/>;
  const relevant=data.rows.filter(r=>r.classification!=='stable');
  return <section className="space-y-3">
    <div><h2 className="text-lg font-semibold">Equipos de Sondaje · señal operacional</h2><p className="text-sm text-muted-foreground">Actividad reciente y evidencia de Mantención vinculadas por activo canónico. Correlación no implica causalidad.</p></div>
    {relevant.length===0?<div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-4"><CheckCircle2 className="h-5 w-5 text-muted-foreground"/><div><p className="text-sm font-medium">Sin deterioros relevantes por equipo</p><p className="text-xs text-muted-foreground">No hay caídas ≥30% ni señales de Mantención pendientes en los equipos con serie suficiente.</p></div></div>:<div className="overflow-hidden rounded-lg border bg-card"><div className="divide-y">{relevant.map(row=><EquipmentRow key={row.canonicalAssetId} row={row}/>)}</div></div>}
    <p className="text-xs leading-5 text-muted-foreground"><strong className="font-medium text-foreground">Regla:</strong> {data.policy}</p>
  </section>;
}

function EquipmentRow({row}:{row:Row}){
  const withMaintenance=row.classification==='decline_with_maintenance_evidence';
  const declineOnly=row.classification==='decline_without_cause';
  const signalOnly=row.classification==='maintenance_signal_without_activity_decline';
  const Icon=withMaintenance||declineOnly?AlertTriangle:signalOnly?Wrench:Gauge;
  const label=withMaintenance?'Caída + evidencia Mantención':declineOnly?'Caída sin causa acreditada':signalOnly?'Señal Mantención':'Estable';
  const action=withMaintenance
    ? row.openWorkOrders.length>0?'Revisar la OT vinculada y validar si explica la pérdida de actividad.':'Crear o vincular una OT si la observación requiere intervención; no atribuir causalidad hasta validarla.'
    : declineOnly?'Revisar continuidad operacional, dotación, frente y programación antes de atribuir la caída a una falla.':'Revisar la observación de Mantención aunque la actividad reciente no esté cayendo.';
  const evidence=[
    `${n(row.recentAvgMeters,1)} m/día recientes vs ${n(row.priorAvgMeters,1)} m/día previos${row.deltaPct===null?'':` (${n(row.deltaPct,1)}%)`}.`,
    row.lastStatus?`Último estado: ${row.lastStatus}.`:null,
    row.lastObservation?`Observación: ${row.lastObservation}`:null,
    row.openWorkOrders.length?`${row.openWorkOrders.length} OT abierta(s).`:null,
    row.pendingMaintenanceReviews.length?`${row.pendingMaintenanceReviews.length} revisión(es) de Mantención pendientes.`:null,
  ].filter(Boolean).join(' ');
  return <div className="grid gap-3 px-4 py-4 lg:grid-cols-[220px_1fr_1fr]">
    <div className="flex gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="text-sm font-medium">{row.assetName}</p><p className="mt-1 text-xs text-muted-foreground">{row.assetCode}</p><p className="mt-1 text-xs font-medium">{label}</p></div></div>
    <p className="text-sm text-muted-foreground">{evidence}</p>
    <p className="text-sm"><span className="font-medium">Acción: </span>{action}</p>
  </div>;
}
