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

type GradeMonth = {
  month:string; records:number; avgHeadGradePct:number|null; minHeadGradePct:number|null; maxHeadGradePct:number|null; sourceFiles:string[];
};

type PlanLine = {
  id:string; line_type:string; mine_name_raw:string|null; sector_raw:string|null; level_raw:string|null; section_raw:string|null;
  planned_tons:number|null; planned_grade_pct:number|null; planned_fine_cu:number|null; planned_advance_m:number|null; planned_drilling_m:number|null;
  source_reference:string|null; priority:number|null;
};

type MinePlan = {
  id:string; plan_code:string; period_start:string; period_end:string|null; status:string|null; target_cu_grade_pct:number|null;
  planned_advance_m:number|null; planned_drilling_m:number|null; total_mineral_to_plant_tons:number|null; total_waste_tons:number|null;
  total_movement_tons:number|null; lines:PlanLine[];
};

type HistoryData = {
  provenance:'La Patagua'; chronology:'newest_first';
  headGradeSummary:{validRecords:number;reviewRecords:number;firstDate:string|null;lastDate:string|null;months:number;latestMonth:string|null;latestAvgHeadGradePct:number|null};
  headGradeHistory:GradeMonth[];
  minePlans:MinePlan[];
};

const fetcher = async<T,>(url:string):Promise<T> => {
  const response = await fetch(url,{credentials:'include'});
  const data = await response.json();
  if(!response.ok) throw new Error(data.error||'No fue posible cargar el histórico geológico');
  return data;
};

function formatDate(value:string|null){
  if(!value) return '—';
  return new Intl.DateTimeFormat('es-CL',{year:'numeric',month:'short',day:'2-digit'}).format(new Date(`${value.slice(0,10)}T12:00:00`));
}

function formatMonth(value:string|null){
  if(!value) return '—';
  return new Intl.DateTimeFormat('es-CL',{year:'numeric',month:'short'}).format(new Date(`${value.slice(0,10)}T12:00:00`));
}

function cu(value:number|null,unit:string|null='%'){
  if(value==null) return '—';
  return `${Number(value).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}${unit==='%'?'%':unit?` ${unit}`:''}`;
}

function num(value:number|null,unit=''){
  if(value==null) return '—';
  return `${Number(value).toLocaleString('es-CL',{maximumFractionDigits:1})}${unit}`;
}

function resultTimestamp(row:ChemistryResult){
  const value=row.sample_date||row.result_date;
  return value?new Date(`${value.slice(0,10)}T12:00:00`).getTime():0;
}

export function GeologiaHistoricalCanonical(){
  const {month}=useDashboardPeriod();
  const {data,error,isLoading}=useSWR(periodUrl('/api/produccion/geologia',month),(url)=>fetcher<Data>(url));
  const {data:historyData,error:historyError,isLoading:historyLoading}=useSWR('/api/produccion/geologia/historia-la-patagua',(url)=>fetcher<HistoryData>(url));
  if(error) return null;

  const results=[...(data?.chemistryResults||[])].sort((a,b)=>resultTimestamp(b)-resultTimestamp(a));
  const linkedToHole=results.filter((row)=>row.drill_hole_id).length;
  const chemistryMines=(data?.mines||[])
    .filter((mine)=>mine.chemistry&&Number(mine.chemistry.results||0)>0)
    .sort((a,b)=>String(b.chemistry?.last_sample_date||'').localeCompare(String(a.chemistry?.last_sample_date||'')));
  const history=data?.drillingHistory;
  const gradeMonths=[...(historyData?.headGradeHistory||[])].sort((a,b)=>b.month.localeCompare(a.month));
  const recentGrades=gradeMonths.slice(0,24);
  const latestGrade=gradeMonths[0]||null;
  const latestPlan=[...(historyData?.minePlans||[])].sort((a,b)=>b.period_start.localeCompare(a.period_start))[0]||null;
  const minePlanLines=(latestPlan?.lines||[]).filter((line)=>line.mine_name_raw||line.sector_raw);
  const firstAssay=results.length?results[results.length-1]?.sample_date||results[results.length-1]?.result_date||null:null;
  const lastAssay=results.length?results[0]?.sample_date||results[0]?.result_date||null:null;

  return <section className="space-y-6 rounded-lg border bg-card p-5" aria-label="Histórico canónico de Geología">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2"><Database className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Histórico canónico de La Patagua</p></div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Ordenado desde el dato más vigente hacia atrás. Plan, ley de planta, sondajes y ensayes conservan su fuente y granularidad; Motil sólo relaciona registros cuando existe vínculo canónico explícito.</p>
      </div>
      <div className="inline-flex w-fit items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground"><FileCheck2 className="h-3.5 w-3.5"/>Sólo datos La Patagua</div>
    </div>

    <div>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Ahora · 2026</p>
      <div className="mt-3 grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-background p-4"><p className="text-xs text-muted-foreground">Plan minero vigente</p><p className="mt-2 text-xl font-semibold">{historyLoading?'—':formatMonth(latestPlan?.period_start||null)}</p><p className="mt-1 text-xs text-muted-foreground">Ley objetivo {latestPlan?.target_cu_grade_pct!=null?cu(latestPlan.target_cu_grade_pct):'—'}</p></div>
        <div className="bg-background p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5"/>Última ley cabeza validada</div><p className="mt-2 text-xl font-semibold">{historyLoading?'—':cu(latestGrade?.avgHeadGradePct??null)}</p><p className="mt-1 text-xs text-muted-foreground">{latestGrade?`${formatMonth(latestGrade.month)} · ${latestGrade.records} registros`:'Sin dato'}</p></div>
        <div className="bg-background p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Drill className="h-3.5 w-3.5"/>Última evidencia de sondaje</div><p className="mt-2 text-xl font-semibold">{isLoading?'—':formatDate(history?.max_date||null)}</p><p className="mt-1 text-xs text-muted-foreground">{Number(history?.report_rows||0).toLocaleString('es-CL')} reportes · {num(history?.drilled_meters??null,' m')}</p></div>
        <div className="bg-background p-4"><p className="text-xs text-muted-foreground">Maestro de sondajes</p><p className="mt-2 text-xl font-semibold">{isLoading?'—':Number(data?.summary.holes||0).toLocaleString('es-CL')}</p><p className="mt-1 text-xs text-muted-foreground">{num(data?.summary.canonicalDrilledMeters??null,' m canónicos')}</p></div>
      </div>
    </div>

    {latestPlan?<div className="overflow-hidden rounded-md border">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="font-medium">1. Plan minero vigente · {formatMonth(latestPlan.period_start)}</p><p className="mt-1 text-xs text-muted-foreground">Primero se muestra la planificación actual por mina, sector y tipo de trabajo.</p></div>
          <div className="text-xs text-muted-foreground">{num(latestPlan.planned_advance_m,' m avance')} · {num(latestPlan.planned_drilling_m,' m perforación')}</div>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Mina</th><th className="px-4 py-3">Sector / actividad</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Toneladas</th><th className="px-4 py-3 text-right">Ley plan</th><th className="px-4 py-3 text-right">Avance</th><th className="px-4 py-3 text-right">Perforación</th><th className="px-4 py-3">Referencia</th></tr></thead><tbody className="divide-y">{minePlanLines.map((line)=><tr key={line.id}><td className="px-4 py-3 font-medium">{line.mine_name_raw||'General'}</td><td className="px-4 py-3">{line.sector_raw||line.section_raw||line.level_raw||'—'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{line.line_type}</td><td className="px-4 py-3 text-right tabular-nums">{num(line.planned_tons)}</td><td className="px-4 py-3 text-right tabular-nums">{line.planned_grade_pct!=null?cu(line.planned_grade_pct):'—'}</td><td className="px-4 py-3 text-right tabular-nums">{num(line.planned_advance_m,' m')}</td><td className="px-4 py-3 text-right tabular-nums">{num(line.planned_drilling_m,' m')}</td><td className="px-4 py-3 text-xs text-muted-foreground">{line.source_reference||'—'}</td></tr>)}</tbody></table></div>
    </div>:null}

    {!historyError&&recentGrades.length?<div className="overflow-hidden rounded-md border">
      <div className="border-b px-4 py-3"><p className="font-medium">2. Ley cabeza · más reciente primero</p><p className="mt-1 text-xs text-muted-foreground">Últimos 24 meses disponibles. Sólo registros canónicos validados; los registros en revisión no entran al promedio.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Mes</th><th className="px-4 py-3 text-right">Promedio</th><th className="px-4 py-3 text-right">Mínimo</th><th className="px-4 py-3 text-right">Máximo</th><th className="px-4 py-3 text-right">Registros</th><th className="px-4 py-3">Fuente</th></tr></thead><tbody className="divide-y">{recentGrades.map((row)=><tr key={row.month}><td className="whitespace-nowrap px-4 py-3 font-medium">{formatMonth(row.month)}</td><td className="px-4 py-3 text-right tabular-nums">{cu(row.avgHeadGradePct)}</td><td className="px-4 py-3 text-right tabular-nums">{cu(row.minHeadGradePct)}</td><td className="px-4 py-3 text-right tabular-nums">{cu(row.maxHeadGradePct)}</td><td className="px-4 py-3 text-right tabular-nums">{row.records}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.sourceFiles.slice(0,2).join(' · ')||'Producción canónica'}</td></tr>)}</tbody></table></div>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">Cobertura completa: {formatMonth(historyData?.headGradeSummary.lastDate||null)} hacia {formatMonth(historyData?.headGradeSummary.firstDate||null)} · {historyData?.headGradeSummary.validRecords||0} registros válidos · {historyData?.headGradeSummary.reviewRecords||0} en revisión.</div>
    </div>:null}

    <div className="rounded-md border p-4">
      <div className="flex items-center gap-2"><Drill className="h-4 w-4 text-muted-foreground"/><p className="font-medium">3. Histórico de sondajes · 2023–2026</p></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Último registro</p><p className="mt-1 font-medium">{formatDate(history?.max_date||null)}</p></div>
        <div><p className="text-xs text-muted-foreground">Desde</p><p className="mt-1 font-medium">{formatDate(history?.min_date||null)}</p></div>
        <div><p className="text-xs text-muted-foreground">Reportes</p><p className="mt-1 font-medium">{Number(history?.report_rows||0).toLocaleString('es-CL')}</p></div>
        <div><p className="text-xs text-muted-foreground">Metros reportados</p><p className="mt-1 font-medium">{num(history?.drilled_meters??null,' m')}</p></div>
      </div>
    </div>

    <div>
      <div className="mb-3"><p className="font-medium">4. Ensayes históricos · 2016–2017</p><p className="mt-1 text-xs text-muted-foreground">Se muestran después de la operación vigente porque son evidencia histórica más antigua. Dentro del bloque, la fecha más reciente siempre va primero.</p></div>
      {chemistryMines.length?<div className="grid gap-3 md:grid-cols-2">{chemistryMines.map((mine)=><div key={mine.id} className="rounded-md border p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-medium">{mine.name}</p><p className="mt-1 text-xs text-muted-foreground">Último {formatDate(mine.chemistry?.last_sample_date||null)} · desde {formatDate(mine.chemistry?.first_sample_date||null)}</p></div><p className="text-sm tabular-nums">{Number(mine.chemistry?.results||0)} resultados</p></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Cu promedio</p><p className="mt-1 font-medium">{cu(mine.chemistry?.avg_cu_pct??null)}</p></div><div><p className="text-xs text-muted-foreground">Mínimo</p><p className="mt-1 font-medium">{cu(mine.chemistry?.min_cu_pct??null)}</p></div><div><p className="text-xs text-muted-foreground">Máximo</p><p className="mt-1 font-medium">{cu(mine.chemistry?.max_cu_pct??null)}</p></div></div></div>)}</div>:null}

      {results.length?<div className="mt-3 overflow-hidden rounded-md border"><div className="border-b px-4 py-3"><div className="flex items-center gap-2"><Beaker className="h-4 w-4 text-muted-foreground"/><p className="font-medium">Ensayes · más reciente primero</p></div><p className="mt-1 text-xs text-muted-foreground">Último {formatDate(lastAssay)} · desde {formatDate(firstAssay)}. Un pozo aparece sólo cuando el dato histórico lo identifica explícitamente.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Muestra</th><th className="px-4 py-3">Mina</th><th className="px-4 py-3">Analito</th><th className="px-4 py-3 text-right">Resultado</th><th className="px-4 py-3">Método</th><th className="px-4 py-3">Fuente</th><th className="px-4 py-3">Vínculo pozo</th></tr></thead><tbody className="divide-y">{results.map((row)=><tr key={row.id}><td className="whitespace-nowrap px-4 py-3">{formatDate(row.sample_date||row.result_date)}</td><td className="px-4 py-3 font-medium">{row.sample_code||'—'}</td><td className="px-4 py-3">{row.mine_name||'Sin mina canónica'}</td><td className="px-4 py-3">{row.analyte_name||row.analyte_code||'—'}</td><td className="px-4 py-3 text-right tabular-nums">{cu(row.result_value,row.result_unit)}</td><td className="px-4 py-3">{row.method_code||'—'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.source_file||'—'}{row.source_sheet?` · ${row.source_sheet}`:''}</td><td className="px-4 py-3 text-xs text-muted-foreground">{row.drill_hole_id?'Vínculo explícito':'No asignado'}</td></tr>)}</tbody></table></div></div>:null}
    </div>

    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="rounded-md bg-muted/30 px-4 py-3 text-sm"><p className="font-medium">Regla temporal y de integración</p><p className="mt-1 text-muted-foreground">La lectura siempre prioriza el dato más reciente. La ley cabeza corresponde a operación de planta; los ensayes conservan muestra/mina real; el plan conserva mina/sector/actividad. {linkedToHole===0?'Los ensayes sin sondaje explícito no se adhieren a pozos por similitud o fecha.':`${linkedToHole} ensayes tienen vínculo explícito a sondaje.`}</p></div>
      <div className="text-sm text-muted-foreground lg:text-right"><p>Origen: La Patagua</p><p>Serie ley cabeza: {formatMonth(historyData?.headGradeSummary.lastDate||null)} → {formatMonth(historyData?.headGradeSummary.firstDate||null)}</p></div>
    </div>
  </section>;
}
