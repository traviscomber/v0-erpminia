'use client';

import useSWR from 'swr';
import { Beaker, Database, Drill, FileCheck2 } from 'lucide-react';
import { periodUrl, useDashboardPeriod } from '@/components/dashboard/dashboard-period-provider';

type ChemistryResult = {
  id:string;
  sample_id:string;
  sample_code:string|null;
  sample_type:string|null;
  sample_date:string|null;
  analyte_code:string|null;
  analyte_name:string|null;
  result_value:number|null;
  result_unit:string|null;
  method_code:string|null;
  laboratory:string|null;
  result_date:string|null;
  source_file:string|null;
  source_sheet:string|null;
  validation_status:string|null;
  mine_source_id:string|null;
  mine_name:string|null;
  mine_sector_id:string|null;
  drill_hole_id:string|null;
  depth_from_m:number|null;
  depth_to_m:number|null;
};

type Mine = {
  id:string;
  name:string;
  chemistry:{
    results:number|null;
    avg_cu_pct:number|null;
    min_cu_pct:number|null;
    max_cu_pct:number|null;
    first_sample_date:string|null;
    last_sample_date:string|null;
  }|null;
};

type Data = {
  summary:{holes:number;canonicalDrilledMeters:number;samples:number;assays:number;assaysValidated:number};
  drillingHistory:{report_rows:number|null;holes:number|null;drilled_meters:number|null;min_date:string|null;max_date:string|null;meter_capture_pct:number|null}|null;
  mines:Mine[];
  chemistryResults:ChemistryResult[];
};

const fetcher=async(url:string):Promise<Data>=>{
  const response=await fetch(url,{credentials:'include'});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'No fue posible cargar el histórico geológico');
  return data;
};

function formatDate(value:string|null){
  if(!value)return '—';
  return new Intl.DateTimeFormat('es-CL',{year:'numeric',month:'short',day:'2-digit'}).format(new Date(`${value.slice(0,10)}T12:00:00`));
}

function cu(value:number|null,unit:string|null){
  if(value==null)return '—';
  return `${Number(value).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}${unit==='%'?'%':unit?` ${unit}`:''}`;
}

export function GeologiaHistoricalCanonical(){
  const {month}=useDashboardPeriod();
  const {data,error,isLoading}=useSWR(periodUrl('/api/produccion/geologia',month),fetcher);
  if(error)return null;

  const results=data?.chemistryResults||[];
  const resultDates=results.map((row)=>row.sample_date||row.result_date).filter(Boolean).map((value)=>new Date(`${String(value).slice(0,10)}T12:00:00`).getTime());
  const firstAssay=resultDates.length?new Date(Math.min(...resultDates)).toISOString().slice(0,10):null;
  const lastAssay=resultDates.length?new Date(Math.max(...resultDates)).toISOString().slice(0,10):null;
  const linkedToHole=results.filter((row)=>row.drill_hole_id).length;
  const chemistryMines=(data?.mines||[]).filter((mine)=>mine.chemistry&&Number(mine.chemistry.results||0)>0);
  const history=data?.drillingHistory;

  return <section className="space-y-4 rounded-lg border bg-card p-5" aria-label="Histórico canónico de Geología">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><Database className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Histórico canónico de La Patagua</p></div><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Dos líneas históricas conservadas por separado: leyes históricas por muestra/mina y operación de sondajes por reporte/pozo. Motil sólo las conecta cuando existe una relación canónica explícita.</p></div>
      <div className="inline-flex w-fit items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground"><FileCheck2 className="h-3.5 w-3.5"/>Trazabilidad preservada</div>
    </div>

    <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-background p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Beaker className="h-3.5 w-3.5"/>Histórico de leyes</div><p className="mt-2 text-xl font-semibold">{isLoading?'—':results.length}</p><p className="mt-1 text-xs text-muted-foreground">{firstAssay&&lastAssay?`${formatDate(firstAssay)} → ${formatDate(lastAssay)}`:'Sin fechas'}</p></div>
      <div className="bg-background p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Drill className="h-3.5 w-3.5"/>Reportes históricos</div><p className="mt-2 text-xl font-semibold">{isLoading?'—':Number(history?.report_rows||0).toLocaleString('es-CL')}</p><p className="mt-1 text-xs text-muted-foreground">{history?.min_date&&history?.max_date?`${formatDate(history.min_date)} → ${formatDate(history.max_date)}`:'Sin fechas'}</p></div>
      <div className="bg-background p-4"><p className="text-xs text-muted-foreground">Metros reportados</p><p className="mt-2 text-xl font-semibold">{isLoading?'—':`${Number(history?.drilled_meters||0).toLocaleString('es-CL',{maximumFractionDigits:0})} m`}</p><p className="mt-1 text-xs text-muted-foreground">Evidencia operacional fuente</p></div>
      <div className="bg-background p-4"><p className="text-xs text-muted-foreground">Sondajes canónicos</p><p className="mt-2 text-xl font-semibold">{isLoading?'—':data?.summary.holes??'—'}</p><p className="mt-1 text-xs text-muted-foreground">{Number(data?.summary.canonicalDrilledMeters||0).toLocaleString('es-CL',{maximumFractionDigits:0})} m en maestro</p></div>
    </div>

    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center"><div className="rounded-md bg-muted/30 px-4 py-3 text-sm"><p className="font-medium">Regla de integración</p><p className="mt-1 text-muted-foreground">Los {results.length} ensayes históricos conservan su mina/muestra real. {linkedToHole===0?'Ninguno identifica hoy un sondaje canónico; por eso Motil no los adhiere a los 400 pozos por similitud o fecha.':`${linkedToHole} ensayes tienen vínculo explícito a sondaje.`}</p></div><div className="text-sm text-muted-foreground lg:text-right"><p>Fuente sondajes: histórico operacional</p><p>Fuente leyes: histórico químico canónico</p></div></div>

    {chemistryMines.length?<div className="grid gap-3 md:grid-cols-2">{chemistryMines.map((mine)=><div key={mine.id} className="rounded-md border p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-medium">{mine.name}</p><p className="mt-1 text-xs text-muted-foreground">{mine.chemistry?.first_sample_date?formatDate(mine.chemistry.first_sample_date):'—'} → {mine.chemistry?.last_sample_date?formatDate(mine.chemistry.last_sample_date):'—'}</p></div><p className="text-sm tabular-nums">{Number(mine.chemistry?.results||0)} resultados</p></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Cu promedio</p><p className="mt-1 font-medium">{cu(mine.chemistry?.avg_cu_pct??null,'%')}</p></div><div><p className="text-xs text-muted-foreground">Mínimo</p><p className="mt-1 font-medium">{cu(mine.chemistry?.min_cu_pct??null,'%')}</p></div><div><p className="text-xs text-muted-foreground">Máximo</p><p className="mt-1 font-medium">{cu(mine.chemistry?.max_cu_pct??null,'%')}</p></div></div></div>)}</div>:null}

    {results.length?<div className="overflow-hidden rounded-md border"><div className="border-b px-4 py-3"><p className="font-medium">Resultados históricos</p><p className="mt-1 text-xs text-muted-foreground">Fuente, muestra, mina y resultado. Un pozo aparece sólo cuando el dato histórico lo identifica explícitamente.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Muestra</th><th className="px-4 py-3">Mina</th><th className="px-4 py-3">Analito</th><th className="px-4 py-3 text-right">Resultado</th><th className="px-4 py-3">Método</th><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Vínculo pozo</th></tr></thead><tbody className="divide-y">{results.map((row)=><tr key={row.id}><td className="whitespace-nowrap px-4 py-3">{formatDate(row.sample_date||row.result_date)}</td><td className="px-4 py-3 font-medium">{row.sample_code||'—'}</td><td className="px-4 py-3">{row.mine_name||'Sin mina canónica'}</td><td className="px-4 py-3">{row.analyte_name||row.analyte_code||'—'}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{cu(row.result_value,row.result_unit)}</td><td className="px-4 py-3">{row.method_code||'—'}</td><td className="px-4 py-3"><p>{row.source_file||'—'}</p><p className="text-xs text-muted-foreground">{row.source_sheet||''}</p></td><td className="px-4 py-3 text-xs text-muted-foreground">{row.drill_hole_id?'Canónico':'No asignado'}</td></tr>)}</tbody></table></div></div>:null}
  </section>;
}
