export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const norm=(value:string|null|undefined)=>(value||'').trim().toLocaleLowerCase('es-CL').replace(/\s+/g,' ');
const num=(value:unknown)=>Number(value||0);

type Attention='alert'|'watch'|'ok'|'no_comparison';

export async function GET(request:NextRequest){
  const access=await requireModuleAccess(request,MODULE_KEYS.PROD_OPERACIONES);
  if(!access.authorized) return access.response;
  const context=await getOrganizationContext(request);
  if(!context.ok) return context.response;

  const [latestMovement,latestPlant,mines,sectors,plan,planLines,drillingSummary]=await Promise.all([
    context.supabase.from('production_material_movements').select('movement_date').eq('organization_id',context.organizationId).eq('normalization_status','approved').order('movement_date',{ascending:false}).limit(1).maybeSingle(),
    context.supabase.from('production_metallurgy_deterministic_v2').select('operation_date').eq('organization_id',context.organizationId).order('operation_date',{ascending:false}).limit(1).maybeSingle(),
    context.supabase.from('production_mine_sources').select('id,code,name,normalized_name,status').eq('organization_id',context.organizationId).order('name'),
    context.supabase.from('production_mine_sectors').select('id,mine_source_id,name,normalized_name,status').eq('organization_id',context.organizationId).order('name'),
    context.supabase.from('production_monthly_plans').select('id,plan_code,period_start,period_end,status,total_mineral_to_plant_tons,target_cu_grade_pct,planned_drilling_m,planned_advance_m').eq('organization_id',context.organizationId).eq('status','active').order('period_start',{ascending:false}).limit(1).maybeSingle(),
    context.supabase.from('production_monthly_plan_lines').select('id,plan_id,line_type,mine_source_id,mine_name_raw,sector_raw,level_raw,section_raw,planned_tons,planned_grade_pct,planned_advance_m,planned_drilling_m,priority,source_reference').eq('organization_id',context.organizationId).order('priority'),
    context.supabase.from('production_drilling_operational_summary_v1').select('min_date,max_date,report_rows,drilled_meters,holes,rigs,operators').eq('organization_id',context.organizationId).maybeSingle(),
  ]);
  const baseError=latestMovement.error||latestPlant.error||mines.error||sectors.error||plan.error||planLines.error||drillingSummary.error;
  if(baseError) return NextResponse.json({error:baseError.message},{status:500});

  const plantThrough=latestPlant.data?.operation_date||null;
  const transportThrough=latestMovement.data?.movement_date||null;
  const dataThrough=plantThrough||transportThrough;
  const activePlan=plan.data||null;
  if(!dataThrough) return NextResponse.json({dataThrough:null,transportThrough:null,plantThrough:null,plan:activePlan,mines:[],sectors:[],plantContext:null,drillingFreshness:drillingSummary.data||null});

  const planStart=activePlan?.period_start||`${dataThrough.slice(0,7)}-01`;
  const planEnd=activePlan?.period_end||dataThrough;
  const planStartDate=new Date(`${planStart}T12:00:00Z`);
  const planEndDate=new Date(`${planEnd}T12:00:00Z`);
  const totalPlanDays=Math.max(1,Math.round((planEndDate.getTime()-planStartDate.getTime())/86400000)+1);
  const cutoffDate=new Date(`${transportThrough||dataThrough}T12:00:00Z`);
  const elapsedTransportDays=Math.max(1,Math.min(totalPlanDays,Math.round((cutoffDate.getTime()-planStartDate.getTime())/86400000)+1));
  const transportPlanFraction=elapsedTransportDays/totalPlanDays;

  const [movements,metallurgy,drilling,drillingLineage]=await Promise.all([
    context.supabase.from('production_material_movements').select('movement_date,mine_source_id,mine_sector_id,mine_name_raw,sector_name_raw,normalized_metric_tons,normalization_status').eq('organization_id',context.organizationId).eq('normalization_status','approved').gte('movement_date',planStart).lte('movement_date',transportThrough||dataThrough),
    context.supabase.from('production_metallurgy_deterministic_v2').select('operation_date,treated_metric_tons,head_grade,recovery_reported,recovery_by_grades_pct,metallurgy_state').eq('organization_id',context.organizationId).gte('operation_date',planStart).lte('operation_date',plantThrough||dataThrough),
    context.supabase.from('production_drilling_source_reports').select('operation_date,drilled_meters,hole_code_raw,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id,reconciliation_status').eq('organization_id',context.organizationId),
    context.supabase.from('production_drilling_reconciliation_v1').select('lineage_state').eq('organization_id',context.organizationId),
  ]);
  const err=movements.error||metallurgy.error||drilling.error||drillingLineage.error;
  if(err) return NextResponse.json({error:err.message},{status:500});

  const mineById=new Map((mines.data||[]).map(m=>[m.id,m]));
  const sectorById=new Map((sectors.data||[]).map(s=>[s.id,s]));
  const activeLines=(planLines.data||[]).filter(l=>!activePlan||l.plan_id===activePlan.id);

  const mineAgg=new Map<string,any>();
  const ensureMine=(mineId:string|null,mineName:string)=>{
    const key=mineId||norm(mineName)||'sin-mina';
    if(!mineAgg.has(key)) mineAgg.set(key,{key,mineId,mineName:mineName||'Sin mina',actualTons:0,movements:0,plannedTons:0,expectedTonsToCutoff:0,plannedGradePct:null,observedVsExpectedPct:null as number|null,attention:'no_comparison' as Attention});
    return mineAgg.get(key);
  };

  for(const row of movements.data||[]){
    const mine=row.mine_source_id?mineById.get(row.mine_source_id):null;
    const item=ensureMine(row.mine_source_id,mine?.name||row.mine_name_raw||'');
    item.actualTons+=num(row.normalized_metric_tons);
    item.movements+=1;
  }

  for(const line of activeLines.filter(l=>l.line_type==='mine_total')){
    const mine=line.mine_source_id?mineById.get(line.mine_source_id):null;
    const item=ensureMine(line.mine_source_id,mine?.name||line.mine_name_raw||'');
    item.plannedTons+=num(line.planned_tons);
    item.expectedTonsToCutoff+=num(line.planned_tons)*transportPlanFraction;
    if(line.planned_grade_pct!==null) item.plannedGradePct=num(line.planned_grade_pct);
  }

  const mineRows=[...mineAgg.values()].map(item=>{
    const pace=item.expectedTonsToCutoff>0?(item.actualTons/item.expectedTonsToCutoff)*100:null;
    const attention:Attention=pace===null?'no_comparison':pace<70?'alert':pace<90?'watch':'ok';
    return {...item,observedVsExpectedPct:pace,attention};
  }).sort((a,b)=>{
    const rank=(v:Attention)=>v==='alert'?0:v==='watch'?1:v==='ok'?2:3;
    return rank(a.attention)-rank(b.attention)||b.plannedTons-a.plannedTons||b.actualTons-a.actualTons;
  });

  const sectorAgg=new Map<string,any>();
  const ensureSector=(mineId:string|null,sectorId:string|null,mineName:string,sectorName:string)=>{
    const key=`${mineId||norm(mineName)}::${sectorId||norm(sectorName)}`;
    if(!sectorAgg.has(key)) sectorAgg.set(key,{key,mineId,sectorId,mineName:mineName||'Sin mina',sectorName:sectorName||'Sin sector',actualTons:0,movements:0,drillingMetersHistorical:0,drillingReportsHistorical:0,drillingHoles:new Set<string>(),drillingCanonicalSectorReports:0,plannedAdvanceM:0,plannedDrillingM:0});
    return sectorAgg.get(key);
  };

  for(const row of movements.data||[]){
    const mine=row.mine_source_id?mineById.get(row.mine_source_id):null;
    const sector=row.mine_sector_id?sectorById.get(row.mine_sector_id):null;
    const item=ensureSector(row.mine_source_id,row.mine_sector_id,mine?.name||row.mine_name_raw||'',sector?.name||row.sector_name_raw||'');
    item.actualTons+=num(row.normalized_metric_tons);
    item.movements+=1;
  }

  for(const line of activeLines.filter(l=>l.line_type==='development'||l.line_type==='radial_drilling')){
    const mine=line.mine_source_id?mineById.get(line.mine_source_id):null;
    const sector=(sectors.data||[]).find(s=>s.mine_source_id===line.mine_source_id&&norm(s.normalized_name||s.name)===norm(line.sector_raw));
    const item=ensureSector(line.mine_source_id,sector?.id||null,mine?.name||line.mine_name_raw||'',sector?.name||line.sector_raw||line.section_raw||'');
    item.plannedAdvanceM+=num(line.planned_advance_m);
    item.plannedDrillingM+=num(line.planned_drilling_m);
  }

  for(const row of drilling.data||[]){
    if(!row.canonical_mine_source_id||!row.canonical_mine_sector_id||!row.canonical_drill_hole_id) continue;
    const mine=mineById.get(row.canonical_mine_source_id);
    const sector=sectorById.get(row.canonical_mine_sector_id);
    if(!mine||!sector||sector.mine_source_id!==row.canonical_mine_source_id) continue;
    const target=ensureSector(row.canonical_mine_source_id,row.canonical_mine_sector_id,mine.name,sector.name);
    target.drillingMetersHistorical+=num(row.drilled_meters);
    target.drillingReportsHistorical+=1;
    if(row.hole_code_raw) target.drillingHoles.add(row.hole_code_raw);
    target.drillingCanonicalSectorReports+=1;
  }

  const sectorRows=[...sectorAgg.values()].map(x=>({...x,drillingHoles:x.drillingHoles.size,drillingReconciliationPct:x.drillingReportsHistorical>0?(x.drillingCanonicalSectorReports/x.drillingReportsHistorical)*100:null})).sort((a,b)=>b.actualTons-a.actualTons||b.drillingMetersHistorical-a.drillingMetersHistorical);

  const met=metallurgy.data||[];
  const treatedTons=met.reduce((s,r)=>s+num(r.treated_metric_tons),0);
  const weighted=(field:'head_grade'|'recovery')=>{
    const rows=met.map(r=>({tons:num(r.treated_metric_tons),value:field==='head_grade'?r.head_grade:(r.recovery_reported??r.recovery_by_grades_pct)})).filter(r=>r.tons>0&&r.value!==null&&r.value!==undefined&&Number.isFinite(Number(r.value)));
    const w=rows.reduce((s,r)=>s+r.tons,0);
    return w?rows.reduce((s,r)=>s+Number(r.value)*r.tons,0)/w:null;
  };
  const assayed=met.filter(r=>r.metallurgy_state==='assayed').length;
  const lineageCounts=(drillingLineage.data||[]).reduce<Record<string,number>>((acc,row)=>{const key=row.lineage_state||'unknown';acc[key]=(acc[key]||0)+1;return acc;},{});
  const attentionCounts=mineRows.reduce<Record<string,number>>((acc,row)=>{acc[row.attention]=(acc[row.attention]||0)+1;return acc;},{});

  return NextResponse.json({
    periodStart:planStart,dataThrough,plantThrough,transportThrough,plan:activePlan,mines:mineRows,sectors:sectorRows,
    sourceCoverage:{transportPlanFraction,elapsedTransportDays,totalPlanDays,policy:'El ritmo compara transporte observado sólo contra líneas mine_total del plan mensual, prorrateadas hasta el corte real de TM. Líneas chamber, preparation y development no se suman porque son vistas solapadas del mismo plan.'},
    attention:{alert:attentionCounts.alert||0,watch:attentionCounts.watch||0,ok:attentionCounts.ok||0,noComparison:attentionCounts.no_comparison||0},
    plantContext:{scope:'global_plant_only',treatedTons,avgHeadGradePct:weighted('head_grade'),avgRecoveryPct:weighted('recovery'),shifts:met.length,assayed,assayCoveragePct:met.length?(assayed/met.length)*100:0,note:'Planta permanece como contexto global: no se atribuye ley ni recuperación a una mina o sector sin linaje directo de alimentación.'},
    drillingFreshness:drillingSummary.data||null,
    drillingReconciliation:{totalReports:drillingLineage.data?.length||0,fullyReconciled:lineageCounts.fully_reconciled||0,holeOnlyReview:lineageCounts.hole_only_review||0,unresolvedOrConflict:(drillingLineage.data?.length||0)-(lineageCounts.fully_reconciled||0)-(lineageCounts.hole_only_review||0),states:lineageCounts},
    semantics:{transport:'TM aprobado observado hasta el corte disponible; registros not_required no se convierten ni cuentan como tonelaje.',plan:'Sólo mine_total se usa como meta comparable de tonelaje. Las demás líneas del plan se muestran como contexto de desarrollo/perforación.',drilling:'Sondaje es contexto histórico acreditado por linaje; no implica disponibilidad futura.',plant:'KPI metalúrgicos globales hasta que exista trazabilidad directa por alimentación.'},
  });
}
