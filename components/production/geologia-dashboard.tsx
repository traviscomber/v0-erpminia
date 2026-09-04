'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Beaker,
  CheckCircle2,
  Drill,
  FileSearch,
  Layers3,
  MapPinned,
  Mountain,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { periodUrl, useDashboardPeriod } from '@/components/dashboard/dashboard-period-provider';

type Hole = {
  id:string; hole_code:string; drilling_domain:string|null; mine_source_id:string|null; mine_sector_id:string|null;
  collar_easting:number|null; collar_northing:number|null; collar_elevation:number|null; coordinate_reference:string|null;
  azimuth_deg:number|null; dip_deg:number|null; planned_depth_m:number|null; drilled_depth_m:number|null; diameter_mm:number|null;
  start_at:string|null; completed_at:string|null; status:string|null; geological_purpose:string|null; operational_purpose:string|null;
  source_type:string|null; source_reference:string|null;
};

type Interval = {
  id:string; drill_hole_id:string; from_m:number; to_m:number; recovery_pct:number|null; rqd_pct:number|null;
  lithology:string|null; alteration:string|null; mineralization:string|null; sample_code:string|null;
  assay_reference:string|null; operational_result:string|null; notes:string|null;
};

type Sample = {
  id:string; sample_code:string; sample_type:string|null; sample_date:string|null; mine_source_id:string|null; mine_sector_id:string|null;
  drill_hole_id:string|null; depth_from_m:number|null; depth_to_m:number|null; source_file:string|null; source_sheet:string|null;
  validation_status:string|null; validation_notes:string|null;
};

type ExternalContext = {
  id:string; source_provider:string|null; source_dataset:string|null; source_record_key:string|null; record_type:string|null;
  mine_source_id:string|null; mine_sector_id:string|null; title:string|null; status:string|null; valid_from:string|null; valid_to:string|null;
  geometry_geojson:unknown; source_url:string|null; retrieved_at:string|null; validation_status:string|null; validation_notes:string|null;
};

type GeologyData = {
  canWrite:boolean;
  summary:{
    mines:number; sectors:number; drillingReports:number; drilledMeters:number; mineLinkCoveragePct:number; sectorLinkCoveragePct:number; holeLinkCoveragePct:number;
    holes:number; canonicalDrilledMeters:number; locatedHoles:number; orientedHoles:number; purposeHoles:number; intervals:number; samples:number;
    samplesValidated:number; samplesReview:number; externalContext:number; sernageominRecords:number; unresolvedLocations:number;
  };
  mines:Array<{ id:string; code:string|null; name:string; status:string|null; sectors:number; drillingReports:number; drilledMeters:number }>;
  holes:Hole[];
  intervals:Interval[];
  samples:Sample[];
  externalContext:ExternalContext[];
  locationReview:Array<{ drill_hole_id:string; hole_code:string; resolution_state:string|null; review_priority:number|null; recommended_action:string|null; proposed_mine_name:string|null; proposed_sector_name:string|null }>;
  recentDrilling:Array<{ id:string; operation_date:string|null; hole_code_raw:string|null; mine_raw:string|null; sector_raw:string|null; drilled_meters:number|null; reconciliation_status:string|null; canonical_mine_source_id:string|null; canonical_mine_sector_id:string|null; canonical_drill_hole_id:string|null }>;
  contextQuality:{ external_records:number; sernageomin_records:number; mine_linked_records:number; sector_linked_records:number; georeferenced_records:number; valid_records:number; review_records:number };
  intelligenceStatus:{ geologicalSamplesCanonical:boolean; assaysCanonical:boolean; drillHolesCanonical:boolean; sernageominContextAvailable:boolean; note:string };
};

const fetcher=async(url:string):Promise<GeologyData>=>{
  const response=await fetch(url,{credentials:'include'});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'No fue posible cargar Geología');
  return data;
};

function pct(value:number){return `${value.toLocaleString('es-CL',{maximumFractionDigits:1})}%`;}
function meters(value:number){return `${value.toLocaleString('es-CL',{maximumFractionDigits:0})} m`;}

const tabs=[
  ['today','Hoy'],
  ['holes','Mapa y sondajes'],
  ['results','Resultados'],
  ['pending','Pendientes'],
  ['context','Contexto'],
] as const;
type TabKey=typeof tabs[number][0];

function Empty({title,description}:{title:string;description:string}){
  return <div className="rounded-lg border border-dashed bg-muted/10 px-5 py-8 text-center"><p className="font-medium">{title}</p><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{description}</p></div>;
}

function Metric({label,value,detail}:{label:string;value:string|number;detail:string}){
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

export function GeologiaDashboard(){
  const {month}=useDashboardPeriod();
  const {data,error,isLoading,mutate}=useSWR(periodUrl('/api/produccion/geologia',month),fetcher);
  const [tab,setTab]=useState<TabKey>('today');
  const [selectedHoleId,setSelectedHoleId]=useState('');
  const [holeSearch,setHoleSearch]=useState('');
  const [selectedMines,setSelectedMines]=useState<Record<string,string>>({});
  const [savingId,setSavingId]=useState<string|null>(null);
  const [drillingSort,setDrillingSort]=useState<{key:'operation_date'|'hole_code_raw'|'mine_raw'|'drilled_meters';direction:1|-1}>({key:'operation_date',direction:-1});
  const s=data?.summary;

  const filteredHoles=useMemo(()=>{
    const query=holeSearch.trim().toLowerCase();
    return (data?.holes||[]).filter((hole)=>!query||[hole.hole_code,hole.drilling_domain,hole.status,hole.geological_purpose,hole.operational_purpose].some((v)=>String(v||'').toLowerCase().includes(query)));
  },[data?.holes,holeSearch]);
  const selectedHole=useMemo(()=>data?.holes.find((hole)=>hole.id===selectedHoleId)||filteredHoles[0]||null,[data?.holes,filteredHoles,selectedHoleId]);
  const selectedIntervals=useMemo(()=>selectedHole?(data?.intervals||[]).filter((row)=>row.drill_hole_id===selectedHole.id):[],[data?.intervals,selectedHole]);
  const selectedSamples=useMemo(()=>selectedHole?(data?.samples||[]).filter((row)=>row.drill_hole_id===selectedHole.id):[],[data?.samples,selectedHole]);
  const locatedHoles=useMemo(()=>(data?.holes||[]).filter((h)=>h.collar_easting!=null&&h.collar_northing!=null),[data?.holes]);
  const bounds=useMemo(()=>{
    if(!locatedHoles.length)return null;
    const xs=locatedHoles.map((h)=>Number(h.collar_easting));
    const ys=locatedHoles.map((h)=>Number(h.collar_northing));
    return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  },[locatedHoles]);
  const sortedDrilling=useMemo(()=>[...(data?.recentDrilling||[])].sort((a,b)=>String(a[drillingSort.key]??'').localeCompare(String(b[drillingSort.key]??''),'es',{numeric:true})*drillingSort.direction),[data?.recentDrilling,drillingSort]);
  const drillingHeading=(label:string,key:typeof drillingSort.key)=><button onClick={()=>setDrillingSort((current)=>({key,direction:current.key===key&&current.direction===1?-1:1}))} className="inline-flex items-center gap-1">{label}<ArrowUpDown className="h-3 w-3"/></button>;

  async function assignMine(reportId:string){
    const mineId=selectedMines[reportId];
    if(!mineId)return;
    setSavingId(reportId);
    try{
      const response=await fetch('/api/produccion/geologia',{method:'PATCH',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({reportId,mineId})});
      const result=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(result?.error||'No fue posible asignar la mina');
      toast.success(`Registro reconciliado con ${result.mine.name}`);
      setSelectedMines((current)=>{const next={...current};delete next[reportId];return next;});
      await mutate();
    }catch(reason){toast.error(reason instanceof Error?reason.message:'No fue posible asignar la mina');}
    finally{setSavingId(null);}
  }

  const topPending=(data?.locationReview||[]).filter((row)=>!['resolved','verified','matched'].includes(String(row.resolution_state||'').toLowerCase()));
  const unlocated=(data?.holes||[]).filter((h)=>h.collar_easting==null||h.collar_northing==null);
  const noPurpose=(data?.holes||[]).filter((h)=>!h.geological_purpose?.trim());

  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Producción · La Patagua</PageHeaderEyebrow><PageHeaderTitle>Geología</PageHeaderTitle><PageHeaderDescription>Vista operativa para responder cuatro preguntas: dónde están los sondajes, qué sabemos de cada uno, qué resultados existen y qué falta resolver.</PageHeaderDescription></PageHeaderContent></PageHeader>

    {error?<StatePanel tone="error" title="No fue posible cargar Geología" description="Reintenta la consulta." actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/>:null}

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen geológico">
      {[
        {label:'Sondajes',value:s?.holes??'—',detail:s?meters(s.canonicalDrilledMeters):'—',icon:Drill},
        {label:'Ubicados',value:s?`${s.locatedHoles}/${s.holes}`:'—',detail:s?pct(s.holes?s.locatedHoles/s.holes*100:0):'—',icon:MapPinned},
        {label:'Muestras',value:s?.samples??'—',detail:s?`${s.samplesReview} requieren revisión`:'—',icon:Beaker},
        {label:'Pendientes',value:s?.unresolvedLocations??'—',detail:'Ubicación / reconciliación',icon:AlertTriangle},
      ].map((m)=>{const Icon=m.icon;return <div key={m.label} className="bg-card px-5 py-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{m.label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading?'—':m.value}</p><p className="mt-1 text-xs text-muted-foreground">{m.detail}</p></div>})}
    </section>

    <nav className="flex flex-wrap gap-2 border-b pb-3" aria-label="Vistas de Geología">{tabs.map(([key,label])=><Button key={key} size="sm" variant={tab===key?'default':'ghost'} onClick={()=>setTab(key)}>{label}</Button>)}</nav>

    {data&&tab==='today'?<div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <button type="button" onClick={()=>setTab('holes')} className="rounded-lg border bg-card p-5 text-left transition-colors hover:bg-muted/20"><div className="flex items-start justify-between"><MapPinned className="h-5 w-5 text-muted-foreground"/><ArrowRight className="h-4 w-4 text-muted-foreground"/></div><p className="mt-5 font-medium">¿Dónde están los sondajes?</p><p className="mt-1 text-sm text-muted-foreground">{s?.locatedHoles||0} de {s?.holes||0} tienen collar georreferenciado.</p></button>
        <button type="button" onClick={()=>setTab('results')} className="rounded-lg border bg-card p-5 text-left transition-colors hover:bg-muted/20"><div className="flex items-start justify-between"><Beaker className="h-5 w-5 text-muted-foreground"/><ArrowRight className="h-4 w-4 text-muted-foreground"/></div><p className="mt-5 font-medium">¿Qué encontramos?</p><p className="mt-1 text-sm text-muted-foreground">{s?.samples||0} muestras y {s?.intervals||0} intervalos de logging disponibles.</p></button>
        <button type="button" onClick={()=>setTab('pending')} className="rounded-lg border bg-card p-5 text-left transition-colors hover:bg-muted/20"><div className="flex items-start justify-between"><AlertTriangle className="h-5 w-5 text-muted-foreground"/><ArrowRight className="h-4 w-4 text-muted-foreground"/></div><p className="mt-5 font-medium">¿Qué falta resolver?</p><p className="mt-1 text-sm text-muted-foreground">{s?.unresolvedLocations||0} ubicaciones pendientes · {s?.samplesReview||0} muestras por revisar.</p></button>
      </div>

      <section className="rounded-lg border bg-card p-5"><div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Estado de la información</p></div><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Collar georreferenciado" value={`${s?.locatedHoles||0}/${s?.holes||0}`} detail="Ubicación utilizable"/><Metric label="Orientación completa" value={`${s?.orientedHoles||0}/${s?.holes||0}`} detail="Azimut + inclinación"/><Metric label="Propósito geológico" value={`${s?.purposeHoles||0}/${s?.holes||0}`} detail="Objetivo documentado"/><Metric label="Muestras validadas" value={`${s?.samplesValidated||0}/${s?.samples||0}`} detail="Calidad disponible"/></div></section>

      {s?.intervals===0?<div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/><div><p className="font-medium">Falta logging geológico</p><p className="mt-1 text-muted-foreground">Existen sondajes canónicos, pero aún no hay intervalos cargados de litología, alteración o mineralización. Motil no los infiere ni los inventa.</p></div></div>:null}
    </div>:null}

    {data&&tab==='holes'?<div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Mapa de sondajes</p><p className="mt-1 text-sm text-muted-foreground">Vista relativa de collares canónicos. No reemplaza cartografía oficial.</p></div>{bounds?<div className="relative h-[360px] bg-muted/20">{locatedHoles.slice(0,400).map((hole)=>{const width=Math.max(bounds.maxX-bounds.minX,1);const height=Math.max(bounds.maxY-bounds.minY,1);const left=((Number(hole.collar_easting)-bounds.minX)/width)*92+4;const top=(1-(Number(hole.collar_northing)-bounds.minY)/height)*88+6;return <button key={hole.id} title={hole.hole_code} onClick={()=>setSelectedHoleId(hole.id)} className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background ${selectedHole?.id===hole.id?'bg-primary ring-4 ring-primary/20':'bg-foreground/55'}`} style={{left:`${left}%`,top:`${top}%`}}/>})}<div className="absolute bottom-3 left-3 rounded-md border bg-background/90 px-3 py-2 text-xs text-muted-foreground">{locatedHoles.length} collares visibles</div></div>:<Empty title="Sin collares georreferenciados" description="Cuando existan coordenadas canónicas, los sondajes aparecerán aquí."/>}</section>

        <section className="overflow-hidden rounded-lg border bg-card"><div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Sondajes</p><p className="mt-1 text-sm text-muted-foreground">Selecciona un pozo para revisar su ficha, logging y muestras.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><input value={holeSearch} onChange={(event)=>setHoleSearch(event.target.value)} placeholder="Buscar sondaje" className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"/></div></div><div className="max-h-[420px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted/60 text-left text-xs text-muted-foreground backdrop-blur"><tr><th className="px-4 py-3">Pozo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Profundidad</th><th className="px-4 py-3">Ubicación</th></tr></thead><tbody className="divide-y">{filteredHoles.map((hole)=><tr key={hole.id} onClick={()=>setSelectedHoleId(hole.id)} className={`cursor-pointer hover:bg-muted/20 ${selectedHole?.id===hole.id?'bg-muted/30':''}`}><td className="px-4 py-3 font-medium">{hole.hole_code}</td><td className="px-4 py-3">{hole.status||'—'}</td><td className="px-4 py-3 text-right tabular-nums">{hole.drilled_depth_m!=null?meters(Number(hole.drilled_depth_m)):'—'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{hole.collar_easting!=null&&hole.collar_northing!=null?'Ubicado':'Pendiente'}</td></tr>)}</tbody></table></div></section>
      </div>

      <aside className="space-y-5">{selectedHole?<><section className="rounded-lg border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-muted-foreground">Ficha del sondaje</p><h2 className="mt-1 text-xl font-semibold">{selectedHole.hole_code}</h2></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{selectedHole.status||'Sin estado'}</span></div><div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-sm"><Metric label="Profundidad" value={selectedHole.drilled_depth_m!=null?meters(Number(selectedHole.drilled_depth_m)):'—'} detail={selectedHole.planned_depth_m!=null?`Plan ${meters(Number(selectedHole.planned_depth_m))}`:'Sin plan'}/><Metric label="Orientación" value={selectedHole.azimuth_deg!=null?`${selectedHole.azimuth_deg}°`:'—'} detail={selectedHole.dip_deg!=null?`Dip ${selectedHole.dip_deg}°`:'Sin inclinación'}/><Metric label="Collar" value={selectedHole.collar_elevation!=null?`${selectedHole.collar_elevation} m`:'—'} detail={selectedHole.coordinate_reference||'CRS no informado'}/><Metric label="Diámetro" value={selectedHole.diameter_mm!=null?`${selectedHole.diameter_mm} mm`:'—'} detail={selectedHole.drilling_domain||'Sin dominio'}/></div><div className="mt-5 border-t pt-4"><p className="text-xs text-muted-foreground">Propósito geológico</p><p className="mt-1 text-sm">{selectedHole.geological_purpose||'No documentado'}</p></div></section>

        <section className="rounded-lg border bg-card p-5"><div className="flex items-center justify-between"><div><p className="font-medium">Logging</p><p className="mt-1 text-sm text-muted-foreground">Intervalos del sondaje seleccionado.</p></div><Layers3 className="h-4 w-4 text-muted-foreground"/></div>{selectedIntervals.length?<div className="mt-4 space-y-2">{selectedIntervals.map((row)=><div key={row.id} className="rounded-md border px-3 py-3 text-sm"><div className="flex items-center justify-between gap-3"><p className="font-medium">{row.from_m}–{row.to_m} m</p><span className="text-xs text-muted-foreground">RQD {row.rqd_pct!=null?`${row.rqd_pct}%`:'—'}</span></div><p className="mt-2 text-xs text-muted-foreground">Litología</p><p>{row.lithology||'—'}</p><div className="mt-2 grid grid-cols-2 gap-3 text-xs"><div><span className="text-muted-foreground">Alteración · </span>{row.alteration||'—'}</div><div><span className="text-muted-foreground">Mineralización · </span>{row.mineralization||'—'}</div></div></div>)}</div>:<div className="mt-4"><Empty title="Sin logging cargado" description="No existen intervalos geológicos canónicos para este sondaje."/></div>}</section>

        <section className="rounded-lg border bg-card p-5"><p className="font-medium">Muestras vinculadas</p><p className="mt-1 text-sm text-muted-foreground">{selectedSamples.length} muestras asociadas al pozo.</p>{selectedSamples.length?<div className="mt-4 space-y-2">{selectedSamples.slice(0,8).map((sample)=><div key={sample.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><div><p className="font-medium">{sample.sample_code}</p><p className="text-xs text-muted-foreground">{sample.depth_from_m??'—'}–{sample.depth_to_m??'—'} m</p></div><span className="text-xs text-muted-foreground">{sample.validation_status||'Sin validar'}</span></div>)}</div>:null}</section></>:<Empty title="Sin sondajes" description="No hay sondajes canónicos disponibles para mostrar."/>}</aside>
    </div>:null}

    {data&&tab==='results'?<div className="space-y-5">
      <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3"><div className="bg-card p-5"><Metric label="Muestras" value={s?.samples||0} detail="Registros canónicos"/></div><div className="bg-card p-5"><Metric label="Validadas" value={s?.samplesValidated||0} detail="Disponibles para uso"/></div><div className="bg-card p-5"><Metric label="Por revisar" value={s?.samplesReview||0} detail="Requieren atención"/></div></section>
      {(data.samples||[]).length?<section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Muestras y resultados disponibles</p><p className="mt-1 text-sm text-muted-foreground">Trazabilidad hacia sondaje, profundidad y archivo fuente.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Muestra</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Sondaje</th><th className="px-4 py-3">Intervalo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Fuente</th></tr></thead><tbody className="divide-y">{data.samples.map((sample)=>{const hole=data.holes.find((row)=>row.id===sample.drill_hole_id);return <tr key={sample.id}><td className="px-4 py-3 font-medium">{sample.sample_code}</td><td className="px-4 py-3">{sample.sample_date||'—'}</td><td className="px-4 py-3">{hole?.hole_code||'Sin vínculo'}</td><td className="px-4 py-3">{sample.depth_from_m??'—'}–{sample.depth_to_m??'—'} m</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground"/>{sample.validation_status||'Sin validar'}</span></td><td className="px-4 py-3 text-xs text-muted-foreground">{sample.source_file||'—'}</td></tr>})}</tbody></table></div></section>:<Empty title="Sin muestras cargadas" description="Los resultados aparecerán aquí cuando exista evidencia química canónica vinculada a la operación."/>}
    </div>:null}

    {data&&tab==='pending'?<div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3"><section className="rounded-lg border bg-card p-5"><Metric label="Ubicación pendiente" value={unlocated.length} detail="Sondajes sin collar completo"/></section><section className="rounded-lg border bg-card p-5"><Metric label="Sin propósito" value={noPurpose.length} detail="Objetivo geológico no documentado"/></section><section className="rounded-lg border bg-card p-5"><Metric label="Muestras por revisar" value={s?.samplesReview||0} detail="Calidad / validación"/></section></div>
      {topPending.length?<section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Cola de resolución</p><p className="mt-1 text-sm text-muted-foreground">Problemas que requieren decisión humana antes de consolidar la ubicación canónica.</p></div><div className="divide-y">{topPending.slice(0,100).map((row)=><div key={row.drill_hole_id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p className="font-medium">{row.hole_code}</p><p className="mt-1 text-xs text-muted-foreground">{row.resolution_state||'Pendiente'}</p></div><div><p className="text-sm">{row.recommended_action||'Revisar evidencia y confirmar ubicación'}</p><p className="mt-1 text-xs text-muted-foreground">{row.proposed_mine_name||'Sin mina propuesta'}{row.proposed_sector_name?` · ${row.proposed_sector_name}`:''}</p></div><span className="text-xs text-muted-foreground">P{row.review_priority??'—'}</span></div>)}</div></section>:<Empty title="Sin ubicaciones pendientes" description="No hay elementos en la cola de revisión de ubicación."/>}

      <section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Evidencia de sondaje pendiente de reconciliación</p><p className="mt-1 text-sm text-muted-foreground">Asignar una mina sólo cuando la evidencia lo justifique. Sector y pozo no se infieren.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">{drillingHeading('Fecha','operation_date')}</th><th className="px-4 py-3">{drillingHeading('Pozo','hole_code_raw')}</th><th className="px-4 py-3">{drillingHeading('Mina / sector fuente','mine_raw')}</th><th className="px-4 py-3 text-right">{drillingHeading('Metros','drilled_meters')}</th><th className="px-4 py-3">Estado</th>{data.canWrite?<th className="px-4 py-3">Asignar mina</th>:null}</tr></thead><tbody className="divide-y">{sortedDrilling.filter((r)=>!r.canonical_mine_source_id||!r.canonical_mine_sector_id||!r.canonical_drill_hole_id).slice(0,100).map((r)=><tr key={r.id}><td className="px-4 py-3 whitespace-nowrap">{r.operation_date||'—'}</td><td className="px-4 py-3 font-medium">{r.hole_code_raw||'—'}</td><td className="px-4 py-3"><p>{r.mine_raw&&r.mine_raw !== '#ERROR!'?r.mine_raw:'Sin mina en fuente'}</p><p className="text-xs text-muted-foreground">{r.sector_raw||'Sin sector fuente'}</p></td><td className="px-4 py-3 text-right tabular-nums">{Number(r.drilled_meters||0).toLocaleString('es-CL',{maximumFractionDigits:1})}</td><td className="px-4 py-3 text-xs text-muted-foreground">{r.canonical_mine_source_id?'Mina ✓':'Mina pendiente'} · {r.canonical_mine_sector_id?'Sector ✓':'Sector pendiente'} · {r.canonical_drill_hole_id?'Pozo ✓':'Pozo pendiente'}</td>{data.canWrite?<td className="min-w-[280px] px-4 py-3"><div className="flex items-center gap-2"><Select value={selectedMines[r.id]||''} onValueChange={(value)=>setSelectedMines((current)=>({...current,[r.id]:value}))}><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar mina"/></SelectTrigger><SelectContent>{data.mines.map((m)=><SelectItem key={m.id} value={m.id}>{m.name}{m.code?` · ${m.code}`:''}</SelectItem>)}</SelectContent></Select><Button size="sm" disabled={!selectedMines[r.id]||savingId===r.id} onClick={()=>void assignMine(r.id)}>{savingId===r.id?'Guardando…':'Asignar'}</Button></div></td>:null}</tr>)}</tbody></table></div></section>
    </div>:null}

    {data&&tab==='context'?<div className="space-y-5">
      <div className="rounded-lg border bg-card p-5"><div className="flex items-start gap-3"><Mountain className="mt-0.5 h-5 w-5 text-muted-foreground"/><div><p className="font-medium">Contexto SERNAGEOMIN</p><p className="mt-1 text-sm text-muted-foreground">Se usa como antecedente externo para contrastar la información interna de La Patagua. No modifica automáticamente minas, sectores, sondajes ni interpretación canónica.</p></div></div></div>
      {data.externalContext.length?<section className="overflow-hidden rounded-lg border bg-card"><div className="divide-y">{data.externalContext.map((row)=><div key={row.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_1fr_auto]"><div><p className="font-medium">{row.title||row.source_record_key||'Registro geológico externo'}</p><p className="mt-1 text-xs text-muted-foreground">{row.source_provider||'Fuente externa'} · {row.source_dataset||'Dataset no informado'}</p></div><div className="text-sm"><p>{row.record_type||'Sin tipo'}</p><p className="mt-1 text-xs text-muted-foreground">{row.validation_status||'Sin validar'} · recuperado {row.retrieved_at?new Date(row.retrieved_at).toLocaleDateString('es-CL'):'—'}</p></div><div className="text-xs text-muted-foreground">{row.geometry_geojson?'Georreferenciado':'Sin geometría'}</div></div>)}</div></section>:<Empty title="SERNAGEOMIN aún no cargado" description="La estructura está preparada, pero esta organización todavía no tiene contexto oficial incorporado. Esto no impide operar con los datos internos disponibles."/>}
    </div>:null}
  </div>;
}
