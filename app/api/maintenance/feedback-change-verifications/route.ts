export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const text = (value: unknown) => String(value ?? '').trim();
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

type Proposal = { id:string; canonical_asset_id:string; target_type:string; target_record_id:string|null; result_record_id:string|null; before_snapshot:Record<string,unknown>|null; after_snapshot:Record<string,unknown>|null; reason:string; applied_at:string|null; status:string };
type Verification = { id:string; proposal_id:string; result:string; status:string; note:string; observed_snapshot:Record<string,unknown>|null; verified_at:string; verified_by:string|null };
type Asset = { id:string; asset_code:string; name:string };

async function loadObserved(context: Extract<Awaited<ReturnType<typeof getOrganizationContext>>, { ok: true }>, proposal: Proposal) {
  if (!proposal.result_record_id) return null;
  if (proposal.target_type === 'strategy') {
    const { data } = await context.supabase.from('maintenance_asset_strategies').select('*').eq('organization_id',context.organizationId).eq('id',proposal.result_record_id).maybeSingle(); return data;
  }
  if (proposal.target_type === 'lifecycle') {
    const { data } = await context.supabase.from('maintenance_asset_lifecycle_decisions').select('*').eq('organization_id',context.organizationId).eq('id',proposal.result_record_id).maybeSingle(); return data;
  }
  if (proposal.target_type === 'preventive') {
    const { data } = await context.supabase.from('preventive_maintenance_schedules').select('*').eq('organization_id',context.organizationId).eq('id',proposal.result_record_id).maybeSingle(); return data;
  }
  return null;
}

function integrity(proposal: Proposal, observed: Record<string,unknown>|null) {
  if (!proposal.result_record_id || !proposal.after_snapshot) return { state:'incomplete', gaps:['La aplicación no conserva resultado o snapshot posterior.'] };
  if (!observed) return { state:'missing_target', gaps:['El registro resultante ya no existe en la fuente operacional.'] };
  const expected = proposal.after_snapshot;
  const fields = proposal.target_type==='strategy' ? ['criticality_level','maintenance_strategy','status'] : proposal.target_type==='lifecycle' ? ['decision_type','target_date','status'] : ['frequency_days','frequency_hours','enabled'];
  const gaps = fields.filter((field)=>!same(expected[field],observed[field])).map((field)=>`Divergencia en ${field}`);
  return { state:gaps.length===0?'matches':'diverged', gaps };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request); if (!context.ok) return context.response;
  const [proposalResult, verificationResult, assetResult] = await Promise.all([
    context.supabase.from('maintenance_feedback_change_proposals').select('id,canonical_asset_id,target_type,target_record_id,result_record_id,before_snapshot,after_snapshot,reason,applied_at,status').eq('organization_id',context.organizationId).eq('status','applied').order('applied_at',{ascending:false}),
    context.supabase.from('maintenance_feedback_change_verifications').select('id,proposal_id,result,status,note,observed_snapshot,verified_at,verified_by').eq('organization_id',context.organizationId).order('verified_at',{ascending:false}),
    context.supabase.schema('canonical').from('assets').select('id,asset_code,name').eq('organization_id',context.organizationId),
  ]);
  const error=proposalResult.error||verificationResult.error||assetResult.error; if(error) return NextResponse.json({error:error.message},{status:500});
  const proposals=(proposalResult.data||[]) as Proposal[]; const verifications=(verificationResult.data||[]) as Verification[]; const assets=(assetResult.data||[]) as Asset[]; const assetById=new Map(assets.map((a)=>[a.id,a])); const verificationByProposal=new Map<string,Verification>(); for(const v of verifications) if(!verificationByProposal.has(v.proposal_id)&&v.status==='closed') verificationByProposal.set(v.proposal_id,v);
  const items=[] as Array<Record<string,unknown>>;
  for(const proposal of proposals){ const observed=await loadObserved(context,proposal); items.push({ proposal, asset:assetById.get(proposal.canonical_asset_id)||null, observed, integrity:integrity(proposal,observed), verification:verificationByProposal.get(proposal.id)||null }); }
  return NextResponse.json({ counts:{ applied:items.length, matching:items.filter((i:any)=>i.integrity.state==='matches').length, diverged:items.filter((i:any)=>i.integrity.state==='diverged').length, missing:items.filter((i:any)=>i.integrity.state==='missing_target').length, closed:items.filter((i:any)=>Boolean(i.verification)).length }, items, integrityRule:'La verificación comprueba integridad entre la aplicación y la fuente vigente. No interpreta el cambio como mejora de desempeño.' });
}

export async function POST(request: NextRequest) {
  const context=await getOrganizationContext(request); if(!context.ok) return context.response;
  const body=await request.json().catch(()=>null); const proposalId=text(body?.proposalId); const result=text(body?.result); const note=text(body?.note);
  if(!proposalId||!['verified','diverged','needs_follow_up'].includes(result)||!note) return NextResponse.json({error:'Propuesta, resultado y nota son obligatorios.'},{status:400});
  const {data:proposal}=await context.supabase.from('maintenance_feedback_change_proposals').select('id,canonical_asset_id,target_type,target_record_id,result_record_id,before_snapshot,after_snapshot,reason,applied_at,status').eq('organization_id',context.organizationId).eq('id',proposalId).maybeSingle();
  if(!proposal||proposal.status!=='applied') return NextResponse.json({error:'Solo un cambio aplicado puede verificarse.'},{status:409});
  const {data:existing}=await context.supabase.from('maintenance_feedback_change_verifications').select('id').eq('organization_id',context.organizationId).eq('proposal_id',proposalId).eq('status','closed').maybeSingle(); if(existing) return NextResponse.json({error:'Esta aplicación ya tiene una verificación cerrada.'},{status:409});
  const observed=await loadObserved(context,proposal as Proposal);
  const {data,error}=await context.supabase.from('maintenance_feedback_change_verifications').insert({ organization_id:context.organizationId, proposal_id:proposalId, canonical_asset_id:proposal.canonical_asset_id, result, status:'closed', note, observed_snapshot:observed, verified_by:context.userId }).select('id').single();
  if(error) return NextResponse.json({error:error.code==='23505'?'Esta aplicación ya tiene una verificación cerrada.':error.message},{status:error.code==='23505'?409:500});
  return NextResponse.json({ok:true,id:data.id},{status:201});
}