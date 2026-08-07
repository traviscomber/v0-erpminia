export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type QueryError = { message: string } | null;
type RangeResult<T> = PromiseLike<{ data: T[] | null; error: QueryError }>;
type Need = { id:string; canonical_asset_id:string; cost_center_id:string; target_amount:number|string; target_date:string|null; status:string; reason:string };
type Initiative = { id:string; investment_need_id:string; canonical_asset_id:string; status:string; execution_note:string|null; started_at:string|null; completed_at:string|null; created_at:string };
type Link = { id:string; initiative_id:string; link_type:string; purchase_order_id:string|null; contract_id:string|null; work_order_id:string|null; note:string|null };

const text=(value:unknown)=>String(value??'').trim();
const num=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;};
async function fetchAll<T>(queryFactory:(from:number,to:number)=>RangeResult<T>){const rows:T[]=[];const chunk=1000;for(let from=0;;from+=chunk){const {data,error}=await queryFactory(from,from+chunk-1);if(error)throw new Error(error.message);rows.push(...(data||[]));if(!data||data.length<chunk)break;}return rows;}

export async function GET(request:NextRequest){
  const context=await getOrganizationContext(request);if(!context.ok)return context.response;
  const canonical=context.supabase.schema('canonical');
  try{
    const [needs,initiatives,links,assetsResult,purchaseOrders,contracts,workOrders,costs,procurementDocs]=await Promise.all([
      fetchAll<Need>((from,to)=>context.supabase.from('asset_renewal_investment_needs').select('id,canonical_asset_id,cost_center_id,target_amount,target_date,status,reason').eq('organization_id',context.organizationId).eq('status','approved').range(from,to)),
      fetchAll<Initiative>((from,to)=>context.supabase.from('asset_renewal_execution_initiatives').select('id,investment_need_id,canonical_asset_id,status,execution_note,started_at,completed_at,created_at').eq('organization_id',context.organizationId).order('updated_at',{ascending:false}).range(from,to)),
      fetchAll<Link>((from,to)=>context.supabase.from('asset_renewal_execution_links').select('id,initiative_id,link_type,purchase_order_id,contract_id,work_order_id,note').eq('organization_id',context.organizationId).range(from,to)),
      canonical.from('assets').select('id,asset_code,name,asset_type,cost_center_code').eq('organization_id',context.organizationId).eq('is_active',true),
      fetchAll<any>((from,to)=>context.supabase.from('purchase_orders').select('id,po_number,vendor_name,total_amount,status,cost_center_id').eq('organization_id',context.organizationId).range(from,to)),
      fetchAll<any>((from,to)=>context.supabase.from('contracts').select('id,contract_number,title,contractor_name,contract_value,paid_amount,status,document_url,file_url').eq('organization_id',context.organizationId).range(from,to)),
      fetchAll<any>((from,to)=>context.supabase.from('maintenance_work_orders').select('id,work_order_number,canonical_asset_id,title,status,external_cost').eq('organization_id',context.organizationId).range(from,to)),
      fetchAll<any>((from,to)=>context.supabase.from('work_order_cost_summary').select('work_order_id,total_cost').eq('organization_id',context.organizationId).range(from,to)),
      fetchAll<any>((from,to)=>context.supabase.from('procurement_documents').select('id,contract_id,document_type,document_number,amount,status,document_url').range(from,to)),
    ]);
    if(assetsResult.error)throw new Error(assetsResult.error.message);
    const assets=assetsResult.data||[];
    const assetById=new Map(assets.map((row:any)=>[row.id,row]));
    const initiativeByNeed=new Map<string,Initiative>();for(const row of initiatives){if(!initiativeByNeed.has(row.investment_need_id)&&row.status!=='cancelled')initiativeByNeed.set(row.investment_need_id,row);}
    const poById=new Map(purchaseOrders.map((row:any)=>[row.id,row]));
    const contractById=new Map(contracts.map((row:any)=>[row.id,row]));
    const woById=new Map(workOrders.map((row:any)=>[row.id,row]));
    const costByWo=new Map(costs.map((row:any)=>[row.work_order_id,num(row.total_cost)]));
    const docsByContract=new Map<string,any[]>();for(const doc of procurementDocs){if(!doc.contract_id)continue;const list=docsByContract.get(doc.contract_id)||[];list.push(doc);docsByContract.set(doc.contract_id,list);}

    const items=needs.map((need)=>{
      const initiative=initiativeByNeed.get(need.id)||null;
      const initiativeLinks=initiative?links.filter(row=>row.initiative_id===initiative.id):[];
      const linkedPurchaseOrders=initiativeLinks.filter(row=>row.purchase_order_id).map(row=>poById.get(row.purchase_order_id!)||null).filter(Boolean);
      const linkedContracts=initiativeLinks.filter(row=>row.contract_id).map(row=>contractById.get(row.contract_id!)||null).filter(Boolean);
      const linkedWorkOrders=initiativeLinks.filter(row=>row.work_order_id).map(row=>woById.get(row.work_order_id!)||null).filter(Boolean);
      const contractDocuments=linkedContracts.flatMap((contract:any)=>docsByContract.get(contract.id)||[]);
      const contractFileCount=linkedContracts.filter((contract:any)=>contract.document_url||contract.file_url).length;
      const targetAmount=num(need.target_amount);
      const purchaseOrderCommitment=linkedPurchaseOrders.reduce((sum:number,row:any)=>sum+num(row.total_amount),0);
      const contractCommitment=linkedContracts.reduce((sum:number,row:any)=>sum+num(row.contract_value),0);
      const contractPaid=linkedContracts.reduce((sum:number,row:any)=>sum+num(row.paid_amount),0);
      const actualWorkOrderCost=linkedWorkOrders.reduce((sum:number,row:any)=>sum+(costByWo.get(row.id)??num(row.external_cost)),0);
      return {
        need,
        asset:assetById.get(need.canonical_asset_id)||null,
        initiative,
        links:{purchaseOrders:linkedPurchaseOrders,contracts:linkedContracts,workOrders:linkedWorkOrders,documents:contractDocuments,contractFileCount},
        financial:{targetAmount,purchaseOrderCommitment,contractCommitment,contractPaid,actualWorkOrderCost,remainingAgainstActual:Math.max(0,targetAmount-actualWorkOrderCost)},
      };
    });
    return NextResponse.json({counts:{approvedNeeds:items.length,withoutInitiative:items.filter(row=>!row.initiative).length,planned:items.filter(row=>row.initiative?.status==='planned').length,inProgress:items.filter(row=>row.initiative?.status==='in_progress').length,completed:items.filter(row=>row.initiative?.status==='completed').length},items,generatedAt:new Date().toISOString()});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'No se pudo cargar la ejecución de renovación.'},{status:500});}
}

export async function POST(request:NextRequest){
  const context=await getOrganizationContext(request);if(!context.ok)return context.response;
  const body=await request.json().catch(()=>null);const action=text(body?.action);
  if(action==='create_initiative'){
    const investmentNeedId=text(body?.investmentNeedId);const executionNote=text(body?.executionNote)||null;
    if(!investmentNeedId)return NextResponse.json({error:'Selecciona una necesidad de inversión aprobada.'},{status:400});
    const {data:need}=await context.supabase.from('asset_renewal_investment_needs').select('id,canonical_asset_id,status').eq('organization_id',context.organizationId).eq('id',investmentNeedId).maybeSingle();
    if(!need||need.status!=='approved')return NextResponse.json({error:'La necesidad de inversión no existe o no está aprobada.'},{status:409});
    const {data:existing}=await context.supabase.from('asset_renewal_execution_initiatives').select('id,status').eq('organization_id',context.organizationId).eq('investment_need_id',need.id).neq('status','cancelled').maybeSingle();
    if(existing)return NextResponse.json({error:'La necesidad ya tiene una iniciativa de ejecución activa.'},{status:409});
    const {data,error}=await context.supabase.from('asset_renewal_execution_initiatives').insert({organization_id:context.organizationId,investment_need_id:need.id,canonical_asset_id:need.canonical_asset_id,status:'planned',execution_note:executionNote,created_by:context.userId}).select('id').single();
    if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({ok:true,id:data.id},{status:201});
  }
  if(action==='link'){
    const initiativeId=text(body?.initiativeId);const linkType=text(body?.linkType);const referenceCode=text(body?.referenceCode);const note=text(body?.note)||null;
    if(!initiativeId||!['purchase_order','contract','work_order'].includes(linkType)||!referenceCode)return NextResponse.json({error:'Completa iniciativa, tipo y referencia exacta.'},{status:400});
    const {data:initiative}=await context.supabase.from('asset_renewal_execution_initiatives').select('id,canonical_asset_id,investment_need_id,status').eq('organization_id',context.organizationId).eq('id',initiativeId).maybeSingle();
    if(!initiative||initiative.status==='cancelled'||initiative.status==='completed')return NextResponse.json({error:'La iniciativa no admite nuevos vínculos.'},{status:409});
    const {data:need}=await context.supabase.from('asset_renewal_investment_needs').select('cost_center_id').eq('organization_id',context.organizationId).eq('id',initiative.investment_need_id).eq('status','approved').maybeSingle();
    if(!need)return NextResponse.json({error:'La necesidad aprobada asociada ya no está disponible.'},{status:409});
    let payload:any={organization_id:context.organizationId,initiative_id:initiative.id,link_type:linkType,note,created_by:context.userId,purchase_order_id:null,contract_id:null,work_order_id:null};
    if(linkType==='purchase_order'){
      const {data:row}=await context.supabase.from('purchase_orders').select('id,cost_center_id').eq('organization_id',context.organizationId).eq('po_number',referenceCode).maybeSingle();
      if(!row)return NextResponse.json({error:'OC no encontrada en la organización.'},{status:404});
      if(row.cost_center_id&&row.cost_center_id!==need.cost_center_id)return NextResponse.json({error:'La OC pertenece a un centro de costo distinto al de la necesidad aprobada.'},{status:409});
      payload.purchase_order_id=row.id;
    }else if(linkType==='contract'){
      const {data:row}=await context.supabase.from('contracts').select('id').eq('organization_id',context.organizationId).eq('contract_number',referenceCode).maybeSingle();
      if(!row)return NextResponse.json({error:'Contrato no encontrado en la organización.'},{status:404});payload.contract_id=row.id;
    }else{
      const {data:row}=await context.supabase.from('maintenance_work_orders').select('id,canonical_asset_id').eq('organization_id',context.organizationId).eq('work_order_number',referenceCode).maybeSingle();
      if(!row)return NextResponse.json({error:'OT no encontrada en la organización.'},{status:404});
      if(row.canonical_asset_id!==initiative.canonical_asset_id)return NextResponse.json({error:'La OT no corresponde al activo de la iniciativa.'},{status:409});payload.work_order_id=row.id;
    }
    const {data,error}=await context.supabase.from('asset_renewal_execution_links').insert(payload).select('id').single();
    if(error)return NextResponse.json({error:error.code==='23505'?'La referencia ya está vinculada a esta iniciativa.':error.message},{status:error.code==='23505'?409:500});return NextResponse.json({ok:true,id:data.id},{status:201});
  }
  return NextResponse.json({error:'Acción no soportada.'},{status:400});
}

export async function PATCH(request:NextRequest){
  const context=await getOrganizationContext(request);if(!context.ok)return context.response;
  const body=await request.json().catch(()=>null);const id=text(body?.id);const status=text(body?.status);const executionNote=text(body?.executionNote)||null;
  if(!id||!['planned','in_progress','completed','cancelled'].includes(status))return NextResponse.json({error:'Estado de ejecución inválido.'},{status:400});
  const {data:existing}=await context.supabase.from('asset_renewal_execution_initiatives').select('id,status').eq('organization_id',context.organizationId).eq('id',id).maybeSingle();
  if(!existing)return NextResponse.json({error:'Iniciativa no encontrada.'},{status:404});
  const now=new Date().toISOString();const updates:any={status,execution_note:executionNote,updated_at:now};
  if(status==='in_progress'&&existing.status==='planned')updates.started_at=now;
  if(status==='completed')updates.completed_at=now;
  if(status!=='completed')updates.completed_at=null;
  const {error}=await context.supabase.from('asset_renewal_execution_initiatives').update(updates).eq('organization_id',context.organizationId).eq('id',id);
  if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({ok:true});
}