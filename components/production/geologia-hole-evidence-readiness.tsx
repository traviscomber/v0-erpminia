'use client';

import { Beaker, Compass, Layers3, MapPinned, Target } from 'lucide-react';

type Hole = {
  hole_code:string;
  collar_easting:number|null;
  collar_northing:number|null;
  azimuth_deg:number|null;
  dip_deg:number|null;
  geological_purpose:string|null;
};

type Props = {
  hole:Hole;
  intervalCount:number;
  sampleCount:number;
};

type EvidenceItem = {
  label:string;
  detail:string;
  icon:typeof MapPinned;
};

export function GeologiaHoleEvidenceReadiness({hole,intervalCount,sampleCount}:Props){
  const available:EvidenceItem[]=[];
  const sourceLimits:string[]=[];

  if(hole.collar_easting!=null&&hole.collar_northing!=null){
    available.push({label:'Collar',detail:'Coordenadas canónicas disponibles',icon:MapPinned});
  }else{
    sourceLimits.push('collar georreferenciado');
  }

  if(hole.azimuth_deg!=null&&hole.dip_deg!=null){
    available.push({label:'Orientación',detail:`Azimut ${hole.azimuth_deg}° · inclinación ${hole.dip_deg}°`,icon:Compass});
  }else{
    sourceLimits.push('orientación completa');
  }

  if(hole.geological_purpose?.trim()){
    available.push({label:'Propósito geológico',detail:hole.geological_purpose.trim(),icon:Target});
  }else{
    sourceLimits.push('propósito geológico documentado');
  }

  if(intervalCount>0){
    available.push({label:'Intervalos operacionales',detail:`${intervalCount} tramo(s) estructurado(s) desde reportes fuente`,icon:Layers3});
  }else{
    sourceLimits.push('intervalos operacionales estructurados');
  }

  if(sampleCount>0){
    available.push({label:'Química vinculada',detail:`${sampleCount} registro(s) ligados explícitamente al sondaje`,icon:Beaker});
  }else{
    sourceLimits.push('química con linaje muestra → sondaje → intervalo');
  }

  return <section className="rounded-lg border bg-card p-5" aria-label={`Evidencia disponible ${hole.hole_code}`}>
    <div>
      <p className="text-xs text-muted-foreground">Evidencia disponible</p>
      <p className="mt-1 text-sm font-medium">Sólo se muestran capas realmente acreditadas para este sondaje.</p>
    </div>

    {available.length?<div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {available.map((item)=>{const Icon=item.icon;return <div key={item.label} className="flex items-start gap-3 rounded-md border px-3 py-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground"/><div><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p></div></div>})}
    </div>:<div className="mt-4 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">La fuente actual no aporta capas técnicas adicionales para este sondaje. Esto no se convierte en una tarea automática ni en un score de calidad.</div>}

    {sourceLimits.length?<div className="mt-4 border-t pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Límites de la fuente actual</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">No están incorporados: {sourceLimits.join(', ')}. La ausencia se mantiene como límite documental; no se interpreta como defecto del sondaje ni como trabajo pendiente.</p>
      <p className="mt-2 text-xs text-muted-foreground">Los intervalos operacionales no equivalen a logging geológico formal. No se infieren RQD, recuperación, alteración, contactos, continuidad, ley ni control estructural.</p>
    </div>:null}
  </section>;
}
