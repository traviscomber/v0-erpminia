'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowUpDown,
  Beaker,
  CheckCircle2,
  Drill,
  Layers3,
  MapPinned,
  Mountain,
  Network,
  Search,
  ShieldCheck,
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
  canWrite: boolean;
  summary: {
    mines:number; sectors:number; drillingReports:number; drilledMeters:number; mineLinkCoveragePct:number; sectorLinkCoveragePct:number; holeLinkCoveragePct:number;
    holes:number; canonicalDrilledMeters:number; locatedHoles:number; orientedHoles:number; purposeHoles:number; intervals:number; samples:number;
    samplesValidated:number; samplesReview:number; externalContext:number; sernageominRecords:number; unresolvedLocations:number;
  };
  mines: Array<{ id:string; code:string|null; name:string; status:string|null; sectors:number; drillingReports:number; drilledMeters:number }>;
  holes: Hole[];
  intervals: Interval[];
  samples: Sample[];
  externalContext: ExternalContext[];
  locationReview: Array<{ drill_hole_id:string; hole_code:string; resolution_state:string|null; review_priority:number|null; recommended_action:string|null; proposed_mine_name:string|null; proposed_sector_name:string|null }>;
  recentDrilling: Array<{ id:string; operation_date:string|null; hole_code_raw:string|null; mine_raw:string|null; sector_raw:string|null; drilled_meters:number|null; reconciliation_status:string|null; canonical_mine_source_id:string|null; canonical_mine_sector_id:string|null; canonical_drill_hole_id:string|null }>;
  contextQuality: { external_records:number; sernageomin_records:number; mine_linked_records:number; sector_linked_records:number; georeferenced_records:number; valid_records:number; review_records:number };
  intelligenceStatus: { geologicalSamplesCanonical:boolean; assaysCanonical:boolean; drillHolesCanonical:boolean; sernageominContextAvailable:boolean; note:string };
};

const fetcher = async (url:string):Promise<GeologyData> => {
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible cargar Geología');
  return data;
};

function pct(value:number){return `${value.toLocaleString('es-CL',{maximumFractionDigits:1})}%`;}
function meters(value:number){return `${value.toLocaleString('es-CL',{maximumFractionDigits:0})} m`;}
function compact(value:number){return value.toLocaleString('es-CL',{maximumFractionDigits:0});}

const tabs = [
  ['overview','Resumen'],
  ['map','Mapa'],
  ['holes','Sondajes'],
  ['logging','Logging'],
  ['samples','Muestras & QA/QC'],
  ['context','SERNAGEOMIN'],
] as const;

type TabKey = typeof tabs[number][0];

export function GeologiaDashboard(){
  const {month}=useDashboardPeriod();
  const { data, error, isLoading, mutate } = useSWR(periodUrl('/api/produccion/geologia',month), fetcher);
  const [tab,setTab] = useState<TabKey>('overview');
  const [selectedHoleId,setSelectedHoleId] = useState<string>('');
  const [holeSearch,setHoleSearch] = useState('');
  const [selectedMines,setSelectedMines] = useState<Record<string,string>>({});
  const [savingId,setSavingId] = useState<string|null>(null);
  const [drillingSort,setDrillingSort]=useState<{key:'operation_date'|'hole_code_raw'|'mine_raw'|'drilled_meters';direction:1|-1}>({key:'operation_date',direction:-1});
  const s = data?.summary;

  const filteredHoles = useMemo(() => {
    const query = holeSearch.trim().toLowerCase();
    return (data?.holes || []).filter((hole) => !query || [hole.hole_code,hole.drilling_domain,hole.status,hole.geological_purpose,hole.operational_purpose].some((v)=>String(v||'').toLowerCase().includes(query)));
  }, [data?.holes, holeSearch]);

  const selectedHole = useMemo(() => data?.holes.find((hole)=>hole.id===selectedHoleId) || data?.holes[0] || null,[data?.holes,selectedHoleId]);
  const selectedIntervals = useMemo(() => selectedHole ? (data?.intervals || []).filter((row)=>row.drill_hole_id===selectedHole.id) : [],[data?.intervals,selectedHole]);
  const selectedSamples = useMemo(() => selectedHole ? (data?.samples || []).filter((row)=>row.drill_hole_id===selectedHole.id) : [],[data?.samples,selectedHole]);
  const locatedHoles = useMemo(() => (data?.holes || []).filter((h)=>h.collar_easting!=null && h.collar_northing!=null),[data?.holes]);
  const bounds = useMemo(() => {
    if(!locatedHoles.length)return null;
    const xs=locatedHoles.map(h=>Number(h.collar_easting));
    const ys=locatedHoles.map(h=>Number(h.collar_northing));
    return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  },[locatedHoles]);
  const sortedDrilling=useMemo(()=>[...(data?.recentDrilling||[])].sort((a,b)=>String(a[drillingSort.key]??'').localeCompare(String(b[drillingSort.key]??''),'es',{numeric:true})*drillingSort.direction),[data?.recentDrilling,drillingSort]);
  const drillingHeading=(label:string,key:typeof drillingSort.key)=><button onClick={()=>setDrillingSort(current=>({key,direction:current.key===key&&current.direction===1?-1:1}))} className="inline-flex items-center gap-1">{label}<ArrowUpDown className="h-3 w-3"/></button>;

  async function assignMine(reportId:string){
    const mineId=selectedMines[reportId];
    if(!mineId)return;
    setSavingId(reportId);
    try{
      const response=await fetch('/api/produccion/geologia',{method:'PATCH',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({reportId,mineId})});
      const result=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(result?.error||'No fue posible asignar la mina');
      toast.success(`Registro reconciliado con ${result.mine.name}`);
      setSelectedMines(current=>{const next={...current};delete next[reportId];return next;});
      await mutate();
    }catch(reason){toast.error(reason instanceof Error?reason.message:'No fue posible asignar la mina');}
    finally{setSavingId(null);}
  }

  return <div className="space-y-6">
    <PageHeader><PageHeaderContent><PageHeaderEyebrow>Producción · Geociencia operacional</PageHeaderEyebrow><PageHeaderTitle>Geología</PageHeaderTitle><PageHeaderDescription>Workspace geológico para sondajes, collar, logging, muestras, calidad y contexto externo. La interfaz distingue evidencia operacional, interpretación y contexto SERNAGEOMIN.</PageHeaderDescription></PageHeaderContent></PageHeader>

    {error ? <StatePanel tone="error" title="No fue posible cargar Geología" description="Reintenta la consulta." actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/> : null}

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-6" aria-label="Resumen geológico">
      {[
        {label:'Sondajes',value:s?.holes ?? '—',detail:s ? meters(s.canonicalDrilledMeters) : '—',icon:Drill},
        {label:'Collares ubicados',value:s ? `${s.locatedHoles}/${s.holes}` : '—',detail:s ? pct(s.holes ? s.locatedHoles/s.holes*100 : 0) : '—',icon:MapPinned},
        {label:'Logging',value:s?.intervals ?? '—',detail:'Intervalos geológicos',icon:Layers3},
        {label:'Muestras',value:s?.samples ?? '—',detail:s ? `${s.samplesReview} por revisar` : '—',icon:Beaker},
        {label:'SERNAGEOMIN',value:s?.sernageominRecords ?? '—',detail:s?.sernageominRecords ? 'Contexto disponible' : 'Sin contexto cargado',icon:Mountain},
        {label:'Ubicaciones',value:s?.unresolvedLocations ?? '—',detail:'Pendientes de revisión',icon:ShieldCheck},
      ].map((m)=>{const Icon=m.icon;return <div key={m.label} className="bg-card px-4 py-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{m.label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading?'—':m.value}</p><p className="mt-1 text-xs text-muted-foreground">{m.detail}</p></div>})}
    </section>

    <nav className="flex flex-wrap gap-2 border-b pb-3" aria-label="Vistas de Geología">
      {tabs.map(([key,label])=><Button key={key} size="sm" variant={tab===key?'default':'ghost'} onClick={()=>setTab(key)}>{label}</Button>)}
    </nav>

    {data && tab==='overview' ? <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card p-5 lg:col-span-2"><div className="flex items-center justify-between"><div><p className="font-medium">Estado geológico operacional</p><p className="mt-1 text-sm text-muted-foreground">Cobertura real de la información disponible hoy.</p></div><Network className="h-5 w-5 text-muted-foreground"/></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Collar georreferenciado" value={`${s?.locatedHoles||0}/${s?.holes||0}`} detail={s ? pct(s.holes ? s.locatedHoles/s.holes*100 : 0) : '—'} />
          <Metric label="Orientación completa" value={`${s?.orientedHoles||0}/${s?.holes||0}`} detail="Azimut + inclinación" />
          <Metric label="Propósito geológico" value={`${s?.purposeHoles||0}/${s?.holes||0}`} detail="Sondajes documentados" />
          <Metric label="Muestras validadas" value={`${s?.samplesValidated||0}/${s?.samples||0}`} detail="Estado de calidad" />
        </div></section>
        <section className="rounded-lg border bg-card p-5"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Brecha principal</p></div><p className="mt-3 text-sm text-muted-foreground">{data.intelligenceStatus.note}</p>{!data.intelligenceStatus.sernageominContextAvailable?<p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">El modelo ya soporta contexto externo georreferenciado, pero no hay registros SERNAGEOMIN cargados para esta organización.</p>:null}</section>
      </div>

      <section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Evidencia operacional reciente</p><p className="mt-1 text-sm text-muted-foreground">Registro fuente de sondaje y estado de reconciliación canónica.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">{drillingHeading('Fecha','operation_date')}</th><th className="px-4 py-3">{drillingHeading('Pozo','hole_code_raw')}</th><th className="px-4 py-3">{drillingHeading('Mina / sector fuente','mine_raw')}</th><th className="px-4 py-3 text-right">{drillingHeading('Metros','drilled_meters')}</th><th className="px-4 py-3">Reconciliación</th>{data.canWrite?<th className="px-4 py-3">Asignar mina</th>:null}</tr></thead><tbody className="divide-y">{sortedDrilling.slice(0,80).map((r)=><tr key={r.id}><td className="px-4 py-3 whitespace-nowrap">{r.operation_date || '—'}</td><td className="px-4 py-3 font-medium">{r.hole_code_raw || '—'}</td><td className="px-4 py-3"><p>{r.mine_raw && r.mine_raw !== '#ERROR!' ? r.mine_raw : 'Sin mina en fuente'}</p><p className="text-xs text-muted-foreground">{r.sector_raw || 'Sin sector fuente'}</p></td><td className="px-4 py-3 text-right tabular-nums">{Number(r.drilled_meters || 0).toLocaleString('es-CL',{maximumFractionDigits:1})}</td><td className="px-4 py-3 text-xs text-muted-foreground">{r.canonical_mine_source_id?'Mina ✓':'Mina pendiente'} · {r.canonical_mine_sector_id?'Sector ✓':'Sector pendiente'} · {r.canonical_drill_hole_id?'Pozo ✓':'Pozo pendiente'}</td>{data.canWrite?<td className="min-w-[280px] px-4 py-3"><div className="flex items-center gap-2"><Select value={selectedMines[r.id]||''} onValueChange={(value)=>setSelectedMines(current=>({...current,[r.id]:value}))}><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar mina"/></SelectTrigger><SelectContent>{data.mines.map(m=><SelectItem key={m.id} value={m.id}>{m.name}{m.code?` · ${m.code}`:''}</SelectItem>)}</SelectContent></Select><Button size="sm" disabled={!selectedMines[r.id]||savingId===r.id} onClick={()=>void assignMine(r.id)}>{savingId===r.id?'Guardando…':'Asignar'}</Button></div></td>:null}</tr>)}</tbody></table></div></section>
    </div> : null}

    {data && tab==='map' ? <section className="rounded-lg border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">Mapa de collares</p><p className="mt-1 text-sm text-muted-foreground">Vista espacial relativa de los sondajes con coordenadas canónicas. No sustituye una capa cartográfica oficial.</p></div><span className="text-xs text-muted-foreground">{locatedHoles.length} collares georreferenciados</span></div>{bounds && locatedHoles.length ? <div className="relative mt-4 h-[520px] overflow-hidden rounded-md border bg-muted/20">{locatedHoles.map((hole)=>{const xRange=Math.max(1,bounds.maxX-bounds.minX);const yRange=Math.max(1,bounds.maxY-bounds.minY);const left=((Number(hole.collar_easting)-bounds.minX)/xRange)*94+3;const bottom=((Number(hole.collar_northing)-bounds.minY)/yRange)*92+4;return <button key={hole.id} title={`${hole.hole_code} · E ${hole.collar_easting} · N ${hole.collar_northing}`} onClick={()=>{setSelectedHoleId(hole.id);setTab('holes');}} className="absolute h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm" style={{left:`${left}%`,bottom:`${bottom}%`}}/>;})}<div className="absolute bottom-3 left-3 rounded bg-background/90 px-2 py-1 text-[11px] text-muted-foreground">CRS según fuente de cada collar · clic para abrir sondaje</div></div> : <StatePanel title="Sin collares georreferenciados" description="Los sondajes existen, pero no hay coordenadas canónicas suficientes para construir la vista espacial." className="mt-4 min-h-[280px]"/>}</section> : null}

    {data && tab==='holes' ? <div className="grid gap-4 xl:grid-cols-[360px_1fr]"><section className="rounded-lg border bg-card"><div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><input value={holeSearch} onChange={(e)=>setHoleSearch(e.target.value)} placeholder="Buscar sondaje..." className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"/></div></div><div className="max-h-[620px] overflow-y-auto divide-y">{filteredHoles.map((hole)=><button key={hole.id} onClick={()=>setSelectedHoleId(hole.id)} className={`w-full px-4 py-3 text-left hover:bg-muted/40 ${selectedHole?.id===hole.id?'bg-muted/50':''}`}><div className="flex items-center justify-between gap-2"><span className="font-medium">{hole.hole_code}</span><span className="text-xs text-muted-foreground">{hole.status||'Sin estado'}</span></div><p className="mt-1 text-xs text-muted-foreground">{hole.geological_purpose || hole.operational_purpose || 'Sin propósito documentado'}</p></button>)}</div></section>{selectedHole?<HoleDetail hole={selectedHole} intervalCount={selectedIntervals.length} sampleCount={selectedSamples.length}/>:<StatePanel title="Sin sondajes" description="No hay sondajes canónicos disponibles para esta organización."/>}</div> : null}

    {data && tab==='logging' ? <div className="space-y-4"><HolePicker holes={data.holes} value={selectedHole?.id||''} onChange={setSelectedHoleId}/>{selectedHole ? <section className="rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Logging · {selectedHole.hole_code}</p><p className="mt-1 text-sm text-muted-foreground">Litología, alteración, mineralización, recuperación, RQD y vínculo de muestra por intervalo.</p></div>{selectedIntervals.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Desde</th><th className="px-4 py-3">Hasta</th><th className="px-4 py-3">Litología</th><th className="px-4 py-3">Alteración</th><th className="px-4 py-3">Mineralización</th><th className="px-4 py-3 text-right">Rec.</th><th className="px-4 py-3 text-right">RQD</th><th className="px-4 py-3">Muestra</th></tr></thead><tbody className="divide-y">{selectedIntervals.map((row)=><tr key={row.id}><td className="px-4 py-3 tabular-nums">{row.from_m}</td><td className="px-4 py-3 tabular-nums">{row.to_m}</td><td className="px-4 py-3">{row.lithology||'—'}</td><td className="px-4 py-3">{row.alteration||'—'}</td><td className="px-4 py-3">{row.mineralization||'—'}</td><td className="px-4 py-3 text-right tabular-nums">{row.recovery_pct!=null?`${row.recovery_pct}%`:'—'}</td><td className="px-4 py-3 text-right tabular-nums">{row.rqd_pct!=null?`${row.rqd_pct}%`:'—'}</td><td className="px-4 py-3">{row.sample_code||'—'}</td></tr>)}</tbody></table></div> : <StatePanel title="Logging pendiente" description="Este sondaje no tiene intervalos geológicos canónicos. Motil no infiere litología, alteración ni mineralización desde datos de perforación." className="m-4 min-h-[260px]"/>}</section>:null}</div> : null}

    {data && tab==='samples' ? <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-3"><MetricCard title="Muestras" value={compact(s?.samples||0)} icon={Beaker}/><MetricCard title="Validadas" value={compact(s?.samplesValidated||0)} icon={CheckCircle2}/><MetricCard title="Por revisar" value={compact(s?.samplesReview||0)} icon={AlertTriangle}/></div><section className="overflow-hidden rounded-lg border bg-card"><div className="border-b px-4 py-3"><p className="font-medium">Muestras y control de calidad</p><p className="mt-1 text-sm text-muted-foreground">Trazabilidad de muestra, profundidad, fuente y estado de validación.</p></div>{data.samples.length?<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Muestra</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Sondaje</th><th className="px-4 py-3">Intervalo</th><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Validación</th></tr></thead><tbody className="divide-y">{data.samples.map((row)=>{const hole=data.holes.find(h=>h.id===row.drill_hole_id);return <tr key={row.id}><td className="px-4 py-3 font-medium">{row.sample_code}</td><td className="px-4 py-3">{row.sample_type||'—'}</td><td className="px-4 py-3">{row.sample_date||'—'}</td><td className="px-4 py-3">{hole?.hole_code||'Sin vínculo'}</td><td className="px-4 py-3 tabular-nums">{row.depth_from_m!=null||row.depth_to_m!=null?`${row.depth_from_m??'—'}–${row.depth_to_m??'—'} m`:'—'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.source_file||'—'}{row.source_sheet?` · ${row.source_sheet}`:''}</td><td className="px-4 py-3"><span className="text-xs">{row.validation_status||'Sin estado'}</span>{row.validation_notes?<p className="mt-1 max-w-[260px] text-xs text-muted-foreground">{row.validation_notes}</p>:null}</td></tr>})}</tbody></table></div>:<StatePanel title="Sin muestras químicas" description="No hay muestras canónicas disponibles para el período u organización seleccionados." className="m-4 min-h-[260px]"/>}</section></div> : null}

    {data && tab==='context' ? <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-4"><MetricCard title="Contexto externo" value={compact(data.contextQuality.external_records)} icon={Layers3}/><MetricCard title="SERNAGEOMIN" value={compact(data.contextQuality.sernageomin_records)} icon={Mountain}/><MetricCard title="Georreferenciado" value={compact(data.contextQuality.georeferenced_records)} icon={MapPinned}/><MetricCard title="Por revisar" value={compact(data.contextQuality.review_records)} icon={AlertTriangle}/></div>{data.externalContext.length?<section className="overflow-hidden rounded-lg border bg-card"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Dataset</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Título</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Validación</th></tr></thead><tbody className="divide-y">{data.externalContext.map((row)=><tr key={row.id}><td className="px-4 py-3 font-medium">{row.source_provider||'—'}</td><td className="px-4 py-3">{row.source_dataset||'—'}</td><td className="px-4 py-3">{row.record_type||'—'}</td><td className="px-4 py-3">{row.title||row.source_record_key||'—'}</td><td className="px-4 py-3">{row.status||'—'}</td><td className="px-4 py-3">{row.validation_status||'—'}</td></tr>)}</tbody></table></div></section>:<StatePanel title="Contexto SERNAGEOMIN aún no cargado" description="La estructura ya está preparada para cartografía y registros geológicos externos con geometría, procedencia y validación. Actualmente no existen registros para esta organización." className="min-h-[320px]"/>}</div> : null}
  </div>;
}

function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>}

function MetricCard({title,value,icon:Icon}:{title:string;value:string;icon:typeof Drill}){return <div className="rounded-lg border bg-card p-4"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{title}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></div>}

function HolePicker({holes,value,onChange}:{holes:Hole[];value:string;onChange:(id:string)=>void}){return <div className="max-w-md"><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Seleccionar sondaje"/></SelectTrigger><SelectContent>{holes.map(h=><SelectItem key={h.id} value={h.id}>{h.hole_code}</SelectItem>)}</SelectContent></Select></div>}

function HoleDetail({hole,intervalCount,sampleCount}:{hole:Hole;intervalCount:number;sampleCount:number}){return <section className="rounded-lg border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Sondaje canónico</p><h2 className="mt-1 text-xl font-semibold">{hole.hole_code}</h2><p className="mt-1 text-sm text-muted-foreground">{hole.geological_purpose || hole.operational_purpose || 'Sin propósito documentado'}</p></div><span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{hole.status||'Sin estado'}</span></div><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Profundidad" value={hole.drilled_depth_m!=null?meters(Number(hole.drilled_depth_m)):'—'} detail={hole.planned_depth_m!=null?`Plan ${meters(Number(hole.planned_depth_m))}`:'Sin profundidad planificada'}/><Metric label="Orientación" value={hole.azimuth_deg!=null&&hole.dip_deg!=null?`${hole.azimuth_deg}° / ${hole.dip_deg}°`:'—'} detail="Azimut / inclinación"/><Metric label="Logging" value={compact(intervalCount)} detail="Intervalos"/><Metric label="Muestras" value={compact(sampleCount)} detail="Vinculadas al sondaje"/></div><div className="mt-6 grid gap-4 lg:grid-cols-2"><div className="rounded-md bg-muted/30 p-4"><p className="text-xs font-medium text-muted-foreground">Collar</p><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><dt className="text-muted-foreground">Este</dt><dd className="text-right tabular-nums">{hole.collar_easting??'—'}</dd><dt className="text-muted-foreground">Norte</dt><dd className="text-right tabular-nums">{hole.collar_northing??'—'}</dd><dt className="text-muted-foreground">Cota</dt><dd className="text-right tabular-nums">{hole.collar_elevation??'—'}</dd><dt className="text-muted-foreground">Referencia</dt><dd className="text-right">{hole.coordinate_reference||'—'}</dd></dl></div><div className="rounded-md bg-muted/30 p-4"><p className="text-xs font-medium text-muted-foreground">Trazabilidad</p><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><dt className="text-muted-foreground">Dominio</dt><dd className="text-right">{hole.drilling_domain||'—'}</dd><dt className="text-muted-foreground">Diámetro</dt><dd className="text-right">{hole.diameter_mm!=null?`${hole.diameter_mm} mm`:'—'}</dd><dt className="text-muted-foreground">Fuente</dt><dd className="text-right">{hole.source_type||'—'}</dd><dt className="text-muted-foreground">Referencia</dt><dd className="text-right break-all">{hole.source_reference||'—'}</dd></dl></div></div></section>}
