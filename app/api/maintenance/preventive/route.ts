import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { PreventiveMaintenanceService } from '@/lib/services/preventive-maintenance.service';

export async function POST(request: NextRequest) {
  const auth = await rbacMiddleware(request, {
    requiredPermissions: [{ resource: 'maintenance', action: 'create' }],
  });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const body = await request.json();
    const schedule = await PreventiveMaintenanceService.createSchedule({
      organizationId: auth.organizationId!,
      assetId: body.assetId,
      taskName: body.taskName,
      description: body.description,
      frequencyDays: body.frequencyDays,
      estimatedDurationHours: body.estimatedDurationHours,
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, {
    requiredPermissions: [{ resource: 'maintenance', action: 'read' }],
  });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const schedules = await PreventiveMaintenanceService.getDueSchedules(auth.organizationId!, days);
    const stats = await PreventiveMaintenanceService.getScheduleStats(auth.organizationId!);

    return NextResponse.json({ schedules, stats });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}
