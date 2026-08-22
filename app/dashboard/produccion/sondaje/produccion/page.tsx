'use client';

import useSWR from 'swr';
import { Activity, AlertTriangle, Drill, Gauge, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductionSectionShell } from '@/components/production/production-section-shell';

type Payload = {
  summary: null | { report_rows:number; holes:number; rigs:number; operators:number; drilled_meters:number; out_of_service_reports:number; meter_capture_pct:number; min_date:string; max_date:string };
  monthly: Array<{ month:string; rig_name_raw:string; mine_name_raw:string; shift_code_raw:string; report_count:number; drilled_meters:number; out_of_service_reports:number }>;
  maintenance: { assets:Array<{id:string;asset_name:string}>; schedules:Array<{id:string;asset_id:string;task_name:string;current_meter_snapshot:number|null;next_due_meter:number|null;frequency_hours:number|null}>; overdueSchedules:number };
  plan: null | { plan_code:string; period_start:string; period_end:string; total_mineral_to_plant_tons:number; target_cu_grade_pct:number; planned_drilling_m:number; planned_advance_m:number };
  lineage: { drillingSource:string; maintenanceSource:string; planSource:string; note:string };
};

const fetcher = async (url:string):Promise<Payload> => { const response=await fetch(url,{credentials:'include'}); const data=await response.json(); if(!response.ok) throw new Error(data.error||'No fue posible cargar Sondaje'); return data; };
const fmt=(value:number|undefined|null,digits=0)=>value===null||value===undefined?'—':new Intl.NumberFormat('es-CL',{maximumFractionDigits:digits}).format(Number(value));

export default function SondajeProduccionPage() {
  const { data, error, isLoading } = useSWR('/api/produccion/sondaje', fetcher);
  const s=data?.summary;
  const assetsById=new Map((data?.maintenance.assets||[]).map((asset)=>[asset.id,asset.asset_name]));
  return (
    <ProductionSectionShell eyebrow="Producción · Sondaje" title="Sondaje de Producción" description="Ejecución histórica de sondajes, disponibilidad de equipos y plan mensual, con ACTUAL y PLAN separados.">
      {error ? <Card><CardContent className="pt-5 text-sm text-destructive">{error.message}</CardContent></Card> : null}
      <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Metros perforados',s?`${fmt(s.drilled_meters,2)} m`:'—',Drill],
          ['Reportes',s?fmt(s.report_rows):'—',Activity],
          ['Pozos',s?fmt(s.holes):'—',Gauge],
          ['Sondas',s?fmt(s.rigs):'—',Wrench],
          ['Fuera de servicio',s?fmt(s.out_of_service_reports):'—',AlertTriangle],
        ].map(([label,value,Icon])=><div key={String(label)} className="bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{label as string}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 text-2xl font-semibold tracking-tight">{isLoading?'—':value as string}</p></div>)}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Plan activo</CardTitle><CardDescription>Programa mensual separado de la ejecución real.</CardDescription></div><Badge variant="outline">PLAN</Badge></div></CardHeader><CardContent>{data?.plan?<div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground">Mineral a planta</p><p className="mt-1 font-medium">{fmt(data.plan.total_mineral_to_plant_tons)} t</p></div><div><p className="text-muted-foreground">Ley objetivo Cu</p><p className="mt-1 font-medium">{fmt(data.plan.target_cu_grade_pct,2)}%</p></div><div><p className="text-muted-foreground">Perforación programada</p><p className="mt-1 font-medium">{fmt(data.plan.planned_drilling_m)} m</p></div><div><p className="text-muted-foreground">Avance programado</p><p className="mt-1 font-medium">{fmt(data.plan.planned_advance_m)} m</p></div></div>:<p className="text-sm text-muted-foreground">Sin plan activo.</p>}</CardContent></Card>
        <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Mantención de sondas</CardTitle><CardDescription>Pautas preventivas por horómetro.</CardDescription></div><Badge variant={data?.maintenance.overdueSchedules?'destructive':'outline'}>{data?.maintenance.overdueSchedules||0} vencidas</Badge></div></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead>Equipo</TableHead><TableHead>Tarea</TableHead><TableHead className="text-right">Actual / próxima</TableHead></TableRow></TableHeader><TableBody>{(data?.maintenance.schedules||[]).slice(0,8).map((row)=><TableRow key={row.id}><TableCell>{assetsById.get(row.asset_id)||'Equipo'}</TableCell><TableCell>{row.task_name}</TableCell><TableCell className="text-right tabular-nums">{fmt(row.current_meter_snapshot)} / {fmt(row.next_due_meter)} h</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Actividad reciente por equipo</CardTitle><CardDescription>Agregación determinística desde la hoja BaseDatos; las etiquetas originales se conservan cuando la fuente no permite reconciliarlas.</CardDescription></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead>Mes</TableHead><TableHead>Sonda</TableHead><TableHead>Mina</TableHead><TableHead>Turno</TableHead><TableHead className="text-right">Reportes</TableHead><TableHead className="text-right">Metros</TableHead><TableHead className="text-right">Fuera servicio</TableHead></TableRow></TableHeader><TableBody>{(data?.monthly||[]).slice(0,30).map((row,index)=><TableRow key={`${row.month}-${row.rig_name_raw}-${row.shift_code_raw}-${index}`}><TableCell>{new Intl.DateTimeFormat('es-CL',{month:'short',year:'numeric'}).format(new Date(`${row.month}T12:00:00`))}</TableCell><TableCell className="font-medium">{row.rig_name_raw}</TableCell><TableCell>{row.mine_name_raw}</TableCell><TableCell>{row.shift_code_raw}</TableCell><TableCell className="text-right tabular-nums">{fmt(row.report_count)}</TableCell><TableCell className="text-right tabular-nums">{fmt(row.drilled_meters,2)}</TableCell><TableCell className="text-right tabular-nums">{fmt(row.out_of_service_reports)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

      <p className="text-xs text-muted-foreground">Fuente: {data?.lineage.drillingSource||'Reporte_Sondajes_I_A.xlsx'} · {data?.lineage.note||''}</p>
    </ProductionSectionShell>
  );
}
