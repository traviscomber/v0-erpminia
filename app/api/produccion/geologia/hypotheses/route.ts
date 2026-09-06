export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

const transitions: Record<string, string[]> = {
  detected: ['in_review'],
  in_review: ['supported', 'rejected'],
  supported: ['closed'],
  rejected: ['closed'],
  closed: [],
};

const finalReviewStates = new Set(['supported', 'rejected', 'closed']);

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 50);
}

async function authorizedContext(request: NextRequest, requireWrite = false) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return { ok: false as const, response: access.response };
  if (requireWrite && !access.canWrite) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden: geology write access required' }, { status: 403 }) };
  }
  return getOrganizationContext(request);
}

export async function GET(request: NextRequest) {
  const context = await authorizedContext(request);
  if (!context.ok) return context.response;

  const holeId = request.nextUrl.searchParams.get('holeId');
  const id = request.nextUrl.searchParams.get('id');

  let query = context.supabase
    .from('production_geology_hypotheses')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('updated_at', { ascending: false });
  if (holeId) query = query.eq('drill_hole_id', holeId);
  if (id) query = query.eq('id', id);

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];
  if (!id) return NextResponse.json({ rows });
  if (!rows[0]) return NextResponse.json({ error: 'Hipótesis no encontrada' }, { status: 404 });

  const events = await context.supabase
    .from('production_geology_hypothesis_events')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('hypothesis_id', id)
    .order('created_at', { ascending: true });
  if (events.error) return NextResponse.json({ error: events.error.message }, { status: 500 });
  return NextResponse.json({ row: rows[0], events: events.data || [] });
}

export async function POST(request: NextRequest) {
  const context = await authorizedContext(request, true);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => ({}));
  const drillHoleId = String(body?.drillHoleId || '').trim();
  const patternType = String(body?.patternType || '').trim();
  if (!drillHoleId || !patternType) {
    return NextResponse.json({ error: 'drillHoleId y patternType son requeridos' }, { status: 400 });
  }

  const pattern = await context.supabase
    .from('production_geology_observed_patterns_v1')
    .select('drill_hole_id,hole_code,pattern_type,pattern_label,evidence_strength,evidence_value,evidence_unit,from_m,to_m,source_rows,evidence_summary,review_question,required_validation,pattern_scope,guardrail')
    .eq('organization_id', context.organizationId)
    .eq('drill_hole_id', drillHoleId)
    .eq('pattern_type', patternType)
    .maybeSingle();
  if (pattern.error) return NextResponse.json({ error: pattern.error.message }, { status: 500 });
  if (!pattern.data) return NextResponse.json({ error: 'Patrón canónico no encontrado para este sondaje' }, { status: 404 });

  const existing = await context.supabase
    .from('production_geology_hypotheses')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('drill_hole_id', drillHoleId)
    .eq('origin_type', 'observed_pattern')
    .eq('origin_pattern_type', patternType)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
  if (existing.data) return NextResponse.json({ row: existing.data, existing: true });

  const p = pattern.data as any;
  const insert = await context.supabase
    .from('production_geology_hypotheses')
    .insert({
      organization_id: context.organizationId,
      drill_hole_id: p.drill_hole_id,
      hole_code: p.hole_code,
      origin_type: 'observed_pattern',
      origin_pattern_type: p.pattern_type,
      title: p.pattern_label,
      hypothesis_text: p.review_question,
      canonical_observation: p.evidence_summary,
      required_validation: p.required_validation,
      guardrail: p.guardrail,
      source_rows: p.source_rows || [],
      source_snapshot: p,
      missing_evidence: [p.required_validation],
      state: 'detected',
      created_by: context.userId,
      created_by_name: context.userName || context.userEmail || null,
      last_actor_id: context.userId,
      last_actor_name: context.userName || context.userEmail || null,
    })
    .select('*')
    .single();
  if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 });
  return NextResponse.json({ row: insert.data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const context = await authorizedContext(request, true);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  const current = await context.supabase
    .from('production_geology_hypotheses')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .maybeSingle();
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 });
  if (!current.data) return NextResponse.json({ error: 'Hipótesis no encontrada' }, { status: 404 });

  const nextState = body?.state == null ? current.data.state : String(body.state);
  if (nextState !== current.data.state && !transitions[String(current.data.state)]?.includes(nextState)) {
    return NextResponse.json({ error: `Transición no permitida: ${current.data.state} → ${nextState}` }, { status: 409 });
  }

  const reviewerComment = body?.reviewerComment == null
    ? current.data.reviewer_comment
    : String(body.reviewerComment || '').trim();
  if (nextState !== current.data.state && finalReviewStates.has(nextState) && !reviewerComment) {
    return NextResponse.json({ error: 'Se requiere comentario del geólogo para soportar, rechazar o cerrar una hipótesis' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    state: nextState,
    assigned_to: body?.assignedTo == null ? current.data.assigned_to : String(body.assignedTo || '').trim() || null,
    reviewer_comment: reviewerComment || null,
    evidence_for: body?.evidenceFor == null ? current.data.evidence_for : stringArray(body.evidenceFor),
    evidence_against: body?.evidenceAgainst == null ? current.data.evidence_against : stringArray(body.evidenceAgainst),
    missing_evidence: body?.missingEvidence == null ? current.data.missing_evidence : stringArray(body.missingEvidence),
    last_actor_id: context.userId,
    last_actor_name: context.userName || context.userEmail || null,
  };

  if (nextState !== current.data.state && ['supported', 'rejected'].includes(nextState)) {
    patch.reviewed_by = context.userId;
    patch.reviewed_by_name = context.userName || context.userEmail || null;
    patch.reviewed_at = new Date().toISOString();
  }
  if (nextState !== current.data.state && nextState === 'closed') patch.closed_at = new Date().toISOString();

  const update = await context.supabase
    .from('production_geology_hypotheses')
    .update(patch)
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .select('*')
    .single();
  if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });
  return NextResponse.json({ row: update.data });
}
