'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Gauge, Plus, RefreshCw, ShieldAlert, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type ActionItem = { id:string; kind:string; priority:number; title:string; description:string; evidence:string; href:string };
type Response = {
  summary?: { openWorkOrders:number; overdueHourSchedules:number; operationallyBlocked:number; pendingPlanSteps:number; readyToClose:number; recurringReliabilityAssets:number; totalActions:number };
  actions?: ActionItem[];
};

const fetcher = async (url:string):Promise<Response> => {
  const response = await fetch(url,{ credentials:'include', cache:'no-store' });
  const payload = await response.json().catch(()=>null);
  if(!response.ok) throw new Error(payload?.error || 'No fue posible cargar el centro de mantenimiento.');
  return payload;
};

const kindCopy: Record<string,{label:string; icon:any; variant:'default'|'secondary'|'destructive'|'outline'}> = {
  preventive_overdue:{ label:'Preventivo vencido', icon:Clock3, variant:'destructive' },
  meter_review:{ label:'Horómetro', icon:Gauge, variant:'outline' },
  operational_blocker:{ label:'Bloqueo operacional', icon:ShieldAlert, variant:'destructive' },
  plan_step:{ label:'Procedimiento', icon:Wrench, variant:'default' },
  ready_to_close:{ label:'Listo para cierre', icon:CheckCircle2, variant:'secondary' },
  closure_evidence:{ label:'Evidencia de cierre', icon:AlertTriangle, variant:'outline' },
  reliability:{ label:'Confiabilidad', icon:AlertTriangle, variant:'outline' },
};

export default function MantenimientoPage(){
  const {data,error,isLoading,mutate}=useSWR<Response>('/api/maintenance/control-center',fetcher,{revalidateOnFocus:false});
  const summary=data?.summary;
  const actions=data?.actions || [];
  const metrics=[
    ['Preventivos vencidos',summary?.overdueHourSchedules ?? '—','/dashboard/mantenimiento/preventivo-horas'],
    ['OT abiertas',summary?.openWorkOrders ?? '—','/dashboard/mantenimiento/ordenes-trabajo'],
    ['Bloqueos operacionales',summary?.operationallyBlocked ?? '—','/dashboard/mantenimiento/ordenes-trabajo/cierre'],
    ['Pasos pendientes',summary?.pendingPlanSteps ?? '—','/dashboard/mantenimiento/ordenes-trabajo/cierre'],
    ['Listas para cerrar',summary?.readyToClose ?? '—','/dashboard/mantenimiento/ordenes-trabajo/cierre'],
    ['Recurrencias auditadas',summary?.recurringReliabilityAssets ?? '—','/dashboard/mantenimiento/confiabilidad'],
  ] as const;

  return <div className="space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Mantenimiento · Centro operacional</PageHeaderEyebrow>
        <PageHeaderTitle>Qué requiere acción ahora</PageHeaderTitle>
        <PageHeaderDescription>Una sola bandeja priorizada desde evidencia real de preventivos, OT, abastecimiento, ejecución, cierre y confiabilidad.</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions>
        <Button variant="outline" onClick={()=>void mutate()} disabled={isLoading}><RefreshCw className="h-4 w-4"/>Actualizar</Button>
        <Button asChild><Link href="/dashboard/mantenimiento/ordenes-trabajo/create"><Plus className="h-4 w-4"/>Crear orden</Link></Button>
      </PageHeaderActions>
    </PageHeader>

    <section aria-label="Estado de mantenimiento" className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-6">
      {metrics.map(([label,value,href])=><Link key={label} href={href} className="bg-card px-4 py-4 transition-colors hover:bg-muted/50"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{isLoading?'—':value}</p></Link>)}
    </section>

    {error?<StatePanel tone="error" title="No fue posible cargar el centro de mantenimiento" description={error.message} actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/>:null}

    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="text-base">Bandeja priorizada</CardTitle><CardDescription>Motil ordena primero vencimientos y bloqueos, luego ejecución, cierre y señales de confiabilidad.</CardDescription></div>{!isLoading&&!error?<Badge variant="outline">{actions.length} acciones</Badge>:null}</CardHeader>
      <CardContent>
        {isLoading?<StatePanel tone="loading" title="Calculando prioridades" className="min-h-64 border-0 bg-transparent"/>:!error&&actions.length===0?<StatePanel tone="neutral" title="No hay acciones pendientes" description="No existen vencimientos, bloqueos ni evidencias de cierre pendientes en las fuentes actuales." className="min-h-64 border-0 bg-transparent"/>:!error?<div className="divide-y rounded-lg border">{actions.map((action,index)=>{const meta=kindCopy[action.kind]||kindCopy.closure_evidence;const Icon=meta.icon;return <Link key={action.id} href={action.href} className="grid gap-3 p-4 transition-colors hover:bg-muted/40 md:grid-cols-[40px_1fr_auto] md:items-center"><div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background"><Icon className="h-4 w-4"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs tabular-nums text-muted-foreground">#{index+1}</span><Badge variant={meta.variant}>{meta.label}</Badge><p className="font-medium">{action.title}</p></div><p className="mt-1 text-sm text-muted-foreground">{action.description}</p><p className="mt-1 text-xs text-muted-foreground">Evidencia: {action.evidence}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground"/></Link>})}</div>:null}
      </CardContent>
    </Card>

    <div className="grid gap-3 md:grid-cols-4">
      <Button asChild variant="outline" className="justify-between"><Link href="/dashboard/mantenimiento/preventivo-horas">Preventivo por horas<ArrowRight className="h-4 w-4"/></Link></Button>
      <Button asChild variant="outline" className="justify-between"><Link href="/dashboard/mantenimiento/ordenes-trabajo/cierre">Cierre progresivo<ArrowRight className="h-4 w-4"/></Link></Button>
      <Button asChild variant="outline" className="justify-between"><Link href="/dashboard/mantenimiento/horometros">Horómetros<ArrowRight className="h-4 w-4"/></Link></Button>
      <Button asChild variant="outline" className="justify-between"><Link href="/dashboard/mantenimiento/confiabilidad">Confiabilidad<ArrowRight className="h-4 w-4"/></Link></Button>
    </div>
  </div>;
}
