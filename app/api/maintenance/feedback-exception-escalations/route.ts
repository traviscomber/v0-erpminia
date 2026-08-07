export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const text = (value: unknown) => String(value ?? '').trim();
const targetTypes = ['strategy', 'preventive', 'lifecycle'] as const;

type Verification = {
  id: string;
  proposal_id: string;
  canonical_asset_id: string;
  result: string;
  status: string;
  verified_at: string;
};

type Proposal = {
  id: string;
  canonical_asset_id: string;
  target_type: string;
  status: string;
};

type Followup = {
  id: string;
  verification_id: string;
  status: string;
  due_date: string;
};

type Candidate = {
  assetId: string;
  targetType: string;
  verificationIds: string[];
  followupIds: string[];
  overdue: number;
};

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [verificationResult, proposalResult, followupResult, escalationResult, sourceResult, assetResult, profileResult] = await Promise.all([
    context.supabase.from('maintenance_feedback_change_verifications').select('id,proposal_id,canonical_asset_id,result,status,verified_at').eq('organization_id', context.organizationId).eq('status', 'closed').in('result', ['diverged', 'needs_follow_up']),
    context.supabase.from('maintenance_feedback_change_proposals').select('id,canonical_asset_id,target_type,status').eq('organization_id', context.organizationId).eq('status', 'applied'),
    context.supabase.from('maintenance_feedback_exception_followups').select('id,verification_id,status,due_date').eq('organization_id', context.organizationId),
    context.supabase.from('maintenance_feedback_exception_escalations').select('*').eq('organization_id', context.organizationId).order('created_at', { ascending: false }),
    context.supabase.from('maintenance_feedback_exception_escalation_sources').select('escalation_id,verification_id,followup_id').eq('organization_id', context.organizationId),
    context.supabase.schema('canonical').from('assets').select('id,asset_code,name').eq('organization_id', context.organizationId),
    context.supabase.from('profiles').select('id,full_name,first_name,last_name,email').eq('organization_id', context.organizationId).order('full_name'),
  ]);

  const error = verificationResult.error || proposalResult.error || followupResult.error || escalationResult.error || sourceResult.error || assetResult.error || profileResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const proposals = new Map(((proposalResult.data || []) as Proposal[]).map((proposal) => [proposal.id, proposal]));
  const followups = (followupResult.data || []) as Followup[];
  const followupsByVerification = new Map<string, Followup[]>();
  for (const followup of followups) {
    const rows = followupsByVerification.get(followup.verification_id) || [];
    rows.push(followup);
    followupsByVerification.set(followup.verification_id, rows);
  }

  const today = new Date().toISOString().slice(0, 10);
  const groups = new Map<string, Candidate>();
  for (const verification of (verificationResult.data || []) as Verification[]) {
    const proposal = proposals.get(verification.proposal_id);
    if (!proposal || proposal.canonical_asset_id !== verification.canonical_asset_id) continue;

    const key = `${verification.canonical_asset_id}:${proposal.target_type}`;
    const group = groups.get(key) || {
      assetId: verification.canonical_asset_id,
      targetType: proposal.target_type,
      verificationIds: [],
      followupIds: [],
      overdue: 0,
    };

    group.verificationIds.push(verification.id);
    for (const followup of followupsByVerification.get(verification.id) || []) {
      group.followupIds.push(followup.id);
      if (followup.status === 'open' && followup.due_date < today) group.overdue += 1;
    }
    groups.set(key, group);
  }

  const candidates = [...groups.values()].filter((group) => group.verificationIds.length >= 2 || group.overdue > 0);
  const assets = new Map((assetResult.data || []).map((asset) => [asset.id, asset]));
  const sources = sourceResult.data || [];
  const escalations = (escalationResult.data || []).map((escalation) => ({
    ...escalation,
    asset: assets.get(escalation.canonical_asset_id) || null,
    sources: sources.filter((source) => source.escalation_id === escalation.id),
  }));

  return NextResponse.json({
    counts: {
      candidates: candidates.length,
      open: escalations.filter((escalation) => escalation.status === 'open').length,
      overdue: candidates.filter((candidate) => candidate.overdue > 0).length,
    },
    candidates: candidates.map((candidate) => ({ ...candidate, asset: assets.get(candidate.assetId) || null })),
    escalations,
    profiles: profileResult.data || [],
    integrityRule: 'La recurrencia se detecta solo desde verificaciones reales del mismo activo y tipo de destino. Escalar no modifica la fuente operacional ni ejecuta rollback o cambios.',
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const assetId = text(body?.assetId);
  const targetType = text(body?.targetType);
  const assignedTo = text(body?.assignedTo);
  const rationale = text(body?.rationale);
  const evidenceReference = text(body?.evidenceReference);

  if (!assetId || !targetTypes.includes(targetType as (typeof targetTypes)[number]) || !assignedTo || !rationale) {
    return NextResponse.json({ error: 'Activo, destino, responsable y fundamento son obligatorios.' }, { status: 400 });
  }

  const { data: profile } = await context.supabase.from('profiles').select('id').eq('organization_id', context.organizationId).eq('id', assignedTo).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Responsable inválido para la organización.' }, { status: 409 });

  const { data: verifications, error: verificationError } = await context.supabase.from('maintenance_feedback_change_verifications').select('id,proposal_id,canonical_asset_id,result,status').eq('organization_id', context.organizationId).eq('canonical_asset_id', assetId).eq('status', 'closed').in('result', ['diverged', 'needs_follow_up']);
  if (verificationError) return NextResponse.json({ error: verificationError.message }, { status: 500 });

  const { data: proposals, error: proposalError } = await context.supabase.from('maintenance_feedback_change_proposals').select('id,target_type').eq('organization_id', context.organizationId).eq('canonical_asset_id', assetId).eq('status', 'applied');
  if (proposalError) return NextResponse.json({ error: proposalError.message }, { status: 500 });

  const proposalIds = new Set((proposals || []).filter((proposal) => proposal.target_type === targetType).map((proposal) => proposal.id));
  const eligible = (verifications || []).filter((verification) => proposalIds.has(verification.proposal_id));
  const verificationIds = eligible.map((verification) => verification.id);

  let followups: Followup[] = [];
  if (verificationIds.length) {
    const { data, error } = await context.supabase.from('maintenance_feedback_exception_followups').select('id,verification_id,status,due_date').eq('organization_id', context.organizationId).in('verification_id', verificationIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    followups = (data || []) as Followup[];
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = followups.filter((followup) => followup.status === 'open' && followup.due_date < today);
  if (eligible.length < 2 && overdue.length === 0) {
    return NextResponse.json({ error: 'No existe recurrencia ni seguimiento vencido suficiente para escalar.' }, { status: 409 });
  }

  const { data: escalation, error: escalationError } = await context.supabase.from('maintenance_feedback_exception_escalations').insert({
    organization_id: context.organizationId,
    canonical_asset_id: assetId,
    target_type: targetType,
    recurrence_count: eligible.length,
    overdue_followup_count: overdue.length,
    assigned_to: assignedTo,
    rationale,
    evidence_reference: evidenceReference || null,
    created_by: context.userId,
  }).select('id').single();

  if (escalationError) {
    return NextResponse.json({ error: escalationError.code === '23505' ? 'Ya existe un escalamiento abierto para este activo y destino.' : escalationError.message }, { status: escalationError.code === '23505' ? 409 : 500 });
  }

  const latestFollowupByVerification = new Map<string, string>();
  for (const followup of followups) latestFollowupByVerification.set(followup.verification_id, followup.id);
  const sourceRows = eligible.map((verification) => ({
    organization_id: context.organizationId,
    escalation_id: escalation.id,
    verification_id: verification.id,
    followup_id: latestFollowupByVerification.get(verification.id) || null,
  }));

  if (sourceRows.length) {
    const { error: sourceError } = await context.supabase.from('maintenance_feedback_exception_escalation_sources').insert(sourceRows);
    if (sourceError) {
      await context.supabase.from('maintenance_feedback_exception_escalations').delete().eq('organization_id', context.organizationId).eq('id', escalation.id);
      return NextResponse.json({ error: sourceError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, id: escalation.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const action = text(body?.action);
  const note = text(body?.note);
  if (!id || !['close', 'cancel'].includes(action) || !note) {
    return NextResponse.json({ error: 'Escalamiento, acción y nota son obligatorios.' }, { status: 400 });
  }

  const status = action === 'close' ? 'closed' : 'cancelled';
  const now = new Date().toISOString();
  const { data, error } = await context.supabase.from('maintenance_feedback_exception_escalations').update({
    status,
    closure_note: note,
    closed_by: context.userId,
    closed_at: now,
    updated_at: now,
  }).eq('organization_id', context.organizationId).eq('id', id).eq('status', 'open').select('id').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'El escalamiento no existe o ya no está abierto.' }, { status: 409 });
  return NextResponse.json({ ok: true, status });
}
