export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type TrendState='improving'|'declining'|'stable'|'insufficient';
type DailyPoint={date:string;value:number};

const num=(v:unknown)=>Number(v||0);
const avg=(rows:DailyPoint[])=>rows.length?rows.reduce((s,r)=>s+r.value,0)/rows.length:null;

function trend(points:DailyPoint[], absoluteThreshold:number, relative=false){
  const ordered=[...points].sort((a,b)=>a.date.localeCompare(b.date));
  if(ordered.length<6) return {state:'insufficient' as TrendState,recent:null,prior:null,delta:null,deltaPct:null,points:ordered};
  const recentRows=ordered.slice(-3);
  const priorRows=ordered.slice(-6,-3);
  const recent=avg(recentRows)!;
  const prior=avg(priorRows)!;
  const delta=recent-prior;
  const deltaPct=prior!==0?(delta/prior)*100:null;
  const metric=relative?Math.abs(deltaPct||0):Math.abs(delta);
  const state:TrendState=metric<absoluteThreshold?'stable':delta<0?'declining':'improving';
  return {state,recent,prior,delta,deltaPct,points:ordered.slice(-10)};
}

export async function GET(request:NextRequest){
  const access=await requireModuleAccess(request,MODULE_KEYS.PROD_OPERACIONES);
  if(!access.authorized) return access.response;
  const context=await getOrganizationContext(request);
  if(!context.ok) return context.response;

  const [plant,drilling,availability]=await Promise.all([
    context.supabase.from('production_metallurgy_deterministic_v2').select('operation_date,treated_metric_tons,head_grade,recovery_reported,recovery_by_grades_pct').eq('organization_id',context.organizationId).order('operation_date',{ascending:false}).limit(120),
    context.supabase.from('production_drilling_source_reports').select('operation_date,drilled_meters').eq('organization_id',context.organizationId).order('operation_date',{ascending:false}).limit(500),
    context.supabase.from('asset_availability_daily_v1').select('operating_date,availability_pct').eq('organization_id',context.organizationId).order('operating_date',{ascending:false}).limit(500),
  ]);
  const error=plant.error||drilling.error||availability.error;
  if(error) return NextResponse.json({error:error.message},{status:500});

  const plantDaily=new Map<string,{tons:number;gradeWeighted:number;gradeTons:number;recoveryWeighted:number;recoveryTons:number}>();
  for(const row of plant.data||[]){
    const d=row.operation_date;
    if(!d) continue;
    const item=plantDaily.get(d)||{tons:0,gradeWeighted:0,gradeTons:0,recoveryWeighted:0,recoveryTons:0};
    const tons=num(row.treated_metric_tons);
    item.tons+=tons;
    if(row.head_grade!==null&&row.head_grade!==undefined){item.gradeWeighted+=tons*num(row.head_grade);item.gradeTons+=tons;}
    const recovery=row.recovery_reported??row.recovery_by_grades_pct;
    if(recovery!==null&&recovery!==undefined){item.recoveryWeighted+=tons*num(recovery);item.recoveryTons+=tons;}
    plantDaily.set(d,item);
  }

  const treated:DailyPoint[]=[];
  const grade:DailyPoint[]=[];
  const recovery:DailyPoint[]=[];
  for(const [date,item] of plantDaily){
    treated.push({date,value:item.tons});
    if(item.gradeTons>0) grade.push({date,value:item.gradeWeighted/item.gradeTons});
    if(item.recoveryTons>0) recovery.push({date,value:item.recoveryWeighted/item.recoveryTons});
  }

  const drillingDaily=new Map<string,number>();
  for(const row of drilling.data||[]){
    if(!row.operation_date) continue;
    drillingDaily.set(row.operation_date,(drillingDaily.get(row.operation_date)||0)+num(row.drilled_meters));
  }
  const drilled=[...drillingDaily].map(([date,value])=>({date,value}));

  const availabilityDaily=new Map<string,{sum:number,count:number}>();
  for(const row of availability.data||[]){
    if(!row.operating_date||row.availability_pct===null||row.availability_pct===undefined) continue;
    const item=availabilityDaily.get(row.operating_date)||{sum:0,count:0};
    item.sum+=num(row.availability_pct);item.count+=1;availabilityDaily.set(row.operating_date,item);
  }
  const availabilityPoints=[...availabilityDaily].map(([date,item])=>({date,value:item.sum/item.count}));

  const metrics={
    treatedTons:trend(treated,5,true),
    headGrade:trend(grade,0.05,false),
    recovery:trend(recovery,2,false),
    drillingMeters:trend(drilled,10,true),
    availability:trend(availabilityPoints,3,false),
  };

  const alerts=[] as Array<{key:string;severity:'warning'|'info';title:string;evidence:string;action:string}>;
  if(metrics.recovery.state==='declining') alerts.push({key:'recovery-trend',severity:'warning',title:'Recuperación en deterioro',evidence:`Promedio últimos 3 días ${metrics.recovery.recent?.toFixed(2)}% vs ${metrics.recovery.prior?.toFixed(2)}% en los 3 días previos.`,action:'Revisar secuencia metalúrgica y condiciones de operación de los últimos turnos antes de escalar una causa.'});
  if(metrics.headGrade.state==='declining') alerts.push({key:'grade-trend',severity:'warning',title:'Ley de cabeza en deterioro',evidence:`Promedio últimos 3 días ${metrics.headGrade.recent?.toFixed(3)}% Cu vs ${metrics.headGrade.prior?.toFixed(3)}% Cu previos.`,action:'Contrastar alimentación y origen de mineral; no atribuir causa a mina específica sin linaje directo.'});
  if(metrics.drillingMeters.state==='declining') alerts.push({key:'drilling-trend',severity:'warning',title:'Metros de sondaje en descenso',evidence:`Promedio últimos 3 días reportados ${metrics.drillingMeters.recent?.toFixed(1)} m vs ${metrics.drillingMeters.prior?.toFixed(1)} m previos.`,action:'Cruzar los equipos activos con observaciones de Mantención y continuidad de reportes.'});
  if(metrics.treatedTons.state==='declining') alerts.push({key:'treatment-trend',severity:'info',title:'Tratamiento diario en descenso',evidence:`Promedio últimos 3 días ${metrics.treatedTons.recent?.toFixed(1)} t vs ${metrics.treatedTons.prior?.toFixed(1)} t previos.`,action:'Verificar si el cambio supera variación operacional normal antes de intervenir.'});
  if(metrics.availability.state==='insufficient') alerts.push({key:'availability-no-series',severity:'info',title:'Disponibilidad sin serie diaria reciente',evidence:'No existen suficientes registros en asset_availability_daily_v1 para construir una tendencia confiable.',action:'Mantener disponibilidad como evidencia puntual hasta que exista una serie diaria canónica.'});

  return NextResponse.json({
    method:{window:'3d_vs_previous_3d',policy:'Tendencias determinísticas sobre ventanas móviles de 3 días. Umbrales: tratamiento 5% relativo, ley 0,05 pp Cu, recuperación 2 pp, sondaje 10% relativo, disponibilidad 3 pp.'},
    metrics,
    alerts,
  });
}
