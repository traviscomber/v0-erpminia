'use client';

import { Drill, MapPinned, Navigation, Target, TestTube2 } from 'lucide-react';
import { buildMineEvidenceReadiness } from '@/lib/geology/evidence-readiness';

type Mine = { id:string; code:string|null; name:string; status:string|null; };
type Hole = { id:string; mine_source_id:string|null; collar_easting:number|null; collar_northing:number|null; azimuth_deg:number|null; dip_deg:number|null; geological_purpose?:string|null; };
type Sample = { id:string; mine_source_id:string|null; drill_hole_id:string|null; };
type Props = { mines:Mine[]; holes:Hole[]; samples:Sample[]; };

const gapLabel={collar:'collar',orientation:'orientación',purpose:'propósito',none:'sin límite estructural'} as const;

export function GeologiaMineEvidenceOverview({mines,holes,samples}:Props){
  const rows=[...buildMineEvidenceReadiness(mines,holes,samples)].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  if(!rows.length)return null;

  return <section className="overflow-hidden rounded-lg border bg-card">
    <div className="border-b px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Cobertura canónica por mina</p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight">Qué evidencia existe por mina</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Lectura descriptiva de la fuente canónica disponible. La cobertura baja identifica límites de interpretación; no crea una obligación de completar datos que la fuente actual casi no contiene.</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Mina</th><th className="px-4 py-3 text-right">Sondajes</th><th className="px-4 py-3 text-right">Collar</th><th className="px-4 py-3 text-right">Orientación</th><th className="px-4 py-3 text-right">Propósito</th><th className="px-4 py-3 text-right">Química histórica</th><th className="px-4 py-3 text-right">Cobertura estructural</th></tr></thead>
        <tbody className="divide-y">{rows.map((row)=><tr key={row.id}>
          <td className="px-4 py-3"><div className="flex items-center gap-2"><Drill className="h-4 w-4 text-muted-foreground"/><div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.code||row.status||'Mina canónica'} · límite principal: {gapLabel[row.primaryGap]}</p></div></div></td>
          <td className="px-4 py-3 text-right tabular-nums">{row.holes}</td>
          <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-end gap-1 tabular-nums"><MapPinned className="h-3.5 w-3.5 text-muted-foreground"/>{row.located}/{row.holes}</span></td>
          <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-end gap-1 tabular-nums"><Navigation className="h-3.5 w-3.5 text-muted-foreground"/>{row.oriented}/{row.holes}</span></td>
          <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-end gap-1 tabular-nums"><Target className="h-3.5 w-3.5 text-muted-foreground"/>{row.purpose}/{row.holes}</span></td>
          <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-end gap-1 tabular-nums"><TestTube2 className="h-3.5 w-3.5 text-muted-foreground"/>{row.linkedSamples}</span></td>
          <td className="px-4 py-3 text-right"><span className="font-medium tabular-nums">{row.readiness}%</span></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="border-t px-5 py-3 text-xs text-muted-foreground">Cobertura estructural = promedio simple de collar, orientación y propósito geológico. Es diagnóstico de disponibilidad de evidencia, no ranking de minas ni lista de datos por pedir. La química histórica se muestra aparte y no se interpreta como ensayo de sondaje sin vínculo explícito.</div>
  </section>;
}
