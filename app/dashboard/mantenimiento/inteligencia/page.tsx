'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Gauge, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => { const r = await fetch(url, { credentials: 'include', cache: 'no-store' }); const j = await r.json().catch(() => null); if (!r.ok) throw new Error(j?.error || 'No fue posible cargar inteligencia'); return j; };

type Summary = { data: { total:number;completed:number;pending:number;in_progress:number;overdue:number;older_30d:number;completion_rate:number;avg_time_hours:number|null;critical_priority:number;missing_asset:number } };
type RiskRow = { assetId:string;assetCode:string|null;assetName:string;criticality:string|null;workOrders90d:number;openWorkOrders:number;highPriorityOpen:number;overdueOpen:number;observedRepairHours:number|null;attention:'high'|'watch'|'ok';evidence:string };
type Risk = { data: RiskRow[]; policy:string };
type Reliability = { summary:{equipmentWithCorrective:number;repeatedFailureEquipment:number;correctiveWorkOrders:number;repeatedRootCauses:number;repeatedComponents:number;cost:number}; reliability:Array<{assetId:string;assetCode:string|null;assetName:string;failures:number;openCorrective:number;totalDowntimeHours:number;observedMtbfHours:number|null}> };

export default function MaintenanceIntelligencePage(){
 const summary = useSWR<Summary>('/api/maintenance/analytics/summary', fetcher, { revalidateOnFocus:false });
 const risk = useSWR<Risk>('/api/maintenance/analytics/equipment-risk', fetcher, { revalidateOnFocus:false });
 const reliability = useSWR<Reliability>('/api/maintenance/reliability', fetcher, { revalidateOnFocus:false });
 const error = summary.error || risk.error || reliability.error;
 const loading = summary.isLoading || risk.isLoading || reliability.isLoading;
 const s = summary.data?.data;
 const high = (risk.data?.data || []).filter(r => r.attention === 'high');
 const recurrent = (reliability.data?.reliability || []).filter(r => r.failures >= 2);

 return <div className="space-y-6">
  <section className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Mantención · inteligencia operacional</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Decisiones de Mantención</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Prioriza trabajo real usando antigüedad, vencimiento, prioridad, recurrencia y evidencia registrada. No se calcula probabilidad de falla sin datos suficientes.</p></div><Button asChild variant="outline"><Link href="/dashboard/mantenimiento"><Wrench className="h-4 w-4"/>Órdenes de trabajo</Link></Button></section>

  {error ? <StatePanel tone="error" title="Inteligencia de Mantención no disponible" description={error.message}/> : null}
  <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5">
   {[
    ['OT abiertas', s ? s.total-s.completed : '—', Wrench],
    ['Alta / crítica', s?.critical_priority ?? '—', AlertTriangle],
    ['Vencidas', s?.overdue ?? '—', Clock3],
    ['> 30 días', s?.older_30d ?? '—', Clock3],
    ['Sin equipo', s?.missing_asset ?? '—', Gauge],
   ].map(([label,value,Icon]:any)=><div key={label} className="bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-2xl font-semibold">{loading?'—':value}</p></div>)}
  </section>

  <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Excepciones prioritarias</CardTitle><CardDescription>Equipos con OT abiertas de prioridad alta/crítica o múltiples órdenes vencidas.</CardDescription></div><Badge variant={high.length?'destructive':'outline'}>{high.length}</Badge></div></CardHeader><CardContent className="space-y-3">{loading?<StatePanel tone="loading" title="Evaluando presión operacional"/>:high.length===0?<div className="flex items-center gap-3 py-3"><CheckCircle2 className="h-5 w-5 text-muted-foreground"/><p className="text-sm">Sin equipos en condición prioritaria según las OT registradas.</p></div>:high.slice(0,10).map(row=><Link key={row.assetId} href={`/dashboard/mantenimiento/equipos/${row.assetId}`} className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/30"><AlertTriangle className="h-4 w-4 shrink-0"/><div className="min-w-0 flex-1"><p className="font-medium">{row.assetCode?`${row.assetCode} · `:''}{row.assetName}</p><p className="mt-1 text-xs text-muted-foreground">{row.evidence}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground"/></Link>)}</CardContent></Card>

  <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>Recurrencia observada</CardTitle><CardDescription>Dos o más OT correctivas para el mismo equipo.</CardDescription></CardHeader><CardContent className="space-y-3">{recurrent.length===0?<p className="text-sm text-muted-foreground">Sin recurrencias con evidencia suficiente.</p>:recurrent.slice(0,8).map(row=><Link key={row.assetId} href={`/dashboard/mantenimiento/equipos/${row.assetId}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30"><div><p className="text-sm font-medium">{row.assetCode?`${row.assetCode} · `:''}{row.assetName}</p><p className="mt-1 text-xs text-muted-foreground">{row.failures} correctivos · {row.openCorrective} abiertos</p></div><Badge variant="outline">{row.failures}</Badge></Link>)}</CardContent></Card><Card><CardHeader><CardTitle>Calidad de decisión</CardTitle><CardDescription>Qué puede y qué no puede concluir Motil con la información actual.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><p><strong>Puede:</strong> priorizar OT por edad, vencimiento, prioridad, recurrencia y estado registrado.</p><p><strong>Puede:</strong> cruzar observaciones de Sondaje con activos y OT mediante identificadores canónicos.</p><p><strong>No debe:</strong> declarar probabilidad de falla o MTBF/MTTR cuando no existe historial suficiente.</p><p className="text-muted-foreground">{risk.data?.policy}</p></CardContent></Card></div>
 </div>;
}
