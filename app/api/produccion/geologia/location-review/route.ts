export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

function isResolved(value: unknown) {
  return ['resolved', 'verified', 'matched'].includes(String(value || '').toLowerCase());
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [reviewResult, sectorResult] = await Promise.all([
    context.supabase
      .from('production_drill_hole_location_review_queue_v5')
      .select('drill_hole_id,hole_code,resolution_state,review_lane,review_priority,recommended_action,operational_bucket,operational_priority,candidate_mine_source_id,candidate_mine_name,candidate_evidence_count,report_count,last_report_date,source_site,source_sites,distinct_site_count')
      .eq('organization_id', context.organizationId)
      .order('operational_priority', { ascending: false }),
    context.supabase
      .from('production_mine_sectors')
      .select('id,mine_source_id,name,status')
      .eq('organization_id', context.organizationId)
      .eq('status', 'active')
      .order('name'),
  ]);

  const baseError = reviewResult.error || sectorResult.error;
  if (baseError) return NextResponse.json({ error: baseError.message }, { status: 500 });

  const rows = (reviewResult.data || []).filter(
    (row) => !isResolved(row.resolution_state) && String(row.operational_bucket || '').toLowerCase() !== 'historico',
  );
  const drillHoleIds = rows.map((row) => row.drill_hole_id).filter(Boolean);

  let evidenceRows: Array<Record<string, unknown>> = [];
  if (drillHoleIds.length) {
    const evidenceResult = await context.supabase
      .from('production_drill_hole_location_evidence')
      .select('drill_hole_id,mine_source_id,mine_sector_id,evidence_type,source_reference,evidence_date,confidence,status,notes,created_at')
      .eq('organization_id', context.organizationId)
      .in('drill_hole_id', drillHoleIds)
      .order('evidence_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (evidenceResult.error) return NextResponse.json({ error: evidenceResult.error.message }, { status: 500 });
    evidenceRows = (evidenceResult.data || []) as Array<Record<string, unknown>>;
  }

  const sectors = sectorResult.data || [];
  const items = rows.map((row) => {
    const candidateMineId = row.candidate_mine_source_id || null;
    const evidence = evidenceRows.find(
      (item) =>
        item.drill_hole_id === row.drill_hole_id &&
        item.mine_source_id === candidateMineId &&
        item.status === 'candidate',
    ) || null;

    return {
      drillHoleId: row.drill_hole_id,
      holeCode: row.hole_code,
      reviewLane: row.review_lane,
      reviewPriority: row.review_priority,
      recommendedAction: row.recommended_action,
      operationalBucket: row.operational_bucket,
      operationalPriority: row.operational_priority,
      candidateMineSourceId: candidateMineId,
      candidateMineName: row.candidate_mine_name || null,
      candidateEvidenceCount: Number(row.candidate_evidence_count || 0),
      reportCount: Number(row.report_count || 0),
      lastReportDate: row.last_report_date || null,
      sourceSite: row.source_site || null,
      sourceSites: Array.isArray(row.source_sites) ? row.source_sites : [],
      distinctSiteCount: Number(row.distinct_site_count || 0),
      evidence: evidence ? {
        type: evidence.evidence_type,
        sourceReference: evidence.source_reference,
        evidenceDate: evidence.evidence_date,
        confidence: evidence.confidence,
        status: evidence.status,
        notes: evidence.notes,
      } : null,
      sectors: candidateMineId
        ? sectors
            .filter((sector) => sector.mine_source_id === candidateMineId)
            .map((sector) => ({ id: sector.id, name: sector.name, mineSourceId: sector.mine_source_id }))
        : [],
      canConfirmSector:
        access.canWrite &&
        row.review_lane === 'mina_conocida_falta_sector' &&
        Boolean(candidateMineId) &&
        Boolean(evidence),
    };
  });

  return NextResponse.json({
    canWrite: access.canWrite,
    summary: {
      operational: items.length,
      sectorConfirmation: items.filter((item) => item.reviewLane === 'mina_conocida_falta_sector').length,
      sourceConflict: items.filter((item) => item.reviewLane === 'conflicto_fuente').length,
    },
    items,
  });
}

export async function POST(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA, true);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const body = await request.json().catch(() => null);
  const drillHoleId = typeof body?.drillHoleId === 'string' ? body.drillHoleId : '';
  const sectorId = typeof body?.sectorId === 'string' ? body.sectorId : '';
  const confirmed = body?.confirmation === true;

  if (!drillHoleId || !sectorId || !confirmed) {
    return NextResponse.json({ error: 'La confirmación humana de pozo y sector es obligatoria' }, { status: 400 });
  }

  const reviewResult = await context.supabase
    .from('production_drill_hole_location_review_queue_v5')
    .select('drill_hole_id,hole_code,resolution_state,review_lane,operational_bucket,candidate_mine_source_id,candidate_mine_name,source_site,last_report_date')
    .eq('organization_id', context.organizationId)
    .eq('drill_hole_id', drillHoleId)
    .maybeSingle();

  if (reviewResult.error) return NextResponse.json({ error: reviewResult.error.message }, { status: 500 });
  const review = reviewResult.data;
  if (!review) return NextResponse.json({ error: 'El pozo no pertenece a la cola geológica de esta organización' }, { status: 404 });
  if (isResolved(review.resolution_state)) return NextResponse.json({ error: 'La ubicación de este pozo ya está resuelta' }, { status: 409 });
  if (String(review.operational_bucket || '').toLowerCase() === 'historico') {
    return NextResponse.json({ error: 'El backlog histórico no se resuelve desde la cola operacional diaria' }, { status: 409 });
  }
  if (review.review_lane !== 'mina_conocida_falta_sector' || !review.candidate_mine_source_id) {
    return NextResponse.json({ error: 'Este caso requiere resolver primero el conflicto de evidencia fuente' }, { status: 409 });
  }

  const sectorResult = await context.supabase
    .from('production_mine_sectors')
    .select('id,mine_source_id,name,status')
    .eq('organization_id', context.organizationId)
    .eq('id', sectorId)
    .eq('status', 'active')
    .maybeSingle();

  if (sectorResult.error) return NextResponse.json({ error: sectorResult.error.message }, { status: 500 });
  const sector = sectorResult.data;
  if (!sector) return NextResponse.json({ error: 'El sector seleccionado no está activo en esta organización' }, { status: 400 });
  if (sector.mine_source_id !== review.candidate_mine_source_id) {
    return NextResponse.json({ error: 'El sector seleccionado no pertenece a la mina respaldada por la evidencia fuente' }, { status: 409 });
  }

  const evidenceResult = await context.supabase
    .from('production_drill_hole_location_evidence')
    .select('id,source_reference,evidence_date,confidence,status')
    .eq('organization_id', context.organizationId)
    .eq('drill_hole_id', drillHoleId)
    .eq('mine_source_id', review.candidate_mine_source_id)
    .eq('status', 'candidate')
    .order('evidence_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (evidenceResult.error) return NextResponse.json({ error: evidenceResult.error.message }, { status: 500 });
  const evidence = evidenceResult.data;
  if (!evidence) {
    return NextResponse.json({ error: 'No existe evidencia candidata de mina suficiente para habilitar esta confirmación' }, { status: 409 });
  }

  const notes = [
    `Sector ${sector.name} confirmado humanamente en Motil.`,
    `Mina respaldada: ${review.candidate_mine_name || review.candidate_mine_source_id}.`,
    evidence.source_reference ? `Evidencia: ${evidence.source_reference}.` : null,
    review.last_report_date ? `Último reporte: ${review.last_report_date}.` : null,
  ].filter(Boolean).join(' ');

  const rpcResult = await context.supabase.rpc('resolve_drill_hole_location_manual_review', {
    p_organization_id: context.organizationId,
    p_drill_hole_id: drillHoleId,
    p_mine_sector_id: sectorId,
    p_reviewed_by: context.userId,
    p_notes: notes,
  });

  if (rpcResult.error) return NextResponse.json({ error: rpcResult.error.message }, { status: 500 });

  const verificationResult = await context.supabase
    .from('production_drill_holes')
    .select('id,hole_code,mine_source_id,mine_sector_id')
    .eq('organization_id', context.organizationId)
    .eq('id', drillHoleId)
    .maybeSingle();

  if (verificationResult.error) return NextResponse.json({ error: verificationResult.error.message }, { status: 500 });
  const hole = verificationResult.data;
  if (!hole || hole.mine_source_id !== review.candidate_mine_source_id || hole.mine_sector_id !== sectorId) {
    return NextResponse.json({ error: 'La confirmación no quedó reflejada en el pozo canónico' }, { status: 500 });
  }

  return NextResponse.json({
    evidenceId: rpcResult.data,
    holeCode: hole.hole_code,
    mine: { id: review.candidate_mine_source_id, name: review.candidate_mine_name },
    sector: { id: sector.id, name: sector.name },
    verified: true,
  });
}
