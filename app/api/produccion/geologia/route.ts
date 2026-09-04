export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { applyDatePeriod, getDashboardPeriod } from '@/lib/api/dashboard-period';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const period = getDashboardPeriod(request);
  if (!period) return NextResponse.json({ error: 'Mes inválido' }, { status: 400 });

  const drillingQuery = applyDatePeriod(
    context.supabase
      .from('production_drilling_source_reports')
      .select('id,operation_date,hole_code_raw,mine_raw,sector_raw,drilled_meters,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id,reconciliation_status')
      .eq('organization_id', context.organizationId),
    period,
    'operation_date',
  );
  const recentDrillingQuery = applyDatePeriod(
    context.supabase
      .from('production_drilling_source_reports')
      .select('id,operation_date,hole_code_raw,mine_raw,sector_raw,drilled_meters,reconciliation_status,canonical_mine_source_id,canonical_mine_sector_id,canonical_drill_hole_id')
      .eq('organization_id', context.organizationId),
    period,
    'operation_date',
  )
    .order('operation_date', { ascending: false })
    .order('source_row', { ascending: false })
    .limit(200);

  const [
    mines,
    sectors,
    drilling,
    recentDrilling,
    quality,
    chemistryIntelligence,
    holes,
    intervals,
    samples,
    externalContext,
    locationReview,
  ] = await Promise.all([
    context.supabase
      .from('production_mine_sources')
      .select('id,code,name,normalized_name,status,cost_center_id')
      .eq('organization_id', context.organizationId)
      .order('name'),
    context.supabase
      .from('production_mine_sectors')
      .select('id,mine_source_id,name,normalized_name,status')
      .eq('organization_id', context.organizationId)
      .order('name'),
    drillingQuery,
    recentDrillingQuery,
    context.supabase
      .from('production_geology_context_quality_v1')
      .select('*')
      .eq('organization_id', context.organizationId)
      .maybeSingle(),
    context.supabase
      .from('production_chemistry_mine_intelligence_v1')
      .select('mine_name,results,raw_locations,avg_cu_pct,min_cu_pct,max_cu_pct,first_sample_date,last_sample_date')
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('production_drill_holes')
      .select('id,campaign_id,hole_code,drilling_domain,mine_source_id,mine_sector_id,collar_easting,collar_northing,collar_elevation,coordinate_reference,azimuth_deg,dip_deg,planned_depth_m,drilled_depth_m,diameter_mm,start_at,completed_at,status,geological_purpose,operational_purpose,source_type,source_reference')
      .eq('organization_id', context.organizationId)
      .order('hole_code')
      .limit(1000),
    context.supabase
      .from('production_drill_intervals')
      .select('id,drill_hole_id,from_m,to_m,recovery_pct,rqd_pct,lithology,alteration,mineralization,sample_code,assay_reference,operational_result,notes')
      .eq('organization_id', context.organizationId)
      .order('from_m')
      .limit(2000),
    context.supabase
      .from('production_chemistry_samples')
      .select('id,sample_code,sample_type,sample_date,mine_source_id,mine_sector_id,drill_hole_id,depth_from_m,depth_to_m,source_file,source_sheet,validation_status,validation_notes')
      .eq('organization_id', context.organizationId)
      .order('sample_date', { ascending: false })
      .limit(500),
    context.supabase
      .from('production_geology_external_context')
      .select('id,source_provider,source_dataset,source_record_key,record_type,mine_source_id,mine_sector_id,title,status,valid_from,valid_to,geometry_geojson,source_url,retrieved_at,validation_status,validation_notes')
      .eq('organization_id', context.organizationId)
      .order('retrieved_at', { ascending: false })
      .limit(500),
    context.supabase
      .from('production_drill_hole_location_review_queue_v5')
      .select('drill_hole_id,hole_code,evidence_count,verified_evidence_count,verified_target_count,proposed_mine_name,proposed_sector_name,resolution_state,report_count,last_report_date,source_site,candidate_evidence_count,candidate_mine_name,review_lane,review_priority,recommended_action,operational_bucket,operational_priority')
      .eq('organization_id', context.organizationId)
      .order('operational_priority', { ascending: true })
      .limit(200),
  ]);

  const error =
    mines.error ||
    sectors.error ||
    drilling.error ||
    recentDrilling.error ||
    quality.error ||
    chemistryIntelligence.error ||
    holes.error ||
    intervals.error ||
    samples.error ||
    externalContext.error ||
    locationReview.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mineRows = mines.data || [];
  const sectorRows = sectors.data || [];
  const drillingRows = drilling.data || [];
  const holeRows = holes.data || [];
  const intervalRows = intervals.data || [];
  const sampleRows = samples.data || [];
  const contextRows = externalContext.data || [];
  const reviewRows = locationReview.data || [];

  const linkedMineReports = drillingRows.filter((r) => r.canonical_mine_source_id).length;
  const linkedSectorReports = drillingRows.filter((r) => r.canonical_mine_sector_id).length;
  const linkedHoleReports = drillingRows.filter((r) => r.canonical_drill_hole_id).length;
  const totalMeters = drillingRows.reduce((sum, row) => sum + Number(row.drilled_meters || 0), 0);
  const canonicalDrilledMeters = holeRows.reduce((sum, row) => sum + Number(row.drilled_depth_m || 0), 0);
  const locatedHoles = holeRows.filter((row) => row.collar_easting != null && row.collar_northing != null).length;
  const orientedHoles = holeRows.filter((row) => row.azimuth_deg != null && row.dip_deg != null).length;
  const purposeHoles = holeRows.filter((row) => Boolean(row.geological_purpose?.trim())).length;
  const samplesValidated = sampleRows.filter((row) => String(row.validation_status || '').toLowerCase() === 'valid').length;
  const samplesReview = sampleRows.filter((row) => ['review', 'pending', 'invalid'].includes(String(row.validation_status || '').toLowerCase())).length;
  const unresolvedLocations = reviewRows.filter((row) => !['resolved', 'verified', 'matched'].includes(String(row.resolution_state || '').toLowerCase())).length;

  const mineSummary = mineRows.map((mine) => {
    const reports = drillingRows.filter((row) => row.canonical_mine_source_id === mine.id);
    return {
      id: mine.id,
      code: mine.code,
      name: mine.name,
      status: mine.status,
      sectors: sectorRows.filter((sector) => sector.mine_source_id === mine.id).length,
      drillingReports: reports.length,
      drilledMeters: reports.reduce((sum, row) => sum + Number(row.drilled_meters || 0), 0),
      chemistry: (chemistryIntelligence.data || []).find((row) => row.mine_name === mine.name) || null,
    };
  });

  const q = quality.data || {
    external_records: 0,
    sernageomin_records: 0,
    mine_linked_records: 0,
    sector_linked_records: 0,
    georeferenced_records: 0,
    valid_records: 0,
    review_records: 0,
  };

  return NextResponse.json({
    period: period.month || 'all',
    canWrite: access.canWrite,
    summary: {
      mines: mineRows.length,
      sectors: sectorRows.length,
      drillingReports: drillingRows.length,
      drilledMeters: totalMeters,
      mineLinkCoveragePct: drillingRows.length ? (linkedMineReports / drillingRows.length) * 100 : 0,
      sectorLinkCoveragePct: drillingRows.length ? (linkedSectorReports / drillingRows.length) * 100 : 0,
      holeLinkCoveragePct: drillingRows.length ? (linkedHoleReports / drillingRows.length) * 100 : 0,
      holes: holeRows.length,
      canonicalDrilledMeters,
      locatedHoles,
      orientedHoles,
      purposeHoles,
      intervals: intervalRows.length,
      samples: sampleRows.length,
      samplesValidated,
      samplesReview,
      externalContext: contextRows.length,
      sernageominRecords: Number(q.sernageomin_records || 0),
      unresolvedLocations,
    },
    mines: mineSummary,
    holes: holeRows,
    intervals: intervalRows,
    samples: sampleRows,
    externalContext: contextRows,
    locationReview: reviewRows,
    recentDrilling: recentDrilling.data || [],
    contextQuality: q,
    intelligenceStatus: {
      geologicalSamplesCanonical: intervalRows.length > 0,
      assaysCanonical: sampleRows.length > 0,
      drillHolesCanonical: holeRows.length > 0,
      sernageominContextAvailable: Number(q.sernageomin_records || 0) > 0,
      note: intervalRows.length === 0
        ? 'Hay sondajes canónicos, pero todavía no existen intervalos de logging geológico. La interfaz mantiene ese vacío explícito y no inventa litología, alteración ni mineralización.'
        : 'El logging geológico se muestra desde intervalos canónicos y mantiene separado el contexto externo de la evidencia operacional.',
    },
  });
}

export async function PATCH(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA, true);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  const body = await request.json().catch(() => null);
  const reportId = typeof body?.reportId === 'string' ? body.reportId : '';
  const mineId = typeof body?.mineId === 'string' ? body.mineId : '';
  if (!reportId || !mineId) return NextResponse.json({ error: 'Debes seleccionar un registro y una mina' }, { status: 400 });

  const [reportResult, mineResult] = await Promise.all([
    context.supabase
      .from('production_drilling_source_reports')
      .select('id,canonical_mine_sector_id,canonical_drill_hole_id')
      .eq('organization_id', context.organizationId)
      .eq('id', reportId)
      .maybeSingle(),
    context.supabase
      .from('production_mine_sources')
      .select('id,name')
      .eq('organization_id', context.organizationId)
      .eq('id', mineId)
      .maybeSingle(),
  ]);
  if (reportResult.error || mineResult.error) return NextResponse.json({ error: (reportResult.error || mineResult.error)?.message }, { status: 500 });
  if (!reportResult.data) return NextResponse.json({ error: 'El registro de sondaje no pertenece a esta organización' }, { status: 404 });
  if (!mineResult.data) return NextResponse.json({ error: 'La mina seleccionada no pertenece a esta organización' }, { status: 400 });

  let sectorId = reportResult.data.canonical_mine_sector_id as string | null;
  if (sectorId) {
    const { data: sector } = await context.supabase
      .from('production_mine_sectors')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('id', sectorId)
      .eq('mine_source_id', mineId)
      .maybeSingle();
    if (!sector) sectorId = null;
  }
  const reconciledAt = new Date().toISOString();
  const reviewer = access.user.id;
  const { data: updated, error } = await context.supabase
    .from('production_drilling_source_reports')
    .update({
      canonical_mine_source_id: mineId,
      canonical_mine_sector_id: sectorId,
      reconciliation_status: sectorId && reportResult.data.canonical_drill_hole_id ? 'matched' : 'review',
      reconciliation_notes: `Mina asignada manualmente: ${mineResult.data.name}. Reconciliado por ${reviewer} el ${reconciledAt}. Sector y pozo no se infieren.`,
    })
    .eq('organization_id', context.organizationId)
    .eq('id', reportId)
    .select('id,canonical_mine_source_id,canonical_mine_sector_id,reconciliation_status,reconciliation_notes')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: updated, mine: mineResult.data });
}
