export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type ReviewRow = {
  source_asset_id: string;
  source_asset_code: string | null;
  source_asset_name: string | null;
  target_asset_id: string;
  target_asset_code: string | null;
  target_asset_name: string | null;
  evidence_rule: string | null;
  recognized_cost_events: number | string | null;
  recognized_cost_clp: number | string | null;
  recognized_cost_clp_ytd: number | string | null;
  last_cost_at: string | null;
  drilling_reports: number | string | null;
  drilled_meters: number | string | null;
  last_drilling_at: string | null;
  lifetime_cost_clp_per_meter_preview: number | string | null;
  identity_status: string | null;
  canonicalized: boolean | null;
};

function num(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const { data, error } = await context.supabase
      .from('asset_identity_unified_preview_v1')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('target_asset_name', { ascending: true });

    if (error) throw error;

    const candidates = ((data || []) as ReviewRow[]).map((row) => ({
      sourceAsset: {
        id: row.source_asset_id,
        code: row.source_asset_code,
        name: row.source_asset_name,
      },
      targetAsset: {
        id: row.target_asset_id,
        code: row.target_asset_code,
        name: row.target_asset_name,
      },
      evidenceRule: row.evidence_rule,
      costs: {
        recognizedEvents: num(row.recognized_cost_events),
        lifetimeClp: num(row.recognized_cost_clp),
        ytdClp: num(row.recognized_cost_clp_ytd),
        lastObservedAt: row.last_cost_at,
      },
      production: {
        drillingReports: num(row.drilling_reports),
        drilledMeters: num(row.drilled_meters),
        lastObservedAt: row.last_drilling_at,
      },
      preview: {
        lifetimeCostClpPerMeter: num(row.lifetime_cost_clp_per_meter_preview),
        canonicalized: row.canonicalized === true,
      },
      status: row.identity_status || 'review_required',
    }));

    return NextResponse.json({
      candidates,
      policy: {
        readOnly: true,
        destructiveMergePerformed: false,
        previewMetricsAreNotCanonical: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las revisiones de identidad de activos';
    return NextResponse.json({ candidates: [], error: message }, { status: 500 });
  }
}
