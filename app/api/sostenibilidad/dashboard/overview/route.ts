import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext, normalizeCorrectiveActionStatus, normalizeNcStatus } from '@/lib/api/sostenibilidad-mvp';

type NcRow = {
  id: string;
  nc_number?: string | null;
  title?: string | null;
  severity?: string | null;
  status?: string | null;
  created_at?: string | null;
  target_closure_date?: string | null;
  discovered_date?: string | null;
};

type CaRow = {
  id: string;
  status?: string | null;
  scheduled_completion_date?: string | null;
  actual_completion_date?: string | null;
  nc_id?: string | null;
};

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isPastDue(dateValue?: string | null) {
  if (!dateValue) return false;

  const dueDate = new Date(dateValue);
  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function getSeverityRank(severity?: string | null) {
  const value = String(severity || '').trim().toLowerCase();
  if (['critica', 'critical'].includes(value)) return 0;
  if (['alta', 'high'].includes(value)) return 1;
  if (['media', 'medium'].includes(value)) return 2;
  if (['baja', 'low'].includes(value)) return 3;
  return 4;
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || getCurrentPeriod();

    const { data: ncRows, error: ncError } = await context.supabase
      .from('sostenibilidad_nonconformances')
      .select('id, nc_number, title, severity, status, created_at, target_closure_date, discovered_date')
      .eq('organization_id', context.organizationId);

    if (ncError) throw ncError;

    const normalizedNcs = (ncRows || []).map((row: NcRow) => ({
      ...row,
      status: normalizeNcStatus(row.status),
    }));

    const ncIds = normalizedNcs.map((row) => row.id);

    const actionResult =
      ncIds.length === 0
        ? { data: [] as CaRow[], error: null }
        : await context.supabase
            .from('sostenibilidad_corrective_actions')
            .select('id, status, scheduled_completion_date, actual_completion_date, nc_id')
            .in('nc_id', ncIds);

    const { data: actionRows, error: actionError } = actionResult;

    if (actionError) throw actionError;

    const normalizedActions = (actionRows || []).map((row: CaRow) => ({
      ...row,
      status: normalizeCorrectiveActionStatus(row.status),
    }));

    const { data: historyRows, error: historyError } = await context.supabase
      .from('sostenibilidad_compliance_history')
      .select(
        'report_period, compliance_score, total_ncs, open_ncs, closed_ncs, overdue_cas, created_at'
      )
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false })
      .limit(12);

    if (historyError) throw historyError;

    const history = (historyRows || []).slice().sort((a, b) =>
      String(a.report_period).localeCompare(String(b.report_period))
    );
    const latestHistory = (historyRows || [])[0] || null;
    const previousHistory = (historyRows || [])[1] || null;

    const totalNcs = normalizedNcs.length;
    const openNcs = normalizedNcs.filter((row) => row.status === 'open').length;
    const inProgressNcs = normalizedNcs.filter((row) => row.status === 'in_progress').length;
    const closedNcs = normalizedNcs.filter((row) => row.status === 'closed').length;
    const overdueCas = normalizedActions.filter(
      (row) => !['completed', 'verified'].includes(row.status) && isPastDue(row.scheduled_completion_date)
    ).length;
    const totalActions = normalizedActions.length;
    const completedActions = normalizedActions.filter((row) =>
      ['completed', 'verified'].includes(row.status)
    ).length;

    const complianceScore =
      latestHistory?.compliance_score ??
      (totalNcs > 0 ? Math.round((closedNcs / totalNcs) * 100) : 100);

    let trend: 'mejorando' | 'empeorando' | 'stable' = 'stable';
    if (latestHistory && previousHistory) {
      const diff =
        Number(latestHistory.compliance_score || 0) - Number(previousHistory.compliance_score || 0);
      if (diff > 0) trend = 'mejorando';
      if (diff < 0) trend = 'empeorando';
    }

    const topRisks = normalizedNcs
      .filter((row) => row.status === 'open' || row.status === 'in_progress')
      .sort((a, b) => {
        const severityDiff = getSeverityRank(a.severity) - getSeverityRank(b.severity);
        if (severityDiff !== 0) return severityDiff;

        const aDate = new Date(a.target_closure_date || a.discovered_date || a.created_at || 0).getTime();
        const bDate = new Date(b.target_closure_date || b.discovered_date || b.created_at || 0).getTime();
        return aDate - bDate;
      })
      .slice(0, 5);

    const { count: inspectionsCompletedCount, error: inspectionsError } = await context.supabase
      .from('inspecciones_internas')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId)
      .eq('estado', 'realizada');

    if (inspectionsError) throw inspectionsError;

    return NextResponse.json({
      period,
      overview: {
        compliance_score: complianceScore,
        total_ncs: totalNcs,
        open_ncs: openNcs,
        in_progress_ncs: inProgressNcs,
        closed_ncs: closedNcs,
        overdue_cas: overdueCas,
        total_actions: totalActions,
        completed_actions: completedActions,
        trend,
      },
      nc_stats: {
        critical: normalizedNcs.filter((row) => getSeverityRank(row.severity) === 0).length,
        high: normalizedNcs.filter((row) => getSeverityRank(row.severity) === 1).length,
        medium: normalizedNcs.filter((row) => getSeverityRank(row.severity) === 2).length,
        low: normalizedNcs.filter((row) => getSeverityRank(row.severity) === 3).length,
      },
      ca_stats: {
        total: totalActions,
        planned: normalizedActions.filter((row) => row.status === 'planned').length,
        in_progress: normalizedActions.filter((row) => row.status === 'in_progress').length,
        completed: completedActions,
        overdue: overdueCas,
        completionRate:
          totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
      },
      trends: history,
      top_risks: topRisks,
      inspections_completed: inspectionsCompletedCount || 0,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
