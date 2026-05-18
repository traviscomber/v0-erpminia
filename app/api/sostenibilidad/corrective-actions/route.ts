import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { CorrectiveActionService } from '@/lib/services/corrective-action.service';
import { NonconformanceService } from '@/lib/services/nonconformance.service';
import { AuditTrailService } from '@/lib/services/audittrail.service';

export async function POST(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'sostenibilidad', action: 'write' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const body = await request.json();
    const nc = await NonconformanceService.getNonconformance(body.ncId);

    const ca = await CorrectiveActionService.createCorrectiveAction(body.ncId, nc.nc_number, {
      actionDescription: body.actionDescription,
      responsiblePerson: body.responsiblePerson,
      scheduledCompletionDate: new Date(body.scheduledCompletionDate),
      verificationMethod: body.verificationMethod,
      estimatedCost: body.estimatedCost,
    });

    await AuditTrailService.logAction({
      organizationId: auth.organizationId!,
      userId: auth.user.id,
      action: 'create',
      resourceType: 'corrective_action',
      resourceId: ca.id,
      newValues: body,
    });

    return NextResponse.json(ca, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create corrective action' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'sostenibilidad', action: 'read' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const { searchParams } = new URL(request.url);
    const ncId = searchParams.get('ncId');
    if (!ncId) return NextResponse.json({ error: 'ncId required' }, { status: 400 });

    const cas = await CorrectiveActionService.listCorrectiveActions(ncId);
    const progress = await CorrectiveActionService.getCAProgress(ncId);

    return NextResponse.json({ corrective_actions: cas, progress });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch corrective actions' }, { status: 500 });
  }
}
