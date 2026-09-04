'use client';

import { AlertTriangle, Beaker, CheckCircle2, Compass, Layers3, MapPinned, Target } from 'lucide-react';

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

type Check = {
  label:string;
  ready:boolean;
  detail:string;
  action:string;
  icon:typeof MapPinned;
};

export function GeologiaHoleEvidenceReadiness({hole,intervalCount,sampleCount}:Props){
  const checks:Check[]=[
    {
      label:'Collar',
      ready:hole.collar_easting!=null&&hole.collar_northing!=null,
      detail:hole.collar_easting!=null&&hole.collar_northing!=null?'Coordenadas disponibles':'Coordenadas incompletas',
      action:'Reconciliar coordenadas del collar antes de análisis espacial.',
      icon:MapPinned,
    },
    {
      label:'Orientación',
      ready:hole.azimuth_deg!=null&&hole.dip_deg!=null,
      detail:hole.azimuth_deg!=null&&hole.dip_deg!=null?'Azimut + inclinación disponibles':'Azimut o inclinación faltante',
      action:'Completar orientación antes de interpretar trayectoria.',
      icon:Compass,
    },
    {
      label:'Propósito',
      ready:Boolean(hole.geological_purpose?.trim()),
      detail:hole.geological_purpose?.trim()?'Objetivo documentado':'Objetivo no documentado',
      action:'Documentar el objetivo geológico del sondaje.',
      icon:Target,
    },
    {
      label:'Logging',
      ready:intervalCount>0,
      detail:intervalCount>0?`${intervalCount} intervalos canónicos`:'Sin intervalos canónicos',
      action:'Cargar o reconciliar logging antes de interpretar litología, alteración o mineralización.',
      icon:Layers3,
    },
    {
      label:'Muestras',
      ready:sampleCount>0,
      detail:sampleCount>0?`${sampleCount} muestras vinculadas`:'Sin muestras vinculadas',
      action:'Revisar trazabilidad de muestras hacia este sondaje.',
      icon:Beaker,
    },
  ];

  const readyCount=checks.filter((item)=>item.ready).length;
  const readiness=Math.round((readyCount/checks.length)*100);
  const next=checks.find((item)=>!item.ready);
  const tone=readiness===100?'text-emerald-700 dark:text-emerald-400':readiness>=60?'text-foreground':'text-amber-700 dark:text-amber-400';

  return <section className="rounded-lg border bg-card p-5" aria-label={`Preparación de evidencia ${hole.hole_code}`}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs text-muted-foreground">Preparación de evidencia</p>
        <p className={`mt-1 text-2xl font-semibold tracking-tight ${tone}`}>{readiness}%</p>
        <p className="mt-1 text-xs text-muted-foreground">{readyCount}/{checks.length} capas mínimas disponibles</p>
      </div>
      {readiness===100?<CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400"/>:<AlertTriangle className="h-5 w-5 text-muted-foreground"/>}
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {checks.map((item)=>{const Icon=item.icon;return <div key={item.label} className="flex items-start gap-3 rounded-md border px-3 py-3"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${item.ready?'text-emerald-700 dark:text-emerald-400':'text-muted-foreground'}`}/><div><div className="flex items-center gap-2"><p className="text-sm font-medium">{item.label}</p><span className="text-[11px] text-muted-foreground">{item.ready?'Disponible':'Pendiente'}</span></div><p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p></div></div>})}
    </div>

    <div className="mt-4 border-t pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Siguiente acción de datos</p>
      <p className="mt-1 text-sm">{next?next.action:'Las cinco capas mínimas están disponibles. La interpretación sigue limitada por la calidad y contenido real de cada registro.'}</p>
      <p className="mt-2 text-xs text-muted-foreground">Este porcentaje mide completitud de evidencia mínima, no certeza geológica ni calidad de mineralización.</p>
    </div>
  </section>;
}
