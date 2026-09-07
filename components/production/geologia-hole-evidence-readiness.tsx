'use client';

import { Beaker, Compass, Layers3, MapPinned, Target } from 'lucide-react';

type Hole = {
  hole_code:string;
  status:string|null;
  drilling_domain:string|null;
  drilled_depth_m:number|null;
  planned_depth_m:number|null;
  diameter_mm:number|null;
  collar_easting:number|null;
  collar_northing:number|null;
  collar_elevation:number|null;
  coordinate_reference:string|null;
  azimuth_deg:number|null;
  dip_deg:number|null;
  geological_purpose:string|null;
  source_type:string|null;
  source_reference:string|null;
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

type FactItem = {
  label:string;
  value:string;
};

function meters(value:number){
  return `${value.toLocaleString('es-CL',{maximumFractionDigits:1})} m`;
}

export function GeologiaHoleEvidenceReadiness({hole,intervalCount,sampleCount}:Props){
  const facts:FactItem[]=[];
  const available:EvidenceItem[]=[];
  const sourceLimits:string[]=[];

  if(hole.drilled_depth_m!=null) facts.push({label:'Profundidad perforada',value:meters(Number(hole.drilled_depth_m))});
  if(hole.planned_depth_m!=null) facts.push({label:'Profundidad planificada',value:meters(Number(hole.planned_depth_m))});
  if(hole.drilling_domain?.trim()) facts.push({label:'Dominio de perforación',value:hole.drilling_domain.trim()});
  if(hole.diameter_mm!=null) facts.push({label:'Diámetro',value:`${Number(hole.diameter_mm).toLocaleString('es-CL',{maximumFractionDigits:1})} mm`});
  if(hole.source_type?.trim()||hole.source_reference?.trim()) facts.push({label:'Procedencia',value:[hole.source_type?.trim(),hole.source_reference?.trim()].filter(Boolean).join(' · ')});

  if(hole.collar_easting!=null&&hole.collar_northing!=null){
    const parts=[`E ${Number(hole.collar_easting).toLocaleString('es-CL')}`,`N ${Number(hole.collar_northing).toLocaleString('es-CL')}`];
    if(hole.collar_elevation!=null) parts.push(`cota ${Number(hole.collar_elevation).toLocaleString('es-CL')} m`);
    if(hole.coordinate_reference?.trim()) parts.push(hole.coordinate_reference.trim());
    available.push({label:'Collar',detail:parts.join(' · '),icon:MapPinned});
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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">Expediente geológico del sondaje canónico</p>
        <h2 className="mt-1 text-xl font-semibold">{hole.hole_code}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Primero se muestran hechos presentes en la fuente; las ausencias quedan separadas como límites documentales.</p>
      </div>
      {hole.status?.trim()?<span className="rounded-full bg-muted px-2.5 py-1 text-xs">{hole.status.trim()}</span>:null}
    </div>

    {facts.length?<div className="mt-5 grid gap-x-5 gap-y-4 border-t pt-4 sm:grid-cols-2">
      {facts.map((fact)=><div key={fact.label}><p className="text-xs text-muted-foreground">{fact.label}</p><p className="mt-1 text-sm font-medium">{fact.value}</p></div>)}
    </div>:null}

    <div className="mt-5 border-t pt-4">
      <p className="text-xs text-muted-foreground">Evidencia técnica acreditada</p>
      {available.length?<div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {available.map((item)=>{const Icon=item.icon;return <div key={item.label} className="flex items-start gap-3 rounded-md border px-3 py-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground"/><div><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p></div></div>})}
      </div>:<div className="mt-3 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">La fuente actual no aporta capas técnicas adicionales para este sondaje. Esto no se convierte en una tarea automática ni en un score de calidad.</div>}
    </div>

    {sourceLimits.length?<div className="mt-4 border-t pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Límites de la fuente actual</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">No están incorporados: {sourceLimits.join(', ')}. La ausencia se mantiene como límite documental; no se interpreta como defecto del sondaje ni como trabajo pendiente.</p>
      <p className="mt-2 text-xs text-muted-foreground">Los intervalos operacionales no equivalen a logging geológico formal. No se infieren RQD, recuperación, alteración, contactos, continuidad, ley ni control estructural.</p>
    </div>:null}
  </section>;
}
