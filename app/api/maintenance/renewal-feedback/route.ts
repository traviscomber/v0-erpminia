export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type QueryError = { message: string } | null;
type RangeResult<T> = PromiseLike<{ data: T[] | null; error: QueryError }>;
type Validation = { id: string; evaluated_asset_id: string; previous_asset_id: string; result: string; status: string; reason: string; evidence_reference: string | null; evidence_snapshot: { comparableSources?: string[]; gaps?: string[] } | null; approved_at: string | null };
type Feedback = { id: string; validation_id: string; canonical_asset_id: string; feedback_type: string; status: string; reason: string; evidence_reference: string | null; proposed_at: string; decided_at: string | null; decision_note: string | null };
type Asset = { id: string; asset_code: string; name: string; asset_type: string | null; is_active: boolean };
type Strategy = { id: string; canonical_asset_id: string; criticality_level: string; maintenance_strategy: string; status: string; reason: string };
type Lifecycle = { id: string; canonical_asset_id: string; decision_type: string; status: string; reason: string; target_date: string | null };
type Preventive = { id: string; canonical_asset_id: string | null; task_name: string; enabled: boolean; frequency_days: number | null };

const text = (value: unknown) => String(value ?? '').trim();
const feedbackTypes = ['strategy_review', 'preventive_frequency_review', 'lifecycle_review'] as const;

async function fetchAll<T>(queryFactory: (from: number, to: number) => RangeResult<T>) {
  const rows: T[] = [];
  const chunk = 1000;
  for (let from = 0; ; from += chunk) {
    const { data, error } = await queryFactory(from, from + chunk - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < chunk) break;
  }
  return rows;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const [validations, feedback, assetsResult, strategies, lifecycle, preventives] = await Promise.all([
      fetchAll<Validation>((from, to) => context.supabase.from('asset_renewal_post_commissioning_validations').select('id,evaluated_asset_id,previous_asset_id,result,status,reason,evidence_reference,evidence_snapshot,approved_at').eq('organization_id', context.organizationId).eq('status', 'approved').order('approved_at', { ascending: false }).range(from, to)),
      fetchAll<Feedback>((from, to) => context.supabase.from('asset_renewal_verified_feedback').select('id,validation_id,canonical_asset_id,feedback_type,status,reason,evidence_reference,proposed_at,decided_at,decision_note').eq('organization_id', context.organizationId).order('updated_at', { ascending: false }).range(from, to)),
      context.supabase.from('maintenance_canonical_assets_v1').select('id,asset_code,name,asset_type,is_active').eq('organization_id', context.organizationId).order('asset_code'),
      fetchAll<Strategy>((from, to) => context.supabase.from('maintenance_asset_strategies').select('id,canonical_asset_id,criticality_level,maintenance_strategy,status,reason').eq('organization_id', context.organizationId).eq('status', 'approved').range(from, to)),
      fetchAll<Lifecycle>((from, to) => context.supabase.from('maintenance_asset_lifecycle_decisions').select('id,canonical_asset_id,decision_type,status,reason,target_date').eq('organization_id', context.organizationId).in('status', ['proposed', 'approved']).order('updated_at', { ascending: false }).range(from, to)),
      fetchAll<Preventive>((from, to) => context.supabase.from('preventive_maintenance_schedules').select('id,canonical_asset_id,task_name,enabled,frequency_days').eq('organization_id', context.organizationId).eq('enabled', true).range(from, to)),
    ]);
    if (assetsResult.error) throw new Error(assetsResult.error.message);

    const assets = (assetsResult.data || []) as Asset[];
    const assetById = new Map(assets.map((row) => [row.id, row]));
    const strategyByAsset = new Map(strategies.map((row) => [row.canonical_asset_id, row]));
    const lifecycleByAsset = new Map<string, Lifecycle>();
    for (const row of lifecycle) if (!lifecycleByAsset.has(row.canonical_asset_id)) lifecycleByAsset.set(row.canonical_asset_id, row);
    const preventivesByAsset = new Map<string, Preventive[]>();
    for (const row of preventives) {
      if (!row.canonical_asset_id) continue;
      const list = preventivesByAsset.get(row.canonical_asset_id) || [];
      list.push(row);
      preventivesByAsset.set(row.canonical_asset_id, list);
    }
    const feedbackByValidation = new Map<string, Feedback[]>();
    for (const row of feedback) {
      const list = feedbackByValidation.get(row.validation_id) || [];
      list.push(row);
      feedbackByValidation.set(row.validation_id, list);
    }

    const items = validations.map((validation) => ({
      validation,
      asset: assetById.get(validation.evaluated_asset_id) || null,
      sourceAsset: assetById.get(validation.previous_asset_id) || null,
      currentContext: {
        strategy: strategyByAsset.get(validation.evaluated_asset_id) || null,
        lifecycle: lifecycleByAsset.get(validation.evaluated_asset_id) || null,
        preventives: preventivesByAsset.get(validation.evaluated_asset_id) || [],
      },
      feedback: feedbackByValidation.get(validation.id) || [],
      evidence: {
        comparableSources: Array.isArray(validation.evidence_snapshot?.comparableSources) ? validation.evidence_snapshot!.comparableSources! : [],
        gaps: Array.isArray(validation.evidence_snapshot?.gaps) ? validation.evidence_snapshot!.gaps! : [],
      },
    }));

    return NextResponse.json({
      counts: {
        approvedValidations: items.length,
        proposed: feedback.filter((row) => row.status === 'proposed').length,
        accepted: feedback.filter((row) => row.status === 'accepted').length,
        discarded: feedback.filter((row) => row.status === 'discarded').length,
        withoutFeedback: items.filter((row) => row.feedback.length === 0).length,
      },
      items,
      generatedAt: new Date().toISOString(),
      integrityRule: 'La retroalimentación registra una revisión humana trazable. Aceptarla no modifica automáticamente estrategia, preventivos ni decisiones de ciclo de vida.',
    });
  } catch (error) {
    console.error('[maintenance/renewal-feedback:get]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la retroalimentación de renovación.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const validationId = text(body?.validationId);
  const feedbackType = text(body?.feedbackType);
  const reason = text(body?.reason);
  const evidenceReference = text(body?.evidenceReference) || null;

  if (!validationId || !feedbackTypes.includes(feedbackType as (typeof feedbackTypes)[number]) || !reason) {
    return NextResponse.json({ error: 'Completa validación, tipo de revisión y fundamento.' }, { status: 400 });
  }

  const { data: validation } = await context.supabase.from('asset_renewal_post_commissioning_validations')
    .select('id,evaluated_asset_id,status').eq('organization_id', context.organizationId).eq('id', validationId).maybeSingle();
  if (!validation || validation.status !== 'approved') return NextResponse.json({ error: 'Solo una validación aprobada puede originar retroalimentación.' }, { status: 409 });

  const { data: asset } = await context.supabase.from('maintenance_canonical_assets_v1')
    .select('id').eq('organization_id', context.organizationId).eq('id', validation.evaluated_asset_id).maybeSingle();
  if (!asset) return NextResponse.json({ error: 'El activo evaluado ya no está disponible en el modelo canónico.' }, { status: 409 });

  const { data: existing } = await context.supabase.from('asset_renewal_verified_feedback')
    .select('id,status').eq('organization_id', context.organizationId).eq('validation_id', validation.id).eq('feedback_type', feedbackType).in('status', ['proposed', 'accepted']).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Ya existe una propuesta activa de este tipo para la validación.' }, { status: 409 });

  const { data, error } = await context.supabase.from('asset_renewal_verified_feedback').insert({
    organization_id: context.organizationId,
    validation_id: validation.id,
    canonical_asset_id: validation.evaluated_asset_id,
    feedback_type: feedbackType,
    status: 'proposed',
    reason,
    evidence_reference: evidenceReference,
    proposed_by: context.userId,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'Ya existe una propuesta activa de este tipo para la validación.' : error.message }, { status: error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const id = text(body?.id);
  const status = text(body?.status);
  const decisionNote = text(body?.decisionNote);
  if (!id || !['accepted', 'discarded', 'inactive'].includes(status)) return NextResponse.json({ error: 'Estado de retroalimentación inválido.' }, { status: 400 });
  if (['accepted', 'discarded'].includes(status) && !decisionNote) return NextResponse.json({ error: 'La decisión humana requiere una nota explícita.' }, { status: 400 });

  const { data: existing } = await context.supabase.from('asset_renewal_verified_feedback').select('id,status').eq('organization_id', context.organizationId).eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Retroalimentación no encontrada.' }, { status: 404 });
  if (['accepted', 'discarded'].includes(status) && existing.status !== 'proposed') return NextResponse.json({ error: 'Solo una propuesta pendiente puede aceptarse o descartarse.' }, { status: 409 });
  if (status === 'inactive' && existing.status !== 'accepted') return NextResponse.json({ error: 'Solo una retroalimentación aceptada puede inactivarse.' }, { status: 409 });

  const now = new Date().toISOString();
  const updates = status === 'inactive' ? { status, updated_at: now } : { status, decision_note: decisionNote, decided_by: context.userId, decided_at: now, updated_at: now };
  const { error } = await context.supabase.from('asset_renewal_verified_feedback').update(updates).eq('organization_id', context.organizationId).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
