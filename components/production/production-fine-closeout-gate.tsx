'use client';

import useSWR from 'swr';
import { AlertTriangle } from 'lucide-react';

type Data = {
  concentrate:null|{shifts:number;quantifiedShifts:number;unquantifiedShifts:number;producedWetTons:number|null;allocatedWetTons:number;state:string;note:string};
  dispatch:null|{shipments:number;dispatchedWetTons:number|null;state:string;note:string};
  closeout?:{state:string;missing:string[];policy:string};
};

const fetcher=async(url:string):Promise<Data>=>{const r=await fetch(url,{credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar cierre de Producción fino');return d};
const tons=(v:number|null|undefined)=>v==null?'—':`${v.toLocaleString('es-CL',{maximumFractionDigits:2})} t`;

export function ProductionFineCloseoutGate(){
  const {data,error}=useSWR('/api/produccion/fino/cierre',fetcher);
  if(error) return <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">No fue posible verificar el cierre concentrado/despacho: {error.message}</div>;
  if(!data?.concentrate||!data.dispatch) return null;
  const ready=data.closeout?.state==='reconcilable';
  return <section className="rounded-lg border bg-card">
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3"><h2 className="font-medium">Cierre de Producción fino</h2><span className="text-xs text-muted-foreground">{ready?'Reconciliable':'Pendiente de fuente'}</span></div>
    <div className="grid gap-px bg-border md:grid-cols-3">
      <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Concentrado producido</p><p className="mt-2 text-xl font-semibold">{tons(data.concentrate.producedWetTons)}</p><p className="mt-1 text-xs text-muted-foreground">{data.concentrate.quantifiedShifts}/{data.concentrate.shifts} turnos cuantificados</p></div>
      <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Despachos observados</p><p className="mt-2 text-xl font-semibold">{data.dispatch.shipments}</p><p className="mt-1 text-xs text-muted-foreground">{tons(data.dispatch.dispatchedWetTons)} despachadas</p></div>
      <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">Estado de cierre</p><div className="mt-2 flex items-center gap-2">{!ready?<AlertTriangle className="h-5 w-5"/>:null}<p className="text-xl font-semibold">{ready?'Listo':'Bloqueado'}</p></div><p className="mt-1 text-xs text-muted-foreground">{ready?'Existe evidencia para reconciliar':'Falta evidencia de concentrado/despacho'}</p></div>
    </div>
    {!ready?<div className="border-t px-4 py-3 text-sm"><p className="font-medium">No se fuerza el cierre metalúrgico</p><p className="mt-1 text-muted-foreground">El fino recuperado ya es calculable, pero la fuente actual no cuantifica toneladas húmedas de concentrado por turno y no registra despachos del período. Estos faltantes permanecen visibles en lugar de convertirse en cero.</p></div>:null}
  </section>;
}
