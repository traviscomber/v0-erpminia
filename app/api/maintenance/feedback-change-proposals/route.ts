export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

const text = (value: unknown) => String(value ?? '').trim();
const strategyValues = ['preventive', 'predictive', 'inspection', 'run_to_failure'] as const;
const criticalityValues = ['critical', 'high', 'medium', 'low'] as const;
const lifecycleValues = ['maintain', 'repair', 'rebuild', 'replace', 'retire'] as const;

type Feedback = { id: string; canonical_asset_id: string; feedback_type: string; status: string; reason: string; evidence_reference: string | null };
type Proposal = { id: string; feedback_id: string; canonical_asset_id: string; target_type: string; target_record_id: string | null; proposed_payload: Record<string, unknown>; reason: string; evidence_reference: string | null; status: string; proposed_at: string; decided_at: string | null; decision_note: string | null };
type Asset = { id: string; asset_code: string; name: string };
type Preventive = { id: string; canonical_asset_id: string | null; task_name: string; frequency_days: number | null; frequency_hours: number | string | null; enabled: boolean };

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const canonical = context.supabase.schema('canonical');
  const [feedbackResult, proposalResult, assetResult, preventiveResult] = await Promise.all([
    context.supabase.from('asset_renewal_verified_feedback').select('id,canonical_asset_id,feedback_type,status,reason,evidence_reference').eq('organization_id', context.organizationId).eq('status', 'accepted').order('decided_at', { ascending: false }),
    context.supabase.from('maintenance_feedback_change_proposals').select('id,feedback_id,canonical_asset_id,target_type,target_record_id,proposed_payload,reason,evidence_reference,status,proposed_at,decided_at,decision_note').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }),
    canonical.from('assets').select('id,asset_code,name').eq('organization_id', context.organizationId),
    context.supabase.from('preventive_maintenance_schedules').select('id,canonical_asset_id,task_name,frequency_days,frequency_hours,enabled').eq('organization_id', context.organizationId).eq('enabled', true),
  ]);
  const error = feedbackResult.error || proposalResult.error || assetResult.error || preventiveResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const feedback = (feedbackResult.data || []) as Feedback[];
  const proposals = (proposalResult.data || []) as Proposal[];
  const assets = (assetResult.data || []) as Asset[];
  const preventives = (preventiveResult.data || []) as Preventive[];
  const assetById = new Map(assets.map((row) => [row.id, row]));
  const proposalByFeedback = new Map(proposals.map((row) => [row.feedback_id, row]));
  return NextResponse.json({
    counts: { acceptedFeedback: feedback.length, proposed: proposals.filter((row) => row.status === 'proposed').length, approved: proposals.filter((row) => row.status === 'approved').length, applied: proposals.filter((row) => row.status === 'applied').length },
    items: feedback.map((row) => ({ feedback: row, asset: assetById.get(row.canonical_asset_id) || null, proposal: proposalByFeedback.get(row.id) || null, preventives: preventives.filter((item) => item.canonical_asset_id === row.canonical_asset_id) })),
    proposals,
    integrityRule: 'Una retroalimentación aceptada solo inicia una propuesta operacional. La fuente vigente no cambia hasta una aprobación y aplicación posterior.',
  });
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const feedbackId = text(body?.feedbackId);
  const reason = text(body?.reason);
  if (!feedbackId || !reason) return NextResponse.json({ error: 'Feedback aceptada y fundamento son obligatorios.' }, { status: 400 });

  const { data: feedback } = await context.supabase.from('asset_renewal_verified_feedback').select('id,canonical_asset_id,feedback_type,status,evidence_reference').eq('organization_id', context.organizationId).eq('id', feedbackId).maybeSingle();
  if (!feedback || feedback.status !== 'accepted') return NextResponse.json({ error: 'Solo una retroalimentación aceptada puede iniciar un cambio.' }, { status: 409 });
  const { data: existing } = await context.supabase.from('maintenance_feedback_change_proposals').select('id,status').eq('organization_id', context.organizationId).eq('feedback_id', feedbackId).in('status', ['proposed','approved','applied']).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Esta retroalimentación ya tiene una aplicación activa.' }, { status: 409 });

  let targetType: 'strategy' | 'preventive' | 'lifecycle';
  let targetRecordId: string | null = null;
  let proposedPayload: Record<string, unknown> = {};
  if (feedback.feedback_type === 'strategy_review') {
    const maintenanceStrategy = text(body?.maintenanceStrategy);
    const criticalityLevel = text(body?.criticalityLevel);
    if (!strategyValues.includes(maintenanceStrategy as (typeof strategyValues)[number]) || !criticalityValues.includes(criticalityLevel as (typeof criticalityValues)[number])) return NextResponse.json({ error: 'Estrategia o criticidad inválida.' }, { status: 400 });
    targetType = 'strategy';
    proposedPayload = { maintenanceStrategy, criticalityLevel };
  } else if (feedback.feedback_type === 'preventive_frequency_review') {
    targetRecordId = text(body?.targetRecordId);
    const frequencyDays = body?.frequencyDays === '' || body?.frequencyDays == null ? null : Number(body.frequencyDays);
    const frequencyHours = body?.frequencyHours === '' || body?.frequencyHours == null ? null : Number(body.frequencyHours);
    if (!targetRecordId || (frequencyDays === null && frequencyHours === null) || (frequencyDays !== null && (!Number.isInteger(frequencyDays) || frequencyDays <= 0)) || (frequencyHours !== null && (!Number.isFinite(frequencyHours) || frequencyHours <= 0))) return NextResponse.json({ error: 'Selecciona un preventivo y define una frecuencia válida.' }, { status: 400 });
    const { data: preventive } = await context.supabase.from('preventive_maintenance_schedules').select('id,canonical_asset_id').eq('organization_id', context.organizationId).eq('id', targetRecordId).eq('enabled', true).maybeSingle();
    if (!preventive || preventive.canonical_asset_id !== feedback.canonical_asset_id) return NextResponse.json({ error: 'El preventivo seleccionado no pertenece al activo de la retroalimentación.' }, { status: 409 });
    targetType = 'preventive';
    proposedPayload = { frequencyDays, frequencyHours };
  } else if (feedback.feedback_type === 'lifecycle_review') {
    const decisionType = text(body?.decisionType);
    const targetDate = text(body?.targetDate) || null;
    if (!lifecycleValues.includes(decisionType as (typeof lifecycleValues)[number])) return NextResponse.json({ error: 'Decisión de ciclo de vida inválida.' }, { status: 400 });
    targetType = 'lifecycle';
    proposedPayload = { decisionType, targetDate };
  } else return NextResponse.json({ error: 'Tipo de retroalimentación no soportado.' }, { status: 409 });

  const { data, error } = await context.supabase.from('maintenance_feedback_change_proposals').insert({ organization_id: context.organizationId, feedback_id: feedback.id, canonical_asset_id: feedback.canonical_asset_id, target_type: targetType, target_record_id: targetRecordId, proposed_payload: proposedPayload, reason, evidence_reference: feedback.evidence_reference, status: 'proposed', proposed_by: context.userId }).select('id').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'Esta retroalimentación ya tiene una aplicación activa.' : error.message }, { status: error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}