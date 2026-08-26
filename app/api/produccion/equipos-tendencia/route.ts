export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const num=(v:unknown)=>Number(v||0);
const norm=(v:string|null|undefined)=>(v||'').trim().toUpperCase();

type Daily={date:string;meters:number;reports:number;status:string|null;observation:string|null};

export async function GET(request:NextRequest){
  const access=await requireModuleAccess(request,MODULE_KEYS.PROD_OPERACIONES);
  if(!access.authorized)return access.response;
  const context=await getOrganizationContext(request);
  if(!context.ok)return context.response;

  const [reports,assets,orders,reviews]=await Promise.all([
    context.supabase.from('production_drilling_source_reports').select('canonical_asset_id,operation_date,drilled_meters,equipment_status_raw,machine_observations').eq('organization_id',context.organizationId).not('canonical_asset_id','is',null).order('operation_date',{ascending:false}).limit(1200),
    context.supabase.from('maintenance_canonical_assets_v1').select('id,asset_code,name').eq('organization_id',context.organizationId),
    context.supabase.from('maintenance_operational_work_order_flow_v1').select('canonical_asset_id,work_order_id,work_order_number,status,priority,flow_status').eq('organization_id',context.organizationId).not('canonical_asset_id','is',null),
    context.supabase.from('drilling_maintenance_review_queue_v1').select('canonical_asset_id,operation_date,review_reason,equipment_status_raw,machine_observations,has_linked_work_order,linked_work_order_id,review_status').eq('organization_id',context.organizationId).eq('review_status','pending'),
  ]);
  const error=reports.error||assets.error||orders.error||reviews.error;
  if(error)return NextResponse.json({error:error.message},{status:500});

  const assetById=new Map((assets.data||[]).map(a=>[a.id,a]));
  const dailyByAsset=new Map<string,Map<string,Daily>>();
  for(const row of reports.data||[]){
    if(!row.canonical_asset_id||!row.operation_date)continue;
    if(!dailyByAsset.has(row.canonical_asset_id))dailyByAsset.set(row.canonical_asset_id,new Map());
    const map=dailyByAsset.get(row.canonical_asset_id)!;
    const item=map.get(row.operation_date)||{date:row.operation_date,meters:0,reports:0,status:null,observation:null};
    item.meters+=num(row.drilled_meters);item.reports+=1;
    if(row.equipment_status_raw)item.status=row.equipment_status_raw;
    if(row.machine_observations)item.observation=row.machine_observations;
    map.set(row.operation_date,item);
  }

  const openStatuses=new Set(['completed','closed','cancelled','canceled','done']);
  const ordersByAsset=new Map<string,any[]>();
  for(const wo of orders.data||[]){
    if(!wo.canonical_asset_id)continue;
    if(!ordersByAsset.has(wo.canonical_asset_id))ordersByAsset.set(wo.canonical_asset_id,[]);
    ordersByAsset.get(wo.canonical_asset_id)!.push(wo);
  }
  const reviewByAsset=new Map<string,any[]>();
  for(const review of reviews.data||[]){
    if(!review.canonical_asset_id)continue;
    if(!reviewByAsset.has(review.canonical_asset_id))reviewByAsset.set(review.canonical_asset_id,[]);
    reviewByAsset.get(review.canonical_asset_id)!.push(review);
  }

  const rows=[] as any[];
  for(const [assetId,map] of dailyByAsset){
    const asset=assetById.get(assetId);
    if(!asset)continue;
    const days=[...map.values()].sort((a,b)=>b.date.localeCompare(a.date));
    if(days.length<6)continue;
    const recent=days.slice(0,3);const prior=days.slice(3,6);
    const recentAvg=recent.reduce((s,d)=>s+d.meters,0)/recent.length;
    const priorAvg=prior.reduce((s,d)=>s+d.meters,0)/prior.length;
    const deltaPct=priorAvg>0?((recentAvg-priorAvg)/priorAvg)*100:null;
    const last=days[0];
    const status=norm(last.status);
    const out=status.includes('FUERA DE SERVICIO');
    const withObservation=status.includes('OPERATIVO CON OBSERVACIONES')||Boolean(last.observation);
    const openOrders=(ordersByAsset.get(assetId)||[]).filter(wo=>!openStatuses.has(String(wo.status||'').toLowerCase()));
    const pendingReviews=reviewByAsset.get(assetId)||[];
    const activityDecline=deltaPct!==null&&deltaPct<=-30;
    const maintenanceEvidence=out||withObservation||pendingReviews.length>0||openOrders.length>0;
    const classification=activityDecline&&maintenanceEvidence?'decline_with_maintenance_evidence':activityDecline?'decline_without_cause':maintenanceEvidence?'maintenance_signal_without_activity_decline':'stable';
    rows.push({
      canonicalAssetId:assetId,assetCode:asset.asset_code,assetName:asset.name,lastDate:last.date,lastStatus:last.status,lastObservation:last.observation,
      recentAvgMeters:recentAvg,priorAvgMeters:priorAvg,deltaPct,activityDecline,classification,
      openWorkOrders:openOrders.map(wo=>({id:wo.work_order_id,number:wo.work_order_number,status:wo.status,priority:wo.priority,flowStatus:wo.flow_status})),
      pendingMaintenanceReviews:pendingReviews,
      evidence:{recentDays:recent,priorDays:prior},
    });
  }

  const rank=(c:string)=>c==='decline_with_maintenance_evidence'?0:c==='decline_without_cause'?1:c==='maintenance_signal_without_activity_decline'?2:3;
  rows.sort((a,b)=>rank(a.classification)-rank(b.classification)||(a.deltaPct??999)-(b.deltaPct??999));
  return NextResponse.json({
    policy:'Actividad por equipo compara los últimos 3 días reportados contra los 3 anteriores. Una caída >=30% sólo se vincula a Mantención cuando existe evidencia por canonical_asset_id. Correlación no implica causalidad.',
    rows,
  });
}
