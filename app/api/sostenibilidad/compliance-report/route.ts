import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { NonconformanceService } from '@/lib/services/nonconformance.service';
import { CorrectiveActionService } from '@/lib/services/corrective-action.service';

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'sostenibilidad', action: 'read' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const ncStats = await NonconformanceService.getNCStats(auth.organizationId!);
    const caStats = await CorrectiveActionService.getCAStats(auth.organizationId!);
    const bySeverity = await NonconformanceService.getNCsBySeverity(auth.organizationId!);
    const overdueCAs = await CorrectiveActionService.getOverdueCorrectiveActions(auth.organizationId!);

    return NextResponse.json({
      nonconformances: ncStats,
      corrective_actions: caStats,
      by_severity: bySeverity,
      overdue_actions: overdueCAs.length,
      compliance_score: ncStats.complianceScore,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate compliance report' }, { status: 500 });
  }
}
