export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request); if (!context.ok) return context.response;
  const [mines,sectors,drilling,recentDrilling,quality,chemistry] = await Promise.all([
    context.supabase.from('production_mine_sources').select('id,code,name,normalized_name,status,cost_center_id').eq('organization_id',context.organizationId).order('name'),
    context.supabase.from('production_mine_sectors').select('id,mine_source_id,name,normalized_name,status').eq('organization_id',context.organizationId).order('name'),
    context.supabase.from('production_drilling_source_reports').select('id,operation_date,hole_code_raw,mine_raw,sector_raw,drilled_meters,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id,reconciliation_status').eq('organization_id',context.organizationId),
    context.supabase.from('production_drilling_source_reports').select('id,operation_date,hole_code_raw,mine_raw,sector_raw,drilled_meters,reconciliation_status,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id').eq('organization_id',context.organizationId).order('operation_date',{ascending:false}).order('source_row',{ascending:false}).limit(20),
    context.supabase.from('production_geology_context_quality_v1').select('*').eq('organization_id',context.organizationId).maybeSingle(),
    context.supabase.from('production_chemistry_mine_intelligence_v1').select('mine_name,results,raw_locations,avg_cu_pct,min_cu_pct,max_cu_pct,first_sample_date,last_sample_date').eq('organization_id',context.organizationId),
  ]);
  const error=mines.error||sectors.error||drilling.error||recentDrilling.error||quality.error||chemistry.error; if(error)return NextResponse.json({error:error.message},{status:500});
  const mineRows=mines.data||[],sectorRows=sectors.data||[],drillingRows=drilling.data||[];
  const linkedMineReports=drillingRows.filter(r=>r.canonical_mine_source_id).length,linkedSectorReports=drillingRows.filter(r=>r.canonical_mine_sector_id).length,linkedHoleReports=drillingRows.filter(r=>r.canonical_drill_hole_id).length;
  const totalMeters=drillingRows.reduce((s,r)=>s+Number(r.drilled_meters||0),0);
  const mineSummary=mineRows.map(m=>{const reports=drillingRows.filter(r=>r.canonical_mine_source_id===m.id);return {id:m.id,code:m.code,name:m.name,status:m.status,sectors:sectorRows.filter(s=>s.mine_source_id===m.id).length,drillingReports:reports.length,drilledMeters:reports.reduce((s,r)=>s+Number(r.drilled_meters||0),0),chemistry:(chemistry.data||[]).find(c=>c.mine_name===m.name)||null};});
  const q=quality.data||{external_records:0,sernageomin_records:0,mine_linked_records:0,sector_linked_records:0,georeferenced_records:0,valid_records:0,review_records:0};
  return NextResponse.json({summary:{mines:mineRows.length,sectors:sectorRows.length,drillingReports:drillingRows.length,drilledMeters:totalMeters,mineLinkCoveragePct:drillingRows.length?(linkedMineReports/drillingRows.length)*100:0,sectorLinkCoveragePct:drillingRows.length?(linkedSectorReports/drillingRows.length)*100:0,holeLinkCoveragePct:drillingRows.length?(linkedHoleReports/drillingRows.length)*100:0},mines:mineSummary,recentDrilling:recentDrilling.data||[],externalQuality:q,intelligenceStatus:{geologicalSamplesCanonical:Number(q.external_records)>0,assaysCanonical:(chemistry.data||[]).length>0,drillHolesCanonical:linkedHoleReports>0,note:Number(q.external_records)>0?'Contexto geológico externo disponible y separado de la operación.':'SERNAGEOMIN está modelado pero aún no hay registros externos vinculados. No se infieren concesiones, unidades geológicas ni geometrías.'},externalContext:{authority:'SERNAGEOMIN',treatment:'external_context_not_canonical_operation',sources:[{key:'catastro_concesiones',name:'Catastro de Concesiones Mineras',status:'public',use:'Concesiones vigentes y contexto de propiedad minera.'},{key:'sigex',name:'SIGEX',status:'public',use:'Información oficial de exploración geológica entregada al Servicio.'},{key:'sia_yacimientos',name:'SIA Yacimientos',status:'public_viewer',use:'Yacimientos y ocurrencias minerales.'},{key:'geoquimica',name:'Visor de Datos Geoquímicos',status:'public_viewer',use:'Contexto geoquímico público.'}],lineage:'SERNAGEOMIN → geometría/identificador externo → Mina → Sector → Sondaje/Química cuando exista evidencia'}});
}
