import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { MTTRTrackingService } from '@/lib/services/mttr-tracking.service';

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, {
    requiredPermissions: [{ resource: 'maintenance', action: 'read' }],
  });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';

    if (type === 'trend') {
      const daysBack = parseInt(searchParams.get('days') || '30');
      const trend = await MTTRTrackingService.getMTTRTrend(auth.organizationId!, daysBack);
      return NextResponse.json({ trend });
    }

    const stats = await MTTRTrackingService.getDashboardStats(auth.organizationId!);
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch MTTR data' }, { status: 500 });
  }
}
