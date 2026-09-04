'use client';

import useSWR from 'swr';
import { Beaker, Database, Drill, FileCheck2, TrendingUp } from 'lucide-react';
import { periodUrl, useDashboardPeriod } from '@/components/dashboard/dashboard-period-provider';

type ChemistryResult = {
  id:string; sample_id:string; sample_code:string|null; sample_type:string|null; sample_date:string|null;
  analyte_code:string|null; analyte_name:string|null; result_value:number|null; result_unit:string|null;
  method_code:string|null; laboratory:string|null; result_date:string|null; source_file:string|null; source_sheet:string|null;
  validation_status:string|null; mine_source_id:string|null; mine_name:string|null; mine_sector_id:string|null;
  drill_hole_id:string|null; depth_from_m:number|null; depth_to_m:number|null;
};

type Mine = {
  id:string; name:string;
  chemistry:{results:number|null;avg_cu_pct:number|null;min_cu_pct:number|null;max_cu_pct:number|null;first_sample_date:string|null;last_sample_date:string|null}|null;
};

type Data = {
  summary:{holes:number;canonicalDrilledMeters:number;samples:number;assays:number;assaysValidated:number};
  drillingHistory:{report_rows:number|null;holes:number|null;drilled_meters:number|null;min_date:string|null;max_date:string|null;meter_capture_pct:number|null}|null;
  mines:Mine[];
  chemistryResults:ChemistryResult[];
};

type GradeMonth={
  month:string;
  records:number;
  avgHeadGradePct:number|null;
  minHeadGradePct:number|null;
  maxHeadGradePct:number|null;
  sourceFiles:string[];
};

type PlanLine={
  id:string; line_type:string; mine_name_raw:string|null; sector_raw:string|null; level_raw:string|null; section_raw:string|null;
  planned_tons:number|null; planned_grade_pct:number|null; planned_fine_cu:number|null; planned_advance_m:number|null; planned_drilling_m:number|null;
  source_reference:string|null; priority:number|null;
};

type MinePlan={
  id:string; plan_code:string; period_start:string; period_end:string|null; status:string|null; target_cu_grade_pct:number|null;
  planned_advance_m:number|null; planned_drilling_m:number|null; total_mineral_to_plant_tons:number|null; total_waste_tons:number|null;
  total_movement_tons:number|null; lines:PlanLine[];
};

type HistoryData={
  provenance:'La Patagua';
  headGradeSummary:{validRecords:number;reviewRecords:number;firstDate:string|null;lastDate:string|null;months:number};
  headGradeHistory:GradeMonth[];
  minePlans:MinePlan[];
};

const fetcher=async<T,>(url:string):Promise<T>=>{
  const response=await fetch(url,{credentials:'include'});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'No fue posible cargar el histórico geológico');
  return data;
};

function formatDate(value:string|null){
  if(!value)return '—';
  return new Intl.DateTimeFormat('es-CL',{year:'numeric',month:'short',day:'2-digit'}).format(new Date(`${value.slice(0,10)}T12:00:00`));
}

function formatMonth(value:string|null){
  if(!value)return '—';
  return new Intl.DateTimeFormat('es-CL',{year:'numeric',month:'short'}).format(new Date(`${value.slice(0,10)}T12:00:00`));
}

function cu(value:number|null,unit:string|null='%'){
  if(value==null)return '—';
  return `${Number(value).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}${unit==='%'?'%':unit?` ${unit}`:''}`;
}

function num(value:number|null,unit=''){
  if(value==null)return '—';
  return `${Number(value).toLocaleString('es-CL',{maximumFractionDigits:1})}${unit}`;
}

export function GeologiaHistoricalCanonical(){
  const {month}=useDashboardPeriod();
  const {data,error,isLoading}=useSWR(periodUrl('/api/produccion/geologia',month),(url)=>fetcher<Data>(url));
  const {data:historyData,error:historyError,isLoading:historyLoading}=useSWR('/api/produccion/geologia/historia-la-patagua',(url)=>fetcher<HistoryData>(url));
  if(error)return null;

  const results=data?.chemistryResults||[];
  const resultDates=results.map((row)=>row.sample_date||row.result_date).filter(Boolean).map((value)=>new Date(`${String(value).slice(0,10)}T12:00:00`).getTime());
  const firstAssay=resultDates.length?new Date(Math.min(...resultDates)).toISOString().slice(0,10):null;
  const lastAssay=resultDates.length?new Date(Math.max(...resultDates)).toISOString().slice(0,10):null;
  const linkedToHole=results.filter((row)=>row.drill_hole_id).length;
  const chemistryMines=(data?.mines||[]).filter((mine)=>mine.chemistry&&Number(mine.chemistry.results||0)>0);
  const history=data?.drillingHistory;
  const gradeMonths=historyData?.headGradeHistory||[];
  const recentGrades=gradeMonths.slice(-24).reverse();
  const latestPlan=historyData?.minePlans?.[0]||null;
  const minePlanLines=(latestPlan?.lines||[]).filter((line)=>line.mine_name_raw||line.sector_raw);

  return <section className="space-y-5 rounded-lg border bg-card p-5" aria-label="Histórico canónico de Geología">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-2"><Database className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Histórico canónico de La Patagua</p></div><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Integra leyes de planta, ensayes, planificación minera y evidencia de sondaje manteniendo cada fuente y granularidad separadas. Motil sólo relaciona registros cuando existe vínculo canónico explícito.</p></div>
      <div className="inline-flex w-fit items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground"><FileCheck2 className="h-3.5 w-3.5"/>Sólo datos La Patagua</div>
    </div>

    <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-background p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5"/>Ley cabeza histórica</div><p className="mt-2 text-xl font-semibold">{historyLoading?'—':Number(historyData?.headGradeSummary.validRecords||0).toLocaleString('es-CL')}</p><p className="mt-1 text-xs text-muted-foreground">{historyData?.headGradeSummary.firstDate&&historyData?.headGradeSummary.lastDate?`${formatMonth(historyData.headGradeSummary.firstDate)} → ${formatMonth(historyData.headGradeSummary.lastDate)}`:'Sin fechas'}</p></div>
      <div className="bg-background p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Beaker className="h-3.5 w-3.5"/>Ensayes históricos</div><p className="mt-2 text-xl font-semibold">{isLoading?'—':results.length}</p><p className="mt-1 text-xs text-muted-foreground">{firstAssay&&lastAssay?`${formatDate(firstAssay)} → ${formatDate(lastAssay)}`:'Sin fechas'}</p></div>
      <div className="bg-background p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Drill className="h-3.5 w-3.5"/>Reportes de sondaje</div><p className="mt-2 text-xl font-semibold">{isLoading?'—':Number(history?.report_rows||0).toLocaleString('es-CL')}</p><p className="mt-1 text-xs text-muted-foreground">{history?.min_date&&history?.max_date?`${formatDate(history.min_date)} → ${formatDate(history.max_date)}`:'Sin fechas'}</p></div>
      <div className="bg-background p-4"><p className="text-xs text-muted-foreground">Plan minero vigente</p><p className="mt-2 text-xl font-semibold">{historyLoading?'—':latestPlan?.period_start?formatMonth(latestPlan.period_start):'—'}</p><p className="mt-1 text-xs text-muted-foreground">Ley objetivo {latestPlan?.target_cu_grade_pct!=null?cu(latestPlan.target_cu_grade_pct):'—'}</p></div>
    </div>

    {!historyError&&gradeMonths.length?<div className="overflow-hidden rounded-md border">
      <div className="border-b px-4 py-3"><p className="font-medium">Ley cabeza mina · historia operacional</p><p className="mt-1 text-xs text-muted-foreground">Promedio mensual calculado únicamente con registros canónicos validados de La Patagua. Los registros en revisión se excluyen del promedio.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Mes</th><th className="px-4 py-3 text-right">Ley cabeza promedio</th><th className="px-4 py-3 text-right">Mínimo</th><th className="px-4 py-3 text-right">Máximo</th><th className="px-4 py-3 text-right">Registros</th><th className="px-4 py-3">Fuente</th></tr></thead><tbody className="divide-y">{recentGrades.map((row)=><tr key={row.month}><td className="whitespace-nowrap px-4 py-3 font-medium">{formatMonth(row.month)}</td><td className="px-4 py-3 text-right tabular-nums">{cu(row.avgHeadGradePct)}</td><td className="px-4 py-3 text-right tabular-nums">{cu(row.minHeadGradePct)}</td><td className="px-4 py-3 text-right tabular-nums">{cu(row.maxHeadGradePct)}</td><td className="px-4 py-3 text-right tabular-nums">{row.records}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.sourceFiles.slice(0,2).join(' · ')||'Producción canónica'}</td></tr>)}</tbody></table></div>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">Serie completa: {historyData?.headGradeSummary.months||0} meses · {historyData?.headGradeSummary.validRecords||0} registros válidos · {historyData?.headGradeSummary.reviewRecords||0} en revisión.</div>
    </div>:null}

    {latestPlan?<div className="overflow-hidden rounded-md border">
      <div className="border-b px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">Plan minero {formatMonth(latestPlan.period_start)}</p><p className="mt-1 text-xs text-muted-foreground">Planificación operativa canónica de La Patagua por mina, sector y tipo de trabajo.</p></div><div className="text-xs text-muted-foreground">{num(latestPlan.planned_advance_m,' m avance')} · {num(latestPlan.planned_drilling_m,' m perforación')}</div></div></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Mina</th><th className="px-4 py-3">Sector / actividad</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Toneladas</th><th className="px-4 py-3 text-right">Ley plan</th><th className="px-4 py-3 text-right">Avance</th><th className="px-4 py-3 text-right">Perforación</th><th className="px-4 py-3">Referencia</th></tr></thead><tbody className="divide-y">{minePlanLines.map((line)=><tr key={line.id}><td className="px-4 py-3 font-medium">{line.mine_name_raw||'General'}</td><td className="px-4 py-3">{line.sector_raw||line.section_raw||line.level_raw||'—'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{line.line_type}</td><td className="px-4 py-3 text-right tabular-nums">{num(line.planned_tons)}</td><td className="px-4 py-3 text-right tabular-nums">{line.planned_grade_pct!=null?cu(line.planned_grade_pct):'—'}</td><td className="px-4 py-3 text-right tabular-nums">{num(line.planned_advance_m,' m')}</td><td className="px-4 py-3 text-right tabular-nums">{num(line.planned_drilling_m,' m')}</td><td className="px-4 py-3 text-xs text-muted-foreground">{line.source_reference||'—'}</td></tr>)}</tbody></table></div>
    </div>:null}

    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center"><div className="rounded-md bg-muted/30 px-4 py-3 text-sm"><p className="font-medium">Regla de integración</p><p className="mt-1 text-muted-foreground">La ley cabeza histórica corresponde a operación de planta; los ensayes conservan su muestra/mina real; el plan conserva mina/sector/actividad. {linkedToHole===0?'Los ensayes sin sondaje explícito no se adhieren a pozos por similitud o fecha.':`${linkedToHole} ensayes tienen vínculo explícito a sondaje.`}</p></div><div className="text-sm text-muted-foreground lg:text-right"><p>Origen: La Patagua</p><p>Trazabilidad fuente preservada</p></div></div>

    {chemistryMines.length?<div className="grid gap-3 md:grid-cols-2">{chemistryMines.map((mine)=><div key={mine.id} className="rounded-md border p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-medium">{mine.name}</p><p className="mt-1 text-xs text-muted-foreground">{mine.chemistry?.first_sample_date?formatDate(mine.chemistry.first_sample_date):'—'} → {mine.chemistry?.last_sample_date?formatDate(mine.chemistry.last_sample_date):'—'}</p></div><p className="text-sm tabular-nums">{Number(mine.chemistry?.results||0)} resultados</p></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Cu promedio</p><p className="mt-1 font-medium">{cu(mine.chemistry?.avg_cu_pct??null)}</p></div><div><p className="text-xs text-muted-foreground">Mínimo</p><p className="mt-1 font-medium">{cu(mine.chemistry?.min_cu_pct??null)}</p></div><div><p className="text-xs text-muted-foreground">Máximo</p><p className="mt-1 font-medium">{cu(mine.chemistry?.max_cu_pct??null)}</p></div></div></div>)}</div>:null}

    {results.length?<div className="overflow-hidden rounded-md border"><div className="border-b px-4 py-3"><p className="font-medium">Ensayes históricos</p><p className="mt-1 text-xs text-muted-foreground">Fuente, muestra, mina y resultado. Un pozo aparece sólo cuando el dato histórico lo identifica explícitamente.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Muestra</th><th className="px-4 py-3">Mina</th><th className="px-4 py-3">Analito</th><th className="px-4 py-3 text-right">Resultado</th><th className="px-4 py-3">Método</th><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Vínculo pozo</th></tr></thead><tbody className="divide-y">{results.map((row)=><tr key={row.id}><td className="whitespace-nowrap px-4 py-3">{formatDate(row.sample_date||row.result_date)}</td><td className="px-4 py-3 font-medium">{row.sample_code||'—'}</td><td className="px-4 py-3">{row.mine_name||'Sin mina canónica'}</td><td className="px-4 py-3">{row.analyte_name||row.analyte_code||'—'}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{cu(row.result_value,row.result_unit)}</td><td className="px-4 py-3">{row.method_code||'—'}</td><td className="px-4 py-3"><p>{row.source_file||'—'}</p><p className="text-xs text-muted-foreground">{row.source_sheet||''}</p></td><td className="px-4 py-3 text-xs text-muted-foreground">{row.drill_hole_id?'Canónico':'No asignado'}</td></tr>)}</tbody></table></div></div>:null}
  </section>;
}
