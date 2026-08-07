export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const text = (value: unknown) => String(value ?? '').trim();
const actionTypes = ['investigate', 'evidence_collection', 'change_review', 'rollback_review'] as const;

type Verification = { id: string; proposal_id: string; canonical_asset_id: string; result: string; status: string; note: string; verified_at: string };
type Proposal = { id: string; canonical_asset_id: string; target_type: string; result_record_id: string | null; reason: string; status: string };
type Followup = { id: string; verification_id: string; proposal_id: string; canonical_asset_id: string; action_type: string; status: string; title: string; description: string; assigned_to: string; due_date: string; evidence_reference: string | null; closure_note: string | null; created_at: string; closed_at: string | null };
type Profile = { id: string; full_name: string | null; first_name: string | null; last_name: string | null; email: string };
type Asset = { id: string; asset_code: string; name: string };

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [verificationResult, proposalResult, followupResult, profileResult, assetResult] = await Promise.all([
    context.supabase.from('maintenance_feedback_change_verifications').select('id,proposal_id,canonical_asset_id,result,status,note,verified_at').eq('organization_id', context.organizationId).eq('status', 'closed').in('result', ['diverged', 'needs_follow_up']).order('verified_at', { ascending: false }),
    context.supabase.from('maintenance_feedback_change_proposals').select('id,canonical_asset_id,target_type,result_record_id,reason,status').eq('organization_id', context.organizationId).eq('status', 'applied'),
    context.supabase.from('maintenance_feedback_exception_followups').select('id,verification_id,proposal_id,canonical_asset_id,action_type,status,title,description,assigned_to,due_date,evidence_reference,closure_note,created_at,closed_at').eq('organization_id', context.organizationId).order('created_at', { ascending: false }),
    context.supabase.from('profiles').select('id,full_name,first_name,last_name,email').eq('organization_id', context.organizationId).order('full_name'),
    context.supabase.schema('canonical').from('assets').select('id,asset_code,name').eq('organization_id', context.organizationId),
  ]);

  const error = verificationResult.error || proposalResult.error || followupResult.error || profileResult.error || assetResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const verifications = (verificationResult.data || []) as Verification[];
  const proposals = (proposalResult.data || []) as Proposal[];
  const followups = (followupResult.data || []) as Followup[];
  const profiles = (profileResult.data || []) as Profile[];
  const assets = (assetResult.data || []) as Asset[];
  const proposalById = new Map(proposals.map((row) => [row.id, row]));
  const assetById = new Map(assets.map((row) => [row.id, row]));
  const profileById = new Map(profiles.map((row) => [row.id, row]));
  const followupsByVerification = new Map<string, Followup[]>();

  for (const followup of followups) {
    const rows = followupsByVerification.get(followup.verification_id) || [];
    rows.push(followup);
    followupsByVerification.set(followup.verification_id, rows);
  }

  const items = verifications.map((verification) => ({
    verification,
    proposal: proposalById.get(verification.proposal_id) || null,
    asset: assetById.get(verification.canonical_asset_id) || null,
    followups: (followupsByVerification.get(verification.id) || []).map((followup) => ({ ...followup, assignee: profileById.get(followup.assigned_to) || null })),
  }));

  return NextResponse.json({
    counts: {
      eligible: items.length,
      open: followups.filter((followup) => followup.status === 'open').length,
      closed: followups.filter((followup) => followup.status === 'closed').length,
      overdue: followups.filter((followup) => followup.status === 'open' && followup.due_date < new Date().toISOString().slice(0, 10)).length,
    },
    items,
    profiles,
    integrityRule: 'Solo verificaciones cerradas con divergencia o seguimiento pueden originar acciones. Crear o cerrar una acción no ejecuta rollback ni modifica la fuente operacional.',
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const verificationId = text(body?.verificationId);
  const actionType = text(body?.actionType);
  const title = text(body?.title);
  const description = text(body?.description);
  const assignedTo = text(body?.assignedTo);
  const dueDate = text(body?.dueDate);

  if (!verificationId || !actionTypes.includes(actionType as (typeof actionTypes)[number]) || !title || !description || !assignedTo || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: 'Verificación, acción, título, descripción, responsable y fecha objetivo son obligatorios.' }, { status: 400 });
  }
  if (dueDate < new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: 'La fecha objetivo no puede estar en el pasado.' }, { status: 400 });

  const { data: verification, error: verificationError } = await context.supabase.from('maintenance_feedback_change_verifications').select('id,proposal_id,canonical_asset_id,result,status').eq('organization_id', context.organizationId).eq('id', verificationId).maybeSingle();
  if (verificationError) return NextResponse.json({ error: verificationError.message }, { status: 500 });
  if (!verification || verification.status !== 'closed' || !['diverged', 'needs_follow_up'].includes(verification.result)) return NextResponse.json({ error: 'Solo una verificación cerrada con divergencia o seguimiento puede originar una acción.' }, { status: 409 });

  const { data: proposal, error: proposalError } = await context.supabase.from('maintenance_feedback_change_proposals').select('id,canonical_asset_id,status').eq('organization_id', context.organizationId).eq('id', verification.proposal_id).maybeSingle();
  if (proposalError) return NextResponse.json({ error: proposalError.message }, { status: 500 });
  if (!proposal || proposal.status !== 'applied' || proposal.canonical_asset_id !== verification.canonical_asset_id) return NextResponse.json({ error: 'La propuesta aplicada vinculada ya no es consistente.' }, { status: 409 });

  const { data: profile, error: profileError } = await context.supabase.from('profiles').select('id').eq('organization_id', context.organizationId).eq('id', assignedTo).maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: 'El responsable no pertenece a la organización.' }, { status: 409 });

  const { data, error } = await context.supabase.from('maintenance_feedback_exception_followups').insert({ organization_id: context.organizationId, verification_id: verification.id, proposal_id: proposal.id, canonical_asset_id: verification.canonical_asset_id, action_type: actionType, status: 'open', title, description, assigned_to: assignedTo, due_date: dueDate, created_by: context.userId }).select('id').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'Ya existe una acción abierta de este tipo para la verificación.' : error.message }, { status: error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const action = text(body?.action);
  const note = text(body?.note);
  const evidenceReference = text(body?.evidenceReference);
  if (!id || !['close', 'cancel'].includes(action)) return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
  if (action === 'close' && (!note || !evidenceReference)) return NextResponse.json({ error: 'Cerrar el seguimiento exige nota y referencia de evidencia real.' }, { status: 400 });
  if (action === 'cancel' && !note) return NextResponse.json({ error: 'Cancelar el seguimiento exige una nota.' }, { status: 400 });

  const now = new Date().toISOString();
  const status = action === 'close' ? 'closed' : 'cancelled';
  const updates = action === 'close'
    ? { status, closure_note: note, evidence_reference: evidenceReference, closed_by: context.userId, closed_at: now, updated_at: now }
    : { status, closure_note: note, closed_by: context.userId, closed_at: now, updated_at: now };

  const { data, error } = await context.supabase.from('maintenance_feedback_exception_followups').update(updates).eq('organization_id', context.organizationId).eq('id', id).eq('status', 'open').select('id').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'El seguimiento no existe o ya no está abierto.' }, { status: 409 });
  return NextResponse.json({ ok: true, status });
}
