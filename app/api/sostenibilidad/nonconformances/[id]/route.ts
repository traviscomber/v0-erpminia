import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { NonconformanceService } from '@/lib/services/nonconformance.service';
import { AuditTrailService } from '@/lib/services/audittrail.service';

export type RouteHandlerConfig = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'sostenibilidad', action: 'read' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const nc = await NonconformanceService.getNonconformance(id);
    return NextResponse.json(nc);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch nonconformance' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'sostenibilidad', action: 'write' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const body = await request.json();
    const nc = await NonconformanceService.updateNonconformance(id, body);

    await AuditTrailService.logAction({
      organizationId: auth.organizationId!,
      userId: auth.user.id,
      action: 'update',
      resourceType: 'nonconformance',
      resourceId: id,
      oldValues: {},
      newValues: body,
    });

    return NextResponse.json(nc);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update nonconformance' }, { status: 500 });
  }
}
