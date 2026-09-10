'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Gauge, Plus, RefreshCw, ShieldAlert, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type ActionItem = { id:string; kind:string; priority:number; title:string; description:string; evidence:string; href:string; assetHref?:string|null };
type Response = {
  summary?: { openWorkOrders:number; overdueHourSchedules:number; unplannedOverdueHourSchedules:number; unplannedOverdueInterventionGroups:number; plannedOverdueHourSchedules:number; pendingOperationalReviews:number; outOfServiceOperationalReviews:number; operationallyBlocked:number; pendingPlanSteps:number; readyToClose:number; recurringReliabilityAssets:number; totalActions:number };
  actions?: ActionItem[];
};
type ViewerContext = { mode?:'leadership'|'planning'|'execution'|'general'; cargoName?:string|null; canEdit?:boolean };

const fetcher = async <T,>(url:string):Promise<T> => {
  const response = await fetch(url,{ credentials:'include', cache:'no-store' });
  const payload = await response.json().catch(()=>null);
  if(!response.ok) throw new Error(payload?.error || 'No fue posible cargar mantenimiento.');
  return payload as T;
};

const kindCopy: Record<string,{label:string; icon:any; variant:'default'|'secondary'|'destructive'|'outline'}> = {
  operational_review:{ label:'Revisión operacional', icon:AlertTriangle, variant:'destructive' },
  preventive_overdue:{ label:'Preventivo vencido', icon:Clock3, variant:'destructive' },
  meter_review:{ label:'Horómetro', icon:Gauge, variant:'outline' },
  operational_blocker:{ label:'Bloqueo operacional', icon:ShieldAlert, variant:'destructive' },
  plan_step:{ label:'Procedimiento', icon:Wrench, variant:'default' },
  ready_to_close:{ label:'Listo para cierre', icon:CheckCircle2, variant:'secondary' },
  closure_evidence:{ label:'Evidencia de cierre', icon:AlertTriangle, variant:'outline' },
  reliability:{ label:'Confiabilidad', icon:AlertTriangle, variant:'outline' },
};

const maintenanceFlow = [
  { step:'01', label:'Planificar', detail:'Vencimientos, criticidad y prioridad', href:'/dashboard/planificacion' },
  { step:'02', label:'Preparar', detail:'Repuestos disponibles y brechas de compra', href:'/dashboard/bodega' },
  { step:'03', label:'Ejecutar', detail:'Orden de trabajo y evidencia real', href:'/dashboard/mantenimiento/ordenes-trabajo' },
  { step:'04', label:'Validar', detail:'Cierre supervisado y trazabilidad', href:'/dashboard/mantenimiento/ordenes-trabajo/cierre' },
  { step:'05', label:'Aprender', detail:'Historial, confiabilidad y próxima acción', href:'/dashboard/mantenimiento/decision-intelligence' },
] as const;

const executionKinds = new Set(['operational_blocker','plan_step','closure_evidence']);

export default function MantenimientoPage(){
  const {data,error,isLoading,mutate}=useSWR<Response>('/api/maintenance/control-center',(url)=>fetcher<Response>(url),{revalidateOnFocus:false});
  const {data:viewer}=useSWR<ViewerContext>('/api/maintenance/viewer-context',(url)=>fetcher<ViewerContext>(url),{revalidateOnFocus:false});
  const summary=data?.summary;
  const mode=viewer?.mode || 'general';
  const rawActions=data?.actions || [];
  const actions=mode==='execution' ? rawActions.filter((action)=>executionKinds.has(action.kind)) : rawActions;
  const preventiveGroupDetail = summary?.unplannedOverdueInterventionGroups != null
    ? `${summary.unplannedOverdueInterventionGroups} intervención(es)`
    : 'Por planificar';
  const metrics = mode==='execution' ? [
    ['OT abiertas',summary?.openWorkOrders ?? '—','Cola operacional','/dashboard/mantenimiento/ordenes-trabajo'],
    ['Pasos pendientes',summary?.pendingPlanSteps ?? '—','Procedimientos por ejecutar','/dashboard/mantenimiento/ordenes-trabajo'],
    ['Bloqueos',summary?.operationallyBlocked ?? '—','Requieren resolución','/dashboard/mantenimiento/ordenes-trabajo'],
    ['Listas para validar',summary?.readyToClose ?? '—','Entrega a supervisión','/dashboard/mantenimiento/ordenes-trabajo/cierre'],
  ] as const : [
    ['Fuera de servicio',summary?.outOfServiceOperationalReviews ?? '—','Revisión humana pendiente','/dashboard/mantenimiento/ordenes-trabajo/create'],
    ['Preventivos pendientes',summary?.unplannedOverdueHourSchedules ?? '—',preventiveGroupDetail,'/dashboard/mantenimiento/preventivo-horas'],
    ['OT abiertas',summary?.openWorkOrders ?? '—','Trabajo en curso','/dashboard/mantenimiento/ordenes-trabajo'],
    ['Listas para cerrar',summary?.readyToClose ?? '—','Evidencia completa','/dashboard/mantenimiento/ordenes-trabajo/cierre'],
  ] as const;
  const pageTitle = mode==='execution' ? 'Trabajo que requiere ejecución' : mode==='leadership' ? 'Estado y decisiones de mantenimiento' : 'Qué requiere acción ahora';
  const pageDescription = mode==='execution'
    ? 'Una cola operativa del equipo: procedimientos, bloqueos y evidencia pendiente. La asignación personal se muestra sólo cuando existe en la OT canónica.'
    : mode==='leadership'
      ? 'Disponibilidad, trabajo pendiente, bloqueos y cierre en una sola vista para priorizar y destrabar al equipo.'
      : 'Una bandeja priorizada desde señales de terreno, preventivos, órdenes de trabajo, cierre y confiabilidad.';
  const visibleFlow = mode==='execution' ? maintenanceFlow.slice(2,4) : maintenanceFlow;

  return <div className="mx-auto w-full max-w-[1600px] space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Mantenimiento · {viewer?.cargoName || 'Centro operacional'}</PageHeaderEyebrow>
        <PageHeaderTitle>{pageTitle}</PageHeaderTitle>
        <PageHeaderDescription>{pageDescription}</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions>
        <Button variant="outline" onClick={()=>void mutate()} disabled={isLoading}><RefreshCw className="h-4 w-4"/>Actualizar</Button>
        {mode==='execution'?<Button asChild><Link href="/dashboard/mantenimiento/ordenes-trabajo"><Wrench className="h-4 w-4"/>Ver órdenes</Link></Button>:<Button asChild><Link href="/dashboard/mantenimiento/ordenes-trabajo/create"><Plus className="h-4 w-4"/>Crear orden</Link></Button>}
      </PageHeaderActions>
    </PageHeader>

    <section aria-label="Estado de mantenimiento" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label,value,detail,href])=><Link key={label} href={href} className="rounded-lg border bg-card px-4 py-4 shadow-none outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tracking-tight">{isLoading?'—':value}</p><p className="text-right text-xs text-muted-foreground">{detail}</p></div></Link>)}
    </section>

    <section aria-labelledby="maintenance-flow-title" className="border-y border-border py-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Flujo operacional</p>
          <h2 id="maintenance-flow-title" className="text-lg font-semibold">Planificar → Preparar → Ejecutar → Validar → Aprender</h2>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">{mode==='execution'?'Tu foco está en ejecutar y dejar evidencia suficiente para que la supervisión pueda validar.': 'Cada etapa usa su fuente canónica. Bodega y Compras preparan recursos; Mantenimiento conserva la ejecución y el cierre.'}</p>
      </div>
      <div className={`grid divide-y border border-border bg-card ${mode==='execution'?'md:grid-cols-2':'md:grid-cols-5'} md:divide-x md:divide-y-0`}>
        {visibleFlow.map((item)=><Link key={item.step} href={item.href} className="group min-w-0 px-4 py-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <div className="flex items-center justify-between gap-3"><span className="text-xs tabular-nums text-muted-foreground">{item.step}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"/></div>
          <p className="mt-3 font-medium">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
        </Link>)}
      </div>
      {mode!=='execution'?<div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span>Producción aporta uso y señales</span><span>·</span><span>Bodega confirma stock</span><span>·</span><Link className="hover:text-foreground" href="/dashboard/compras">Compras cubre brechas</Link><span>·</span><span>Finanzas consume costos reales</span>
      </div>:null}
    </section>

    {!isLoading&&!error&&Number(summary?.outOfServiceOperationalReviews || 0)>0&&mode!=='execution'?<StatePanel tone="warning" title={`${summary?.outOfServiceOperationalReviews} equipo(s) fuera de servicio requieren revisión humana`} description="La observación de terreno permanece como evidencia. MOTIL no crea una OT automáticamente ni convierte esta señal en causa raíz." className="min-h-0 py-5"/>:null}

    {error?<StatePanel tone="error" title="No fue posible cargar el centro de mantenimiento" description={error.message} actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>} className="min-h-0 py-5"/>:null}

    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="text-lg">{mode==='execution'?'Cola de ejecución':'Bandeja priorizada'}</CardTitle><CardDescription>{mode==='execution'?'Sólo procedimientos, bloqueos y evidencia que requieren trabajo del equipo de mantenimiento.':'La prioridad deriva de evidencia operacional, vencimientos, bloqueos y readiness de cierre. No representa probabilidad de falla.'}</CardDescription></div>{!isLoading&&!error?<Badge variant="outline">{actions.length} acciones</Badge>:null}</CardHeader>
      <CardContent>
        {isLoading?<StatePanel tone="loading" title="Calculando prioridades" className="min-h-64 border-0 bg-transparent"/>:!error&&actions.length===0?<StatePanel tone="neutral" title="No hay acciones pendientes" description={mode==='execution'?'No existen procedimientos, bloqueos ni evidencias pendientes en la cola operativa actual.':'No existen revisiones de terreno, vencimientos, bloqueos ni evidencias de cierre pendientes en las fuentes actuales.'} className="min-h-64 border-0 bg-transparent"/>:!error?<div className="divide-y rounded-lg border">{actions.map((action,index)=>{const meta=kindCopy[action.kind]||kindCopy.closure_evidence;const Icon=meta.icon;return <div key={action.id} className="grid gap-3 p-4 md:grid-cols-[40px_1fr_auto] md:items-center"><div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background"><Icon className="h-4 w-4"/></div><Link href={action.href} className="min-w-0 rounded-sm outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"><div className="flex flex-wrap items-center gap-2"><span className="text-xs tabular-nums text-muted-foreground">#{index+1}</span><Badge variant={meta.variant}>{meta.label}</Badge><p className="font-medium">{action.title}</p></div><p className="mt-1 text-sm text-muted-foreground">{action.description}</p><p className="mt-1 text-xs text-muted-foreground">Evidencia: {action.evidence}</p></Link><Button asChild variant="ghost" size="icon-sm" aria-label="Abrir acción"><Link href={action.href}><ArrowRight className="h-4 w-4"/></Link></Button></div>})}</div>:null}
      </CardContent>
    </Card>

    <div className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm text-muted-foreground" aria-label="Vistas relacionadas">
      {mode==='execution'?<>
        <Link className="hover:text-foreground" href="/dashboard/mantenimiento/ordenes-trabajo">Órdenes de trabajo</Link>
        <Link className="hover:text-foreground" href="/dashboard/mantenimiento/horometros">Horómetros</Link>
      </>:<>
        <Link className="hover:text-foreground" href="/dashboard/mantenimiento/data-readiness">Calidad de datos</Link>
        <Link className="hover:text-foreground" href="/dashboard/mantenimiento/decision-intelligence">Decision Intelligence</Link>
        <Link className="hover:text-foreground" href="/dashboard/mantenimiento/preventivo-horas">Preventivo por horas</Link>
        <Link className="hover:text-foreground" href="/dashboard/mantenimiento/confiabilidad">Confiabilidad</Link>
        <Link className="hover:text-foreground" href="/dashboard/mantenimiento/horometros">Horómetros</Link>
      </>}
    </div>
  </div>;
}
