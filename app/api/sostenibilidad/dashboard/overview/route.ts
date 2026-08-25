export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '@/lib/supabase-server';
import { MODULE_KEYS, requireModuleAccess } from '@/lib/api/module-access';
import { NextRequest, NextResponse } from 'next/server';

type NumericStatsRow = {
  [key: string]: number | string | null | undefined;
};

type NonconformanceStatsRow = {
  status: string | null;
  severity: string | null;
  target_closure_date: string | null;
};

type CorrectiveActionStatsRow = {
  status: string | null;
  scheduled_completion_date: string | null;
};

function periodBounds(period: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const start = `${match[1]}-${match[2]}-01T00:00:00.000Z`;
  const next = new Date(Date.UTC(year, month, 1));
  const end = next.toISOString();
  return { start, end };
}

function buildNcStats(rows: NonconformanceStatsRow[]): NumericStatsRow {
  const today = new Date().toISOString().slice(0, 10);
  const isOpen = (status: string | null) => status === 'abierta';
  const isClosed = (status: string | null) => status === 'cerrada';

  return {
    total: rows.length,
    open: rows.filter((row) => isOpen(row.status)).length,
    closed: rows.filter((row) => isClosed(row.status)).length,
    overdue: rows.filter((row) => isOpen(row.status) && row.target_closure_date && row.target_closure_date < today).length,
    critical: rows.filter((row) => row.severity === 'critica').length,
    mayor: rows.filter((row) => row.severity === 'mayor').length,
    menor: rows.filter((row) => row.severity === 'menor').length,
  };
}

function buildCaStats(rows: CorrectiveActionStatsRow[]): NumericStatsRow {
  const today = new Date().toISOString().slice(0, 10);
  const isCompleted = (status: string | null) => status === 'completada' || status === 'cerrada';
  const completed = rows.filter((row) => isCompleted(row.status)).length;

  return {
    total: rows.length,
    open: rows.length - completed,
    completed,
    overdue: rows.filter((row) => !isCompleted(row.status) && row.scheduled_completion_date && row.scheduled_completion_date < today).length,
    completionRate: rows.length === 0 ? 0 : Math.round((completed / rows.length) * 1000) / 10,
  };
}

export async function GET(request: NextRequest) {
  const access = await requireModuleAccess(request, MODULE_KEYS.HSE_TABLERO);
  if (!access.authorized) return access.response;
  if (!access.organizationId) {
    return NextResponse.json({ error: 'Organización no disponible' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || getCurrentPeriod();
    const bounds = periodBounds(period);
    if (!bounds) return NextResponse.json({ error: 'Período inválido' }, { status: 400 });

    const orgId = access.organizationId;
    const DEMO_ORG = '550e8400-e29b-41d4-a716-446655440000';

    // Return mock data for demo organization - never mix with real data
    if (orgId === DEMO_ORG) {
      return NextResponse.json({
        period,
        overview: {
          compliance_score: 78,
          total_ncs: 2,
          open_ncs: 2,
          closed_ncs: 0,
          overdue_cas: 1,
          trend: 'stable',
        },
        nc_stats: { critical: 0, high: 1, medium: 1, low: 0 },
        ca_stats: { total: 1, planned: 0, in_progress: 0, completed: 0, overdue: 1, completionRate: 0 },
        trends: [],
        top_risks: [
          { id: '1', nc_number: 'NC-2025-001', title: 'Inspección equipo EX-001 vencida', severity: 'alta', status: 'abierta' },
        ],
        inspections_completed: 0,
        generated_at: new Date().toISOString(),
      });
    }

    const [complianceResult, ncResult, caResult, trendsResult, risksResult, inspectionsResult] = await Promise.all([
      supabase
        .from('sostenibilidad_compliance_history')
        .select('*')
        .eq('report_period', period)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('sostenibilidad_nonconformances')
        .select('status,severity,target_closure_date')
        .eq('organization_id', orgId)
        .gte('created_at', bounds.start)
        .lt('created_at', bounds.end),
      supabase
        .from('sostenibilidad_corrective_actions')
        .select('status,scheduled_completion_date')
        .eq('organization_id', orgId)
        .gte('created_at', bounds.start)
        .lt('created_at', bounds.end),
      supabase
        .from('sostenibilidad_compliance_history')
        .select('compliance_score, report_period')
        .eq('organization_id', orgId)
        .order('report_period', { ascending: false })
        .limit(12),
      supabase
        .from('sostenibilidad_nonconformances')
        .select('id, nc_number, title, severity, status')
        .eq('organization_id', orgId)
        .in('status', ['abierta', 'open'])
        .order('discovered_date', { ascending: true })
        .limit(5),
      supabase
        .from('inspecciones_internas')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('estado', 'completada'),
    ]);

    const error = complianceResult.error || ncResult.error || caResult.error || trendsResult.error || risksResult.error || inspectionsResult.error;
    if (error) throw error;

    const complianceData = complianceResult.data;
    const nc = buildNcStats((ncResult.data || []) as NonconformanceStatsRow[]);
    const ca = buildCaStats((caResult.data || []) as CorrectiveActionStatsRow[]);

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
      trends: trendsResult.data ?? [],
      top_risks: risksResult.data ?? [],
      inspections_completed: inspectionsResult.count ?? 0,
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
