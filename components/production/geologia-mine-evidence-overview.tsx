'use client';

import { Drill, MapPinned, Navigation, TestTube2 } from 'lucide-react';

type Mine = {
  id:string;
  code:string|null;
  name:string;
  status:string|null;
};

type Hole = {
  id:string;
  mine_source_id:string|null;
  collar_easting:number|null;
  collar_northing:number|null;
  azimuth_deg:number|null;
  dip_deg:number|null;
};

type Sample = {
  id:string;
  mine_source_id:string|null;
  drill_hole_id:string|null;
};

type Props = {
  mines:Mine[];
  holes:Hole[];
  samples:Sample[];
};

function pct(done:number,total:number){
  return total>0?Math.round((done/total)*100):0;
}

function readiness(located:number,oriented:number,total:number){
  if(total===0)return 0;
  return Math.round((pct(located,total)+pct(oriented,total))/2);
}

export function GeologiaMineEvidenceOverview({mines,holes,samples}:Props){
  const rows=mines.map((mine)=>{
    const mineHoles=holes.filter((hole)=>hole.mine_source_id===mine.id);
    const holeIds=new Set(mineHoles.map((hole)=>hole.id));
    const located=mineHoles.filter((hole)=>hole.collar_easting!=null&&hole.collar_northing!=null).length;
    const oriented=mineHoles.filter((hole)=>hole.azimuth_deg!=null&&hole.dip_deg!=null).length;
    const linkedSamples=samples.filter((sample)=>sample.mine_source_id===mine.id||(sample.drill_hole_id?holeIds.has(sample.drill_hole_id):false)).length;
    return {
      ...mine,
      holes:mineHoles.length,
      located,
      oriented,
      linkedSamples,
      readiness:readiness(located,oriented,mineHoles.length),
    };
  }).filter((row)=>row.holes>0||row.linkedSamples>0)
    .sort((a,b)=>a.readiness-b.readiness||b.holes-a.holes||a.name.localeCompare(b.name,'es'));

  if(!rows.length)return null;

  return <section className="overflow-hidden rounded-lg border bg-card">
    <div className="border-b px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Cobertura por mina</p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight">Dónde cerrar evidencia primero</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Lectura determinística desde datos canónicos de La Patagua. La menor cobertura aparece primero; no representa una clasificación de recursos ni una interpretación de ley.</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Mina</th>
            <th className="px-4 py-3 text-right">Sondajes</th>
            <th className="px-4 py-3 text-right">Collar</th>
            <th className="px-4 py-3 text-right">Orientación</th>
            <th className="px-4 py-3 text-right">Muestras</th>
            <th className="px-4 py-3 text-right">Preparación</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row)=><tr key={row.id}>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><Drill className="h-4 w-4 text-muted-foreground"/><div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.code||row.status||'Mina canónica'}</p></div></div></td>
            <td className="px-4 py-3 text-right tabular-nums">{row.holes}</td>
            <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-end gap-1 tabular-nums"><MapPinned className="h-3.5 w-3.5 text-muted-foreground"/>{row.located}/{row.holes}</span></td>
            <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-end gap-1 tabular-nums"><Navigation className="h-3.5 w-3.5 text-muted-foreground"/>{row.oriented}/{row.holes}</span></td>
            <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-end gap-1 tabular-nums"><TestTube2 className="h-3.5 w-3.5 text-muted-foreground"/>{row.linkedSamples}</span></td>
            <td className="px-4 py-3 text-right"><span className={`font-medium tabular-nums ${row.readiness<60?'text-amber-700 dark:text-amber-400':row.readiness===100?'text-emerald-700 dark:text-emerald-400':''}`}>{row.readiness}%</span></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="border-t px-5 py-3 text-xs text-muted-foreground">Preparación = promedio simple de cobertura de collar y orientación. Las muestras se muestran aparte para no mezclar dimensiones distintas de evidencia.</div>
  </section>;
}
