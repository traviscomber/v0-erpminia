'use client';

import { useMemo, useState } from 'react';

type Signal = {
  drill_hole_id:string;
  hole_code:string;
  mine_name:string|null;
  sector_name:string|null;
  drilled_depth_m:number|null;
  interpretation_state:string;
  structured_intervals:number;
  point_observations:number;
  transition_points:number;
  visual_mineral_m:number;
  explicit_no_mineral_m:number;
  structure_m:number;
  lithology_m:number;
  rock_condition_m:number;
};

const n=(value:number|null|undefined)=>Number(value||0).toLocaleString('es-CL',{maximumFractionDigits:1});

export function GeologiaInterpretationComparator({ rows }:{ rows:Signal[] }) {
  const defaultIds = rows.filter((row) => row.interpretation_state === 'structured_evidence').slice(0,3).map((row) => row.drill_hole_id);
  const [ids,setIds] = useState<string[]>(defaultIds);
  const selected = useMemo(() => ids.map((id) => rows.find((row) => row.drill_hole_id === id)).filter(Boolean) as Signal[], [ids,rows]);

  const setSlot=(index:number,id:string)=>setIds((current)=>{
    const next=[...current];
    if(!id){next.splice(index,1);return next.slice(0,5);}
    next[index]=id;
    return Array.from(new Set(next)).slice(0,5);
  });

  return <details className="rounded-lg border bg-card">
    <summary className="cursor-pointer px-5 py-4"><span className="font-medium">Comparar sondajes</span><span className="ml-2 text-sm text-muted-foreground">2–5 lecturas lado a lado, sin inferir correlación espacial.</span></summary>
    <div className="border-t p-5">
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({length:Math.max(2,Math.min(5,ids.length+1))},(_,index)=><select key={index} value={ids[index]||''} onChange={(event)=>setSlot(index,event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="">Seleccionar sondaje</option>
          {rows.map((row)=><option key={row.drill_hole_id} value={row.drill_hole_id}>{row.hole_code}{row.mine_name?` · ${row.mine_name}`:''}</option>)}
        </select>)}
      </div>

      {selected.length<2?<p className="mt-4 text-sm text-muted-foreground">Selecciona al menos dos sondajes para comparar señales compatibles.</p>:<div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-3 pr-4">Señal</th>{selected.map((row)=><th key={row.drill_hole_id} className="px-3 py-3"><span className="text-sm font-medium text-foreground">{row.hole_code}</span><br/>{[row.mine_name,row.sector_name].filter(Boolean).join(' · ')||'Ubicación incompleta'}</th>)}</tr></thead>
          <tbody className="divide-y">
            <CompareRow label="Estado" values={selected.map((row)=>row.interpretation_state.replaceAll('_',' '))}/>
            <CompareRow label="Profundidad" values={selected.map((row)=>row.drilled_depth_m==null?'—':`${n(row.drilled_depth_m)} m`)}/>
            <CompareRow label="Intervalos operacionales estructurados" values={selected.map((row)=>String(row.structured_intervals||0))}/>
            <CompareRow label="Mineralización visual" values={selected.map((row)=>`${n(row.visual_mineral_m)} m`)}/>
            <CompareRow label="Ausencia explícita" values={selected.map((row)=>`${n(row.explicit_no_mineral_m)} m`)}/>
            <CompareRow label="Estructuras" values={selected.map((row)=>`${n(row.structure_m)} m`)}/>
            <CompareRow label="Litología observada" values={selected.map((row)=>`${n(row.lithology_m)} m`)}/>
            <CompareRow label="Condición de roca" values={selected.map((row)=>`${n(row.rock_condition_m)} m`)}/>
            <CompareRow label="Puntos / transiciones" values={selected.map((row)=>`${row.point_observations||0} / ${row.transition_points||0}`)}/>
          </tbody>
        </table>
        <p className="mt-4 text-xs text-muted-foreground">Los intervalos comparados son evidencia operacional estructurada, no logging geológico formal. Comparar magnitudes ayuda a priorizar revisión, pero no normaliza por longitud perforada ni demuestra continuidad entre sondajes; cualquier comparación espacial requiere geometría canónica suficiente.</p>
      </div>}
    </div>
  </details>;
}

function CompareRow({label,values}:{label:string;values:string[]}){
  return <tr><td className="py-3 pr-4 text-muted-foreground">{label}</td>{values.map((value,index)=><td key={`${label}-${index}`} className="px-3 py-3 font-medium tabular-nums">{value}</td>)}</tr>;
}
