export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

type NumericStatsRow = {
  [key: string]: number | string | null | undefined;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || getCurrentPeriod();

    const { data: complianceData } = await supabase
      .from('sostenibilidad_compliance_history')
      .select('*')
      .eq('report_period', period)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: ncStats } = await supabase.rpc('get_nc_stats', { p_period: period });
    const { data: caStats } = await supabase.rpc('get_ca_stats', { p_period: period });

    const { data: trends } = await supabase
      .from('sostenibilidad_compliance_history')
      .select('compliance_score, report_period')
      .order('report_period', { ascending: false })
      .limit(12);

    const { data: topRisks } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('id, nc_number, title, severity, status')
      .in('status', ['abierta', 'open'])
      .order('discovered_date', { ascending: true })
      .limit(5);

    const { count: inspectionsCompleted = 0 } = await supabase
      .from('inspecciones_internas')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'completada');

    const nc = ((ncStats as NumericStatsRow[] | null | undefined)?.[0] ?? {}) as NumericStatsRow;
    const ca = ((caStats as NumericStatsRow[] | null | undefined)?.[0] ?? {}) as NumericStatsRow;

    return NextResponse.json({
      period,
      overview: {
        compliance_score: complianceData?.compliance_score ?? 0,
        total_ncs: complianceData?.total_ncs ?? nc.total ?? 0,
        open_ncs: complianceData?.open_ncs ?? nc.open ?? 0,
        closed_ncs: complianceData?.closed_ncs ?? nc.closed ?? 0,
        overdue_cas: complianceData?.overdue_cas ?? ca.overdue ?? 0,
        trend: complianceData?.trend ?? 'stable',
      },
      nc_stats: nc,
      ca_stats: ca,
      trends: trends ?? [],
      top_risks: topRisks ?? [],
      inspections_completed: inspectionsCompleted ?? 0,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    const period = getCurrentPeriod();
    return NextResponse.json({
      period,
      overview: {
        compliance_score: 0,
        total_ncs: 0,
        open_ncs: 0,
        closed_ncs: 0,
        overdue_cas: 0,
        trend: 'stable',
      },
      nc_stats: { critical: 0, high: 0, medium: 0, low: 0 },
      ca_stats: { total: 0, planned: 0, in_progress: 0, completed: 0, overdue: 0, completionRate: 0 },
      trends: [],
      top_risks: [],
      inspections_completed: 0,
      generated_at: new Date().toISOString(),
    });
  }
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
