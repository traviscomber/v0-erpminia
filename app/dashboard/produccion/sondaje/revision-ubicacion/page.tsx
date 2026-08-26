'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ArrowLeft, CheckCircle2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductionSectionShell } from '@/components/production/production-section-shell';

type Row={drill_hole_id:string;hole_code:string;report_count:number;last_report_date:string|null;candidate_mine_name:string|null;source_site:string|null;source_sites?:string[]|null;review_lane:string;operational_bucket?:string;operational_priority?:number;recommended_action:string};
type Sector={id:string;name:string;mine_source_id:string;production_mine_sources:{name:string}|Array<{name:string}>|null};
type Payload={locationReview:{summary:{total:number;sourceConflicts:number;activeAugust:number;recentJuly:number;historical:number};rows:Row[];sectors:Sector[]}};
const fetcher=async(url:string):Promise<Payload>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'No fue posible cargar la revisión');return d;};
const mineName=(s:Sector)=>Array.isArray(s.production_mine_sources)?s.production_mine_sources[0]?.name:s.production_mine_sources?.name;
const dateLabel=(v:string|null)=>v?new Intl.DateTimeFormat('es-CL').format(new Date(`${v}T12:00:00`)):'—';

export default function DrillLocationReviewPage(){
 const {data,error,isLoading,mutate}=useSWR<Payload>('/api/produccion/sondaje',fetcher);
 const [selected,setSelected]=useState<Record<string,string>>({});
 const [saving,setSaving]=useState<string|null>(null);
 const [message,setMessage]=useState<string|null>(null);
 const rows=useMemo(()=>data?.locationReview.rows||[],[data]);
 const sectors=data?.locationReview.sectors||[];
 const active=rows.filter(r=>r.review_lane==='conflicto_fuente'||r.operational_bucket==='activo_agosto'||r.operational_bucket==='reciente_julio');
 const reviewRows=active.length?active:rows.slice(0,30);

 async function resolve(row:Row){
  const mineSectorId=selected[row.drill_hole_id];
  if(!mineSectorId)return;
  setSaving(row.drill_hole_id);setMessage(null);
  try{
   const response=await fetch('/api/produccion/sondaje',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({drillHoleId:row.drill_hole_id,mineSectorId,notes:`Confirmación manual desde cola priorizada. Lane: ${row.review_lane}.`})});
   const payload=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(payload?.error||'No fue posible confirmar la ubicación');
   setMessage(`${row.hole_code} quedó confirmado y salió de la cola.`);
   setSelected(prev=>{const next={...prev};delete next[row.drill_hole_id];return next;});
   await mutate();
  }catch(e){setMessage(e instanceof Error?e.message:'No fue posible confirmar la ubicación');}
  finally{setSaving(null);}
 }

 return <ProductionSectionShell eyebrow="Producción · Sondaje" title="Revisión de ubicación" description="Confirma únicamente sectores respaldados por revisión humana. La fuente original y su trazabilidad permanecen intactas." capabilities={['Conflictos de fuente primero','Pozos activos antes que históricos','Mina acreditada filtra sectores','Evidencia manual verificada','Promoción canónica trazable']}>
  <div className="flex items-center justify-between gap-3"><Button asChild variant="outline"><Link href="/dashboard/produccion/sondaje/produccion"><ArrowLeft className="h-4 w-4"/>Volver a Sondaje</Link></Button>{message?<p className="text-sm text-muted-foreground">{message}</p>:null}</div>
  {error?<Card><CardContent className="pt-5 text-sm text-destructive">{error.message}</CardContent></Card>:null}
  <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4"><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Conflictos</p><p className="mt-1 text-2xl font-semibold">{data?.locationReview.summary.sourceConflicts??'—'}</p></div><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Activos agosto</p><p className="mt-1 text-2xl font-semibold">{data?.locationReview.summary.activeAugust??'—'}</p></div><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Recientes julio</p><p className="mt-1 text-2xl font-semibold">{data?.locationReview.summary.recentJuly??'—'}</p></div><div className="bg-card p-4"><p className="text-xs text-muted-foreground">Total cola</p><p className="mt-1 text-2xl font-semibold">{data?.locationReview.summary.total??'—'}</p></div></section>
  <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4"/>Casos que requieren decisión</CardTitle><CardDescription>Selecciona un sector sólo cuando la evidencia operacional o documental lo confirme. No se propone sector automáticamente.</CardDescription></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead>Pozo</TableHead><TableHead>Evidencia</TableHead><TableHead>Último reporte</TableHead><TableHead>Sector confirmado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>{isLoading?<TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Cargando revisión…</TableCell></TableRow>:reviewRows.map(row=>{const allowed=sectors.filter(s=>row.candidate_mine_name?mineName(s)===row.candidate_mine_name:true);return <TableRow key={row.drill_hole_id}><TableCell><p className="font-medium">{row.hole_code}</p><Badge variant={row.review_lane==='conflicto_fuente'?'destructive':'outline'} className="mt-1">{row.review_lane==='conflicto_fuente'?'Conflicto':row.operational_bucket==='activo_agosto'?'Activo agosto':'Reciente'}</Badge></TableCell><TableCell><p className="text-sm">{row.review_lane==='conflicto_fuente'&&row.source_sites?.length?row.source_sites.join(' ↔ '):(row.candidate_mine_name||row.source_site||'Sin mina acreditada')}</p><p className="mt-1 max-w-sm text-xs text-muted-foreground">{row.recommended_action}</p></TableCell><TableCell>{dateLabel(row.last_report_date)}</TableCell><TableCell><select className="h-9 min-w-56 rounded-md border bg-background px-3 text-sm" value={selected[row.drill_hole_id]||''} onChange={e=>setSelected(prev=>({...prev,[row.drill_hole_id]:e.target.value}))}><option value="">Seleccionar sector…</option>{allowed.map(s=><option key={s.id} value={s.id}>{mineName(s)} · {s.name}</option>)}</select></TableCell><TableCell className="text-right"><Button size="sm" disabled={!selected[row.drill_hole_id]||saving===row.drill_hole_id} onClick={()=>resolve(row)}><CheckCircle2 className="h-4 w-4"/>{saving===row.drill_hole_id?'Guardando…':'Confirmar'}</Button></TableCell></TableRow>})}</TableBody></Table></CardContent></Card>
 </ProductionSectionShell>;
}
