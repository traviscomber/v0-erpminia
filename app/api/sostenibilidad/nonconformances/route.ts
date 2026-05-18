import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { NonconformanceService } from '@/lib/services/nonconformance.service';
import { AuditTrailService } from '@/lib/services/audittrail.service';

export async function POST(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'sostenibilidad', action: 'write' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const body = await request.json();
    const nc = await NonconformanceService.createNonconformance(auth.organizationId!, {
      title: body.title,
      description: body.description,
      category: body.category,
      severity: body.severity,
      source: body.source,
      discoveredDate: new Date(body.discoveredDate),
      reportedBy: auth.user.id,
      assignedTo: body.assignedTo,
      targetClosureDate: body.targetClosureDate ? new Date(body.targetClosureDate) : undefined,
      rootCause: body.rootCause,
      impactDescription: body.impactDescription,
    });

    await AuditTrailService.logAction({
      organizationId: auth.organizationId!,
      userId: auth.user.id,
      action: 'create',
      resourceType: 'nonconformance',
      resourceId: nc.id,
      newValues: body,
    });

    return NextResponse.json(nc, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create nonconformance' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'sostenibilidad', action: 'read' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const category = searchParams.get('category');

    const ncs = await NonconformanceService.listNonconformances(auth.organizationId!, {
      status: status || undefined,
      severity: severity || undefined,
      category: category || undefined,
    });

    const stats = await NonconformanceService.getNCStats(auth.organizationId!);

    return NextResponse.json({ nonconformances: ncs, stats });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch nonconformances' }, { status: 500 });
  }
}
