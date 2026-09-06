export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.PROD_GEOLOGIA);
  if (!access.authorized) return access.response;
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;

  const holeId = request.nextUrl.searchParams.get('holeId');

  const signalsQuery = context.supabase
    .from('production_geology_interpretation_signals_v1')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('effective_priority_rank', { ascending: true })
    .order('last_observed_at', { ascending: false, nullsFirst: false })
    .order('hole_code', { ascending: true });

  if (!holeId) {
    const { data, error } = await signalsQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const rows = data || [];
    const summary = rows.reduce((acc: Record<string, number>, row: any) => {
      const key = String(row.interpretation_state || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return NextResponse.json({ rows, summary });
  }

  const [signal, units, points, transitions, intervals] = await Promise.all([
    context.supabase.from('production_geology_interpretation_signals_v1').select('*').eq('organization_id', context.organizationId).eq('drill_hole_id', holeId).maybeSingle(),
    context.supabase.from('production_geology_contiguous_units_v1')
      .select('from_m,to_m,length_m,evidence_class,lithology_observed,mineralization_state,rock_conditions,structural_features,source_rows,evidence_text,confidence,interpretation_guardrail,first_observed_at,last_observed_at')
      .eq('organization_id', context.organizationId).eq('drill_hole_id', holeId).order('from_m', { ascending: true }).limit(300),
    context.supabase.from('production_geology_point_observations_v1')
      .select('at_depth_m,observation_type,observation,confidence,evidence_text,source_row,operation_date')
      .eq('organization_id', context.organizationId).eq('drill_hole_id', holeId).order('at_depth_m', { ascending: true }).limit(200),
    context.supabase.from('production_geology_transition_candidates_v1')
      .select('at_depth_m,observed_transition,confidence,evidence_text,source_row,operation_date')
      .eq('organization_id', context.organizationId).eq('drill_hole_id', holeId).order('at_depth_m', { ascending: true }).limit(200),
    context.supabase.from('production_drill_intervals')
      .select('from_m,to_m,lithology,alteration,mineralization,recovery_pct,rqd_pct,operational_result,notes')
      .eq('organization_id', context.organizationId).eq('drill_hole_id', holeId).order('from_m', { ascending: true }).limit(300),
  ]);

  const error = signal.error || units.error || points.error || transitions.error || intervals.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!signal.data) return NextResponse.json({ error: 'Sondaje no encontrado' }, { status: 404 });

  return NextResponse.json({
    signal: signal.data,
    evidence: {
      contiguousUnits: units.data || [],
      points: points.data || [],
      transitions: transitions.data || [],
      intervals: intervals.data || [],
    },
  });
}
