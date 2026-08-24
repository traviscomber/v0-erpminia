'use client';

import useSWR from 'swr';
import { StatePanel } from '@/components/ui/state-panel';
import { PersonalPortalView, type PersonalPortalData, type PortalSignal } from '@/components/executive/personal-portal-view';

type Daily={operation_date:string;treated_wet_t:number|null;recovered_fine_cu_t:number|null;transported_t:number|null;dispatched_concentrate_t:number|null};
type Signal={level:'info'|'watch'|'alert';code:string;title:string;detail:string};
type O={quality:{status:'PASS'|'HOLD';pass:number;hold:number};currentPeriod:null|{treatedTons:number;avgHeadGradePct:number|null;avgRecoveryPct:number|null;plan:null|{treatmentProgressPct:number|null;paceIndexPct:number|null;gradeDeltaPctPoints?:number|null}};intelligence:Signal[];areaPriorities?:Signal[];daily?:Daily[]};

const fetcher=async(url:string):Promise<O>=>{const r=await fetch(url,{credentials:'include',cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'No fue posible cargar la vista ejecutiva');return j};
const pct=(v:number|null|undefined,d=1)=>v==null?'—':`${v.toLocaleString('es-CL',{maximumFractionDigits:d})}%`;
const num=(v:number|null|undefined,d=1)=>Number(v||0).toLocaleString('es-CL',{maximumFractionDigits:d});
const deltaPct=(current:number,previous:number)=>previous!==0?((current-previous)/Math.abs(previous))*100:null;

export default function MiOperacionPage(){
  const {data,error,isLoading}=useSWR<O>('/api/mi-operacion',fetcher,{revalidateOnFocus:false});
  if(isLoading)return <StatePanel tone="loading" title="Cargando Mi operación" description="Leyendo producción y prioridades de jefaturas desde la capa canónica."/>;
  if(error)return <StatePanel tone="error" title="Vista no disponible" description={error.message}/>;
  if(!data)return null;

  const current=data.currentPeriod;
  const plan=current?.plan;
  const alerts=data.intelligence.filter(s=>s.level==='alert');
  const watches=data.intelligence.filter(s=>s.level==='watch');
  const areaPriorities=data.areaPriorities||[];
  const qualityHold=data.quality.status==='HOLD';
  const pace=plan?.paceIndexPct??null;
  const days=(data.daily||[]).filter(row=>row.operation_date).slice(-2);
  const previous=days.length===2?days[0]:null;
  const latest=days.length===2?days[1]:days[0]||null;
  const changes=latest&&previous?[
    {label:'Tratamiento diario',current:Number(latest.treated_wet_t||0),previous:Number(previous.treated_wet_t||0),unit:'t'},
    {label:'Cu fino recuperado',current:Number(latest.recovered_fine_cu_t||0),previous:Number(previous.recovered_fine_cu_t||0),unit:'t'},
    {label:'Transporte acreditado',current:Number(latest.transported_t||0),previous:Number(previous.transported_t||0),unit:'t'},
    {label:'Concentrado despachado',current:Number(latest.dispatched_concentrate_t||0),previous:Number(previous.dispatched_concentrate_t||0),unit:'t'},
  ]:[];

  const interpretation:PortalSignal[]=[];
  if(plan?.paceIndexPct!=null){
    interpretation.push(plan.paceIndexPct<90?{level:'alert',title:'El ritmo mensual requiere atención',detail:`Índice de ritmo ${pct(plan.paceIndexPct)}. El tratamiento acumulado está por debajo del calendario.`}:plan.paceIndexPct<97?{level:'watch',title:'El ritmo está levemente bajo calendario',detail:`Índice de ritmo ${pct(plan.paceIndexPct)}. Conviene vigilar los próximos cortes.`}:{level:'info',title:'El tratamiento mantiene el ritmo del mes',detail:`Índice de ritmo ${pct(plan.paceIndexPct)}. El avance está alineado con el calendario.`});
  }
  if(plan?.gradeDeltaPctPoints!=null){
    interpretation.push(plan.gradeDeltaPctPoints<-0.08?{level:'alert',title:'La ley de cabeza está materialmente bajo objetivo',detail:`Brecha de ${num(Math.abs(plan.gradeDeltaPctPoints),3)} pp bajo el objetivo activo.`}:plan.gradeDeltaPctPoints<0?{level:'watch',title:'La ley de cabeza está bajo objetivo',detail:`Brecha de ${num(Math.abs(plan.gradeDeltaPctPoints),3)} pp bajo el objetivo.`}:{level:'info',title:'La ley de cabeza está en o sobre objetivo',detail:`La ley se mantiene ${num(plan.gradeDeltaPctPoints,3)} pp sobre el objetivo.`});
  }
  if(latest&&previous){
    const variation=deltaPct(Number(latest.treated_wet_t||0),Number(previous.treated_wet_t||0));
    if(variation!=null&&Math.abs(variation)>=10)interpretation.push({level:'watch',title:`El último corte ${variation<0?'redujo':'aumentó'} el tratamiento diario`,detail:`Cambio ${variation>0?'+':''}${num(variation)}% frente al corte anterior. Es una variación operacional, no una causa inferida.`});
  }
  if(qualityHold)interpretation.push({level:'watch',title:'Parte de la evidencia sigue en HOLD',detail:`Hay ${data.quality.hold} chequeo(s) pendientes. Los vacíos no se completan como cero.`});

  const globalSignals=[...alerts,...areaPriorities,...watches].slice(0,5);
  const globalHasAlert=globalSignals.some((signal)=>signal.level==='alert');
  const globalHasWatch=globalSignals.some((signal)=>signal.level==='watch');

  const portalData:PersonalPortalData={
    portal:{label:'Mi operación',title:'Estado de la mina',areaPath:'/dashboard/produccion',actionLabel:'Abrir producción',key:'operation'},
    user:{name:'Pedro Pablo Zegers',role:'gerente_operaciones',cargo:'GERENTE OPERACIONES'},
    status:globalHasAlert||qualityHold?'attention':globalHasWatch?'watch':'stable',
    metrics:[
      {label:'Tratado',value:current?`${current.treatedTons.toLocaleString('es-CL',{maximumFractionDigits:1})} t`:'—'},
      {label:'Ritmo',value:pace==null?'—':pace>=97?'En ritmo':pace>=90?'Leve desvío':'Bajo ritmo'},
      {label:'Avance plan',value:pct(plan?.treatmentProgressPct)},
      {label:'Ley cabeza Cu',value:pct(current?.avgHeadGradePct,3)},
      {label:'Recuperación',value:pct(current?.avgRecoveryPct,2)},
      {label:'Calidad',value:`${data.quality.pass} PASS · ${data.quality.hold} HOLD`},
    ],
    signals:globalSignals,
    interpretation:interpretation.slice(0,4),
    change:{available:changes.length>0,note:changes.length?'Comparación contra el corte operacional inmediatamente anterior.':'Aún no hay dos cortes operacionales comparables.',items:changes},
    source:'production_flow_daily_fidelity_v1 + production_metallurgy_deterministic_v2 + production_monthly_plans + snapshots de jefaturas',
  };

  return <PersonalPortalView data={portalData} eyebrow="Mi operación" description="Centro de control personal de Operaciones. Resume el estado de la mina y las excepciones relevantes de las jefaturas, sin evaluar personas ni reemplazar el detalle operacional."/>;
}
