export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';

type Numeric = number | string | null;

type MonthlyRow = {
  canonical_asset_id: string;
  asset_code: string | null;
  asset_name: string | null;
  month_start: string;
  month_end: string;
  recognized_cost_events: Numeric;
  recognized_cost_clp: Numeric;
  last_cost_date: string | null;
  drilling_reports: Numeric;
  drilled_meters: Numeric;
  last_drilling_date: string | null;
  cost_clp_per_meter: Numeric;
  evidence_status: string;
};

type RollingRow = {
  canonical_asset_id: string;
  asset_code: string | null;
  asset_name: string | null;
  window_start: string;
  window_end: string;
  last_cost_date: string | null;
  last_drilling_date: string | null;
  recognized_cost_events_90d: Numeric;
  recognized_cost_clp_90d: Numeric;
  drilling_reports_90d: Numeric;
  drilled_meters_90d: Numeric;
  cost_clp_per_meter_90d: Numeric;
  evidence_status: string;
};

type ChangeRow = {
  canonical_asset_id: string;
  asset_code: string | null;
  asset_name: string | null;
  current_month: string;
  previous_month: string;
  current_cost_clp_per_meter: Numeric;
  previous_cost_clp_per_meter: Numeric;
  current_cost_clp: Numeric;
  previous_cost_clp: Numeric;
  current_drilled_meters: Numeric;
  previous_drilled_meters: Numeric;
  cost_per_meter_change_pct: Numeric;
  drilled_meters_change_pct: Numeric;
  recognized_cost_change_pct: Numeric;
  interpretation_policy: string;
};

function num(value: Numeric) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  try {
    const params = new URL(request.url).searchParams;
    const assetId = params.get('asset_id');
    const months = Math.min(Math.max(Number(params.get('months') || 12), 1), 36);

    let rollingQuery = context.supabase
      .from('drill_asset_unit_economics_90d_v1')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('asset_name', { ascending: true });

    let monthlyQuery = context.supabase
      .from('drill_asset_unit_economics_monthly_v1')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('month_start', { ascending: false });

    let changeQuery = context.supabase
      .from('drill_asset_unit_economics_change_v1')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('asset_name', { ascending: true });

    if (assetId) {
      rollingQuery = rollingQuery.eq('canonical_asset_id', assetId);
      monthlyQuery = monthlyQuery.eq('canonical_asset_id', assetId);
      changeQuery = changeQuery.eq('canonical_asset_id', assetId);
    }

    const [
      { data: rollingData, error: rollingError },
      { data: monthlyData, error: monthlyError },
      { data: changeData, error: changeError },
    ] = await Promise.all([rollingQuery, monthlyQuery, changeQuery]);

    if (rollingError) throw rollingError;
    if (monthlyError) throw monthlyError;
    if (changeError) throw changeError;

    const rolling = ((rollingData || []) as RollingRow[]).map((row) => ({
      assetId: row.canonical_asset_id,
      assetCode: row.asset_code,
      assetName: row.asset_name,
      windowStart: row.window_start,
      windowEnd: row.window_end,
      sourceCoverage: {
        costThrough: row.last_cost_date,
        drillingThrough: row.last_drilling_date,
      },
      costEvents: num(row.recognized_cost_events_90d),
      costClp: num(row.recognized_cost_clp_90d),
      drillingReports: num(row.drilling_reports_90d),
      drilledMeters: num(row.drilled_meters_90d),
      costClpPerMeter: num(row.cost_clp_per_meter_90d),
      evidenceStatus: row.evidence_status,
    }));

    const monthlyRows = ((monthlyData || []) as MonthlyRow[])
      .filter((row) => row.evidence_status === 'comparable')
      .reduce<Record<string, MonthlyRow[]>>((acc, row) => {
        const list = acc[row.canonical_asset_id] || [];
        if (list.length < months) list.push(row);
        acc[row.canonical_asset_id] = list;
        return acc;
      }, {});

    const monthly = Object.fromEntries(
      Object.entries(monthlyRows).map(([id, rows]) => [
        id,
        rows.map((row) => ({
          monthStart: row.month_start,
          monthEnd: row.month_end,
          costEvents: num(row.recognized_cost_events),
          costClp: num(row.recognized_cost_clp),
          drillingReports: num(row.drilling_reports),
          drilledMeters: num(row.drilled_meters),
          costClpPerMeter: num(row.cost_clp_per_meter),
          costObservedThrough: row.last_cost_date,
          drillingObservedThrough: row.last_drilling_date,
        })),
      ]),
    );

    const observedChanges = ((changeData || []) as ChangeRow[]).map((row) => ({
      assetId: row.canonical_asset_id,
      assetCode: row.asset_code,
      assetName: row.asset_name,
      currentMonth: row.current_month,
      previousMonth: row.previous_month,
      current: {
        costClpPerMeter: num(row.current_cost_clp_per_meter),
        costClp: num(row.current_cost_clp),
        drilledMeters: num(row.current_drilled_meters),
      },
      previous: {
        costClpPerMeter: num(row.previous_cost_clp_per_meter),
        costClp: num(row.previous_cost_clp),
        drilledMeters: num(row.previous_drilled_meters),
      },
      changes: {
        costClpPerMeterPct: num(row.cost_per_meter_change_pct),
        costClpPct: num(row.recognized_cost_change_pct),
        drilledMetersPct: num(row.drilled_meters_change_pct),
      },
      interpretationPolicy: row.interpretation_policy,
    }));

    return NextResponse.json({
      rolling90d: rolling,
      monthly,
      observedChanges,
      evidencePolicy: {
        ratioRequiresSameTimeWindow: true,
        currentDateIsNotAssumed: true,
        rollingWindowEndsAtLatestCommonEvidenceDate: true,
        changeIsObservedNotCausal: true,
        missingIsZero: false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la economía por perforadora';
    return NextResponse.json({ rolling90d: [], monthly: {}, observedChanges: [], error: message }, { status: 500 });
  }
}
