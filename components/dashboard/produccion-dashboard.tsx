'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Activity, AlertTriangle, ArrowRight, Beaker, CheckCircle2, Drill, Factory, Gauge, PackageCheck, Target, Truck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';

type Overview = {
  counts: { materialMovements:number; plantShifts:number; metallurgyResults:number; concentrateShipments:number; drillingReports:number; drillingHoles:number };
  quality: { status:'PASS'|'HOLD'; pass:number; hold:number; sourceFiles:number; sourceSheets:number; supplementalRecords:number; sourceAnomalies:number; referenceOnly:number; exceptionsByDomain:Record<string,number> };
  freshness: { dataThrough:string|null; transportSourceThrough:string|null; drillingThrough:string|null };
  currentPeriod: null | {
    periodStart:string; dataThrough:string; elapsedDays:number; daysInMonth:number; calendarProgressPct:number;
    treatedTons:number; containedCuTons:number; recoveredFineCuTons:number; avgHeadGradePct:number|null; avgRecoveryPct:number|null; plantShifts:number; deterministicShifts:number;
    dispatch:{ shipmentRows:number; validShipmentRows:number; reviewShipmentRows:number; wetMetricTons:number };
    transportComparable:{ sourceThrough:string|null; transportedTons:number; treatedTons:number; deltaTons:number };
    plan:null|{ code:string; mineralToPlantTons:number; targetCuGradePct:number|null; plannedDrillingM:number; plannedAdvanceM:number; treatmentProgressPct:number|null; paceIndexPct:number|null; projectedTreatmentTons:number|null; projectedPlanPct:number|null; gradeDeltaPctPoints:number|null };
  };
  intelligence:Array<{level:'info'|'watch'|'alert';code:string;title:string;detail:string}>;
  semantics:{ planVsActual:string; concentrate:string; sourceAbsence:string };
};

const fetcher = async (url:string):Promise<Overview> => { const r=await fetch(url,{credentials:'include'}); const j=await r.json(); if(!r.ok) throw new Error(j.error||'No fue posible cargar Producción'); return j; };
const n=(v:number,d=0)=>v.toLocaleString('es-CL',{maximumFractionDigits:d});
const tons=(v:number,d=0)=>`${n(v,d)} t`;
const pct=(v:number|null|undefined,d=1)=>v===null||v===undefined?'—':`${n(v,d)}%`;
const date=(v:string|null|undefined)=>v?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(`${v}T12:00:00`)):'Sin dato';

const domains=[
  {href:'/dashboard/produccion/inteligencia',title:'Inteligencia',description:'Plan, Mina, Sector, Sondaje y contexto de Planta.'},
  {href:'/dashboard/produccion/transporte-mineral',title:'Transporte',description:'Movimientos mina → planta y cobertura de fuente.'},
  {href:'/dashboard/produccion/planta-metalurgia',title:'Planta / Metalurgia',description:'Tratamiento, ley, recuperación, fino y despachos.'},
  {href:'/dashboard/produccion/sondaje',title:'Sondaje',description:'400 pozos y linaje Mina → Sector → Pozo.'},
  {href:'/dashboard/produccion/quimica',title:'Química',description:'Siguiente capa para evidencia analítica por sector.'},
];

export function ProduccionDashboard(){
  const {data,error,isLoading,mutate}=useSWR<Overview>('/api/produccion/canonical-overview',fetcher);
  if(error) return <StatePanel tone="error" title="No fue posible cargar Producción" description={error.message} actions={<Button variant="outline" onClick={()=>void mutate()}>Reintentar</Button>}/>;
  if(isLoading||!data) return <StatePanel tone="neutral" title="Cargando Producción" description="Leyendo KPI desde la capa canónica."/>;

  const p=data.currentPeriod;
  const plan=p?.plan;
  const qualityOk=data.quality.status==='PASS';
  const pace=plan?.paceIndexPct ?? null;
  const paceLabel=pace===null?'—':pace>=97?'En ritmo':pace>=90?'Leve desvío':'Bajo ritmo';

  return <div className="space-y-6">
    <PageHeader>
      <PageHeaderContent>
        <PageHeaderEyebrow>Operaciones · fuente canónica</PageHeaderEyebrow>
        <PageHeaderTitle>Producción</PageHeaderTitle>
        <PageHeaderDescription>{p?`Agosto 2026 · Planta hasta ${date(p.dataThrough)}. Transporte sólo hasta ${date(data.freshness.transportSourceThrough)}.`:'Sin período operacional disponible.'}</PageHeaderDescription>
      </PageHeaderContent>
      <PageHeaderActions><Button asChild variant="outline"><Link href="/dashboard/produccion/ingreso-datos"><Upload className="h-4 w-4"/>Ingresar datos</Link></Button></PageHeaderActions>
    </PageHeader>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-6">
      <Metric icon={Factory} label="Tratado" value={p?tons(p.treatedTons,1):'—'} detail={plan?`${pct(plan.treatmentProgressPct)} del plan de mineral a planta`:'Sin plan activo'}/>
      <Metric icon={Target} label="Ritmo mensual" value={paceLabel} detail={plan?`Índice ${pct(plan.paceIndexPct)} · calendario ${pct(p?.calendarProgressPct)}`:'Sin comparación'}/>
      <Metric icon={Gauge} label="Ley cabeza Cu" value={pct(p?.avgHeadGradePct,3)} detail={plan?.targetCuGradePct!=null?`Objetivo ${pct(plan.targetCuGradePct,2)}`:'Sin objetivo'}/>
      <Metric icon={Activity} label="Recuperación" value={pct(p?.avgRecoveryPct,2)} detail={p?`${p.deterministicShifts}/${p.plantShifts} turnos determinísticos`:'—'}/>
      <Metric icon={Beaker} label="Cu fino recuperado" value={p?tons(p.recoveredFineCuTons,3):'—'} detail={p?`${tons(p.containedCuTons,3)} Cu contenido`:'—'}/>
      <Metric icon={PackageCheck} label="Concentrado despachado" value={p?tons(p.dispatch.wetMetricTons,2):'—'} detail={p?`${p.dispatch.validShipmentRows} válidos · ${p.dispatch.reviewShipmentRows} revisión`:'—'}/>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4"><div className="flex items-center justify-between gap-4"><div><h2 className="font-medium">Plan vs ejecución</h2><p className="mt-1 text-xs text-muted-foreground">Comparación operacional usando tratamiento de Planta. Transporte conserva su propia ventana de fuente.</p></div>{plan?<span className="text-xs text-muted-foreground">{plan.code}</span>:null}</div></div>
        <div className="grid gap-px bg-border md:grid-cols-4">
          <Mini label="Plan mineral a planta" value={plan?tons(plan.mineralToPlantTons):'—'} detail="Mes completo"/>
          <Mini label="Tratado acumulado" value={p?tons(p.treatedTons,1):'—'} detail={plan?`${pct(plan.treatmentProgressPct)} ejecutado`:'—'}/>
          <Mini label="Proyección simple" value={plan?.projectedTreatmentTons!=null?tons(plan.projectedTreatmentTons,0):'—'} detail={plan?.projectedPlanPct!=null?`${pct(plan.projectedPlanPct)} del plan`:'—'}/>
          <Mini label="Avance calendario" value={p?pct(p.calendarProgressPct):'—'} detail={p?`${p.elapsedDays}/${p.daysInMonth} días`:'—'}/>
        </div>
        {p&&plan?<div className="px-5 py-4"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground" style={{width:`${Math.min(100,Math.max(0,plan.treatmentProgressPct||0))}%`}}/></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>0%</span><span>Tratamiento {pct(plan.treatmentProgressPct)}</span><span>100%</span></div></div>:null}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-medium">Calidad de datos</h2><p className="mt-1 text-xs text-muted-foreground">Gate maestro de Producción.</p></div>
        <div className="px-5 py-5"><div className="flex items-center gap-3">{qualityOk?<CheckCircle2 className="h-5 w-5"/>:<AlertTriangle className="h-5 w-5"/>}<div><p className="text-lg font-semibold">{data.quality.pass} PASS · {data.quality.hold} HOLD</p><p className="text-xs text-muted-foreground">{data.quality.sourceFiles}/7 archivos · {data.quality.sourceSheets}/172 hojas</p></div></div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center"><Small value={data.quality.supplementalRecords} label="Complementarios"/><Small value={data.quality.sourceAnomalies} label="Anomalías fuente"/><Small value={data.quality.referenceOnly} label="Referencia"/></div>
        </div>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-medium">Cobertura de transporte</h2><p className="mt-1 text-xs text-muted-foreground">Comparación sólo donde TM existe.</p></div>
        <div className="grid gap-px bg-border sm:grid-cols-3"><Mini label="Transportado" value={p?tons(p.transportComparable.transportedTons,1):'—'} detail={`Hasta ${date(p?.transportComparable.sourceThrough)}`}/><Mini label="Tratado comparable" value={p?tons(p.transportComparable.treatedTons,1):'—'} detail="Misma ventana"/><Mini label="Brecha comparable" value={p?tons(p.transportComparable.deltaTons,1):'—'} detail="No equivale a pérdida"/></div>
        <p className="px-5 py-4 text-xs text-muted-foreground">{data.semantics.sourceAbsence}</p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4"><h2 className="font-medium">Inteligencia operacional</h2><p className="mt-1 text-xs text-muted-foreground">Señales determinísticas; no son predicciones de ML.</p></div>
        <div className="divide-y">{data.intelligence.length?data.intelligence.map(signal=><div key={signal.code} className="flex gap-3 px-5 py-4"><SignalIcon level={signal.level}/><div><p className="text-sm font-medium">{signal.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.detail}</p></div></div>):<div className="px-5 py-5 text-sm text-muted-foreground">Sin señales para el período.</div>}</div>
      </div>
    </section>

    <section className="divide-y rounded-lg border bg-card">{domains.map(domain=><Link key={domain.href} href={domain.href} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/30"><div><p className="font-medium">{domain.title}</p><p className="mt-1 text-sm text-muted-foreground">{domain.description}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground"/></Link>)}</section>

    <section className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-5">
      <Mini label="Movimientos" value={n(data.counts.materialMovements)} detail="Histórico"/>
      <Mini label="Turnos Planta" value={n(data.counts.plantShifts)} detail="Histórico"/>
      <Mini label="Metalurgia" value={n(data.counts.metallurgyResults)} detail="Resultados"/>
      <Mini label="Sondajes" value={n(data.counts.drillingReports)} detail={`${n(data.counts.drillingHoles)} pozos`}/>
      <Mini label="Despachos" value={n(data.counts.concentrateShipments)} detail="Histórico"/>
    </section>

    <div className="rounded-lg border bg-card px-5 py-4 text-xs leading-5 text-muted-foreground"><strong className="font-medium text-foreground">Semántica:</strong> {data.semantics.planVsActual} {data.semantics.concentrate}</div>
  </div>;
}

function Metric({icon:Icon,label,value,detail}:{icon:any;label:string;value:string;detail:string}){return <div className="bg-card px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground"/></div><p className="mt-2 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>}
function Mini({label,value,detail}:{label:string;value:string;detail:string}){return <div className="bg-card px-4 py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>}
function Small({value,label}:{value:number;label:string}){return <div><p className="text-lg font-semibold">{n(value)}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>}
function SignalIcon({level}:{level:'info'|'watch'|'alert'}){return level==='info'?<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>:<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>}
