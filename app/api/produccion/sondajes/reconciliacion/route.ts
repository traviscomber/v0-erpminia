export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { allQualityChecksPass } from '@/lib/production/quality-status.mjs';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_OPERACIONES);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [resolution, evidence, sourceDocuments, fidelity, exceptions] = await Promise.all([
    context.supabase
      .from('production_drill_hole_location_resolution_v1')
      .select('drill_hole_id,hole_code,current_mine_source_id,current_mine_sector_id,evidence_count,verified_evidence_count,verified_target_count,proposed_mine_source_id,proposed_mine_sector_id,proposed_mine_name,proposed_sector_name,last_verified_at,resolution_state')
      .eq('organization_id', context.organizationId)
      .order('hole_code'),
    context.supabase
      .from('production_drill_hole_location_evidence')
      .select('id,drill_hole_id,mine_source_id,mine_sector_id,evidence_type,source_document_id,source_reference,evidence_date,confidence,status,notes,reviewed_at,created_at')
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false }),
    context.supabase
      .from('production_source_documents')
      .select('id,source_file,source_kind,canonical_role,notes')
      .eq('organization_id', context.organizationId)
      .in('source_kind', ['drilling', 'mine_report', 'plan', 'reference'])
      .order('source_file'),
    context.supabase
      .from('production_drilling_source_fidelity_v1')
      .select('check_key,expected_value,actual_value,unit,status,delta')
      .eq('organization_id', context.organizationId)
      .order('check_key'),
    context.supabase
      .from('production_source_fidelity_exceptions_v1')
      .select('exception_type,source_file,source_sheet,source_row,event_date,reference_code,description')
      .eq('organization_id', context.organizationId)
      .eq('domain', 'drilling')
      .order('source_row'),
  ]);

  const error = resolution.error || evidence.error || sourceDocuments.error || fidelity.error || exceptions.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = resolution.data || [];
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const state = row.resolution_state || 'unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  const fidelityRows = fidelity.data || [];
  const fidelityCounts = Object.fromEntries(
    fidelityRows.map((row) => [row.check_key, Number(row.actual_value ?? 0)]),
  );

  const fidelityPass = allQualityChecksPass(fidelityRows);
  const sourceExceptions = exceptions.data || [];

  return NextResponse.json({
    summary: {
      drillHoles: rows.length,
      canonical: counts.canonical || 0,
      needsEvidence: counts.needs_evidence || 0,
      readyToPromote: counts.ready_to_promote || 0,
      evidenceConflict: counts.evidence_conflict || 0,
      needsReview: counts.needs_review || 0,
      sourceReportsLinked: fidelityCounts.source_rows_linked_to_hole || 0,
      sourceRowsWithoutHoleCode: fidelityCounts.source_rows_without_hole_code || 0,
      holesWithExplicitMine: fidelityCounts.holes_with_explicit_mine || 0,
      holesWithExplicitSector: fidelityCounts.holes_with_explicit_sector || 0,
      sourceFidelity: fidelityPass ? 'PASS' : 'HOLD',
    },
    policy: {
      rule: 'RAW conserva exactamente el workbook. Mina/Sector se promueve solo cuando la fuente canónica aporta un valor explícito, único y no conflictivo.',
      forbiddenInference: 'Los prefijos, similitud textual o conocimiento externo del código de pozo no constituyen evidencia de ubicación.',
      preservedSourceValues: ['No registrado', '#ERROR!', 'vacío'],
      acceptedEvidence: ['canonical_source_row', 'topography', 'survey', 'geology', 'source_document', 'import_mapping', 'manual_review'],
    },
    fidelity: fidelityRows,
    sourceExceptions,
    holes: rows,
    evidence: evidence.data || [],
    candidateSourceDocuments: sourceDocuments.data || [],
  });
}
