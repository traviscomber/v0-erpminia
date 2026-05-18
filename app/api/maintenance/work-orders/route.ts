import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { WorkOrderService } from '@/lib/services/workorder.service';
import { AuditTrailService } from '@/lib/services/audittrail.service';

export async function POST(request: NextRequest) {
  const auth = await rbacMiddleware(request, {
    requiredPermissions: [{ resource: 'maintenance', action: 'create' }],
  });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const body = await request.json();
    const wo = await WorkOrderService.createWorkOrder({
      organizationId: auth.organizationId!,
      assetId: body.assetId,
      title: body.title,
      description: body.description,
      workType: body.workType,
      priority: body.priority,
      plannedDurationHours: body.plannedDurationHours,
      assignedTo: body.assignedTo,
      createdBy: auth.userId!,
    });

    await AuditTrailService.logAction({
      organizationId: auth.organizationId!,
      userId: auth.userId!,
      action: 'create',
      resourceType: 'work_order',
      resourceId: wo.id,
      newValues: body,
    });

    return NextResponse.json(wo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, {
    requiredPermissions: [{ resource: 'maintenance', action: 'read' }],
  });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assetId = searchParams.get('assetId');

    const wos = await WorkOrderService.listWorkOrders(auth.organizationId!, {
      status: status || undefined,
      assetId: assetId || undefined,
    });

    return NextResponse.json({ workOrders: wos });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}
