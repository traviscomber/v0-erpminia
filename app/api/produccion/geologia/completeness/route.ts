export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

type ReadinessRow = {
  drill_hole_id: string;
  hole_code: string;
  mine_name: string | null;
  sector_name: string | null;
  drilled_depth_m: number | null;
  planned_depth_m: number | null;
  dip_deg: number | null;
  azimuth_deg: number | null;
  collar_easting: number | null;
  collar_northing: number | null;
  coordinate_reference: string | null;
  geology_evidence_rows: number | null;
  explicit_topography_rows: number | null;
  downhole_survey_rows: number | null;
  canonical_interval_count: number | null;
  collar_state: string | null;
  orientation_state: string | null;
  geology_structuring_state: string | null;
};

type QualityRow = {
  drill_hole_id: string;
  hole_code: string;
  negative_drilled_meter_rows: number | null;
  interval_outside_depth_count: number | null;
};

type DrillHoleRow = {
  id: string;
  geological_purpose: string | null;
  planned_depth_m: number | null;
};

function normalizedHoleCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;

  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const [readiness, quality, drillHoles] = await Promise.all([
    context.supabase
      .from('production_geology_drill_hole_readiness_v1')
      .select('drill_hole_id,hole_code,mine_name,sector_name,drilled_depth_m,planned_depth_m,dip_deg,azimuth_deg,collar_easting,collar_northing,coordinate_reference,geology_evidence_rows,explicit_topography_rows,downhole_survey_rows,canonical_interval_count,collar_state,orientation_state,geology_structuring_state')
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('production_geology_data_quality_v1')
      .select('drill_hole_id,hole_code,negative_drilled_meter_rows,interval_outside_depth_count')
      .eq('organization_id', context.organizationId),
    context.supabase
      .from('production_drill_holes')
      .select('id,geological_purpose,planned_depth_m')
      .eq('organization_id', context.organizationId),
  ]);

  const error = readiness.error || quality.error || drillHoles.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (readiness.data || []) as unknown as ReadinessRow[];
  const qualityRows = (quality.data || []) as unknown as QualityRow[];
  const holeRows = (drillHoles.data || []) as unknown as DrillHoleRow[];
  const total = rows.length;

  const duplicateMap = new Map<string, ReadinessRow[]>();
  for (const row of rows) {
    const key = normalizedHoleCode(row.hole_code);
    if (!key) continue;
    const group = duplicateMap.get(key) || [];
    group.push(row);
    duplicateMap.set(key, group);
  }

  const duplicateGroups = [...duplicateMap.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([normalizedCode, group]) => ({
      normalizedCode,
      canonicalRows: group.length,
      variants: group.map((row) => row.hole_code).sort(),
      drillHoleIds: group.map((row) => row.drill_hole_id),
    }))
    .sort((a, b) => b.canonicalRows - a.canonicalRows || a.normalizedCode.localeCompare(b.normalizedCode));

  const duplicateExcessRows = duplicateGroups.reduce((sum, group) => sum + group.canonicalRows - 1, 0);
  const withGeologyEvidence = rows.filter((row) => Number(row.geology_evidence_rows || 0) > 0).length;
  const withStructuredIntervals = rows.filter((row) => Number(row.canonical_interval_count || 0) > 0).length;
  const withTopographyEvidence = rows.filter((row) => Number(row.explicit_topography_rows || 0) > 0).length;
  const withSurveyEvidence = rows.filter((row) => Number(row.downhole_survey_rows || 0) > 0).length;
  const completeOrientation = rows.filter((row) => row.azimuth_deg != null && row.dip_deg != null).length;
  const dipRecoverable = rows.filter((row) => Number(row.downhole_survey_rows || 0) > 0 && row.dip_deg == null).length;
  const azimuthRecoverable = rows.filter((row) => Number(row.downhole_survey_rows || 0) > 0 && row.azimuth_deg == null).length;
  const orientationRecoverable = rows.filter((row) => Number(row.downhole_survey_rows || 0) > 0 && !(row.azimuth_deg != null && row.dip_deg != null)).length;

  const summary = {
    totalCanonicalRows: total,
    normalizedIdentityLowerBound: Math.max(0, total - duplicateExcessRows),
    duplicateGroups: duplicateGroups.length,
    duplicateExcessRows,
    withMine: rows.filter((row) => Boolean(row.mine_name)).length,
    withSector: rows.filter((row) => Boolean(row.sector_name)).length,
    withCollarXY: rows.filter((row) => row.collar_easting != null && row.collar_northing != null).length,
    withCrs: rows.filter((row) => Boolean(row.coordinate_reference)).length,
    withDip: rows.filter((row) => row.dip_deg != null).length,
    dipRecoverable,
    withAzimuth: rows.filter((row) => row.azimuth_deg != null).length,
    azimuthRecoverable,
    completeOrientation,
    orientationRecoverable,
    withDrilledDepth: rows.filter((row) => row.drilled_depth_m != null).length,
    withPlannedDepth: holeRows.filter((row) => row.planned_depth_m != null).length,
    withGeologicalPurpose: holeRows.filter((row) => Boolean(row.geological_purpose?.trim())).length,
    withGeologyEvidence,
    withStructuredIntervals,
    withTopographyEvidence,
    topographyRecoverable: rows.filter((row) => Number(row.explicit_topography_rows || 0) > 0 && !(row.collar_easting != null && row.collar_northing != null)).length,
    withSurveyEvidence,
    textEvidenceOnly: rows.filter((row) => row.geology_structuring_state === 'text_evidence_only').length,
    noGeologyEvidence: rows.filter((row) => row.geology_structuring_state === 'no_geology_evidence').length,
    negativeMeterRows: qualityRows.reduce((sum, row) => sum + Number(row.negative_drilled_meter_rows || 0), 0),
    intervalsOutsideDepth: qualityRows.reduce((sum, row) => sum + Number(row.interval_outside_depth_count || 0), 0),
  };

  const coverage = rows.map((row) => ({
    drillHoleId: row.drill_hole_id,
    holeCode: row.hole_code,
    mine: Boolean(row.mine_name),
    sector: Boolean(row.sector_name),
    collar: row.collar_easting != null && row.collar_northing != null,
    crs: Boolean(row.coordinate_reference),
    dip: row.dip_deg != null,
    azimuth: row.azimuth_deg != null,
    completeOrientation: row.azimuth_deg != null && row.dip_deg != null,
    drilledDepth: row.drilled_depth_m != null,
    geologyEvidence: Number(row.geology_evidence_rows || 0),
    structuredIntervals: Number(row.canonical_interval_count || 0),
    topographyEvidence: Number(row.explicit_topography_rows || 0),
    surveyEvidence: Number(row.downhole_survey_rows || 0),
    collarState: row.collar_state,
    orientationState: row.orientation_state,
    geologyStructuringState: row.geology_structuring_state,
  }));

  return NextResponse.json({
    canWrite: access.canWrite,
    summary,
    duplicateGroups,
    coverage,
    interpretationPolicy: {
      validated: 'Dato materializado y utilizable en el registro canónico.',
      recoverable: 'Existe evidencia fuente, pero falta materializar o validar el dato canónico.',
      absent: 'No se localizó evidencia suficiente en las fuentes actualmente cargadas.',
      duplicate: 'Candidato de identidad duplicada por normalización tipográfica; requiere reconciliación humana antes de fusionar.',
      normalizedIdentityLowerBound: 'Cota tipográfica: no equivale a cantidad de sondajes físicos hasta revisar reutilización de códigos entre campañas.',
    },
  });
}
