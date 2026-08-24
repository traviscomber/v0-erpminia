export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type AssetStateRow = {
  canonical_asset_id: string;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  category: string | null;
  operational_status: string | null;
  criticality: string | null;
  location: string | null;
  is_active: boolean | null;
  recognized_cost_event_count: number | string | null;
  last_cost_at: string | null;
  recognized_cost_clp_lifetime: number | string | null;
  recognized_cost_clp_ytd: number | string | null;
  recognized_cost_clp_12m: number | string | null;
  work_order_count: number | string | null;
  open_work_order_count: number | string | null;
  recorded_downtime_hours: number | string | null;
  drilling_report_count: number | string | null;
  drilled_meters: number | string | null;
  sensor_count: number | string | null;
  sensor_reading_count: number | string | null;
  evidence_domain_count: number | string | null;
  availability_evidence_status: string | null;
  availability_pct: number | string | null;
};

function num(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapAsset(row: AssetStateRow) {
  return {
    id: row.canonical_asset_id,
    code: row.asset_code,
    name: row.asset_name,
    type: row.asset_type,
    category: row.category,
    operationalStatus: row.operational_status,
    criticality: row.criticality,
    location: row.location,
    isActive: row.is_active,
    costs: {
      recognizedEvents: num(row.recognized_cost_event_count),
      lifetimeClp: num(row.recognized_cost_clp_lifetime),
      ytdClp: num(row.recognized_cost_clp_ytd),
      trailing12mClp: num(row.recognized_cost_clp_12m),
      lastObservedAt: row.last_cost_at,
    },
    maintenance: {
      workOrders: num(row.work_order_count),
      openWorkOrders: num(row.open_work_order_count),
      recordedDowntimeHours: num(row.recorded_downtime_hours),
    },
    production: {
      drillingReports: num(row.drilling_report_count),
      drilledMeters: num(row.drilled_meters),
    },
    telemetry: {
      sensors: num(row.sensor_count),
      readings: num(row.sensor_reading_count),
    },
    availability: {
      percent: num(row.availability_pct),
      evidenceStatus: row.availability_evidence_status || 'insufficient_evidence',
    },
    evidenceDomainCount: num(row.evidence_domain_count),
  };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const params = new URL(request.url).searchParams;
    const assetId = params.get('asset_id');
    const activeOnly = params.get('active') !== 'false';

    let query = context.supabase
      .from('asset_operational_state_v1')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('asset_name', { ascending: true });

    if (assetId) query = query.eq('canonical_asset_id', assetId);
    if (activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;

    const assets = ((data || []) as AssetStateRow[]).map(mapAsset);

    return NextResponse.json({
      assets,
      evidencePolicy: {
        missingIsZero: false,
        availabilityRequiresObservedEvidence: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el estado operacional de activos';
    return NextResponse.json({ assets: [], error: message }, { status: 500 });
  }
}
