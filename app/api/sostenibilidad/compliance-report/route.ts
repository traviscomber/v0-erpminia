export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getSustainabilityContext,
  isPastDue,
  normalizeCorrectiveActionStatus,
  normalizeNcStatus,
} from '@/lib/api/sostenibilidad-mvp';

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { data: ncRows, error: ncError } = await context.supabase
      .from('sostenibilidad_nonconformances')
      .select('id, severity, status, created_at, target_closure_date')
      .eq('organization_id', context.organizationId);

    if (ncError) throw ncError;

    const ncIds = (ncRows || []).map((row) => row.id);
    const ncResult = { data: ncRows || [] };
    const actionResult =
      ncIds.length === 0
        ? { data: [], error: null }
        : await context.supabase
            .from('sostenibilidad_corrective_actions')
            .select('id, status, scheduled_completion_date, actual_completion_date, nc_id')
            .in('nc_id', ncIds);

    if (actionResult.error) throw actionResult.error;

    const ncs = (ncResult.data || []).map((item) => ({
      ...item,
      status: normalizeNcStatus(item.status),
    }));
    const actions = (actionResult.data || []).map((item) => ({
      ...item,
      status: normalizeCorrectiveActionStatus(item.status),
    }));

    const closedNCs = ncs.filter((nc) => nc.status === 'closed').length;
    const overdueActions = actions.filter(
      (action) =>
        !['completed', 'verified'].includes(action.status) &&
        isPastDue(action.scheduled_completion_date)
    ).length;
    const complianceScore = ncs.length > 0 ? Math.round((closedNCs / ncs.length) * 100) : 100;

    return NextResponse.json({
      total_ncs: ncs.length,
      open_ncs: ncs.filter((nc) => nc.status === 'open').length,
      in_progress_ncs: ncs.filter((nc) => nc.status === 'in_progress').length,
      closed_ncs: closedNCs,
      overdue_actions: overdueActions,
      total_actions: actions.length,
      compliance_score: complianceScore,
      by_severity: {
        critical: ncs.filter((nc) => nc.severity === 'critical').length,
        high: ncs.filter((nc) => nc.severity === 'high').length,
        medium: ncs.filter((nc) => nc.severity === 'medium').length,
        low: ncs.filter((nc) => nc.severity === 'low').length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el reporte de cumplimiento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
