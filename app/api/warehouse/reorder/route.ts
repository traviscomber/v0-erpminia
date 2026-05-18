import { NextRequest, NextResponse } from 'next/server';
import { rbacMiddleware } from '@/lib/middleware/rbac.middleware';
import { ReorderService } from '@/lib/services/reorder.service';

export async function GET(request: NextRequest) {
  const auth = await rbacMiddleware(request, { requiredPermissions: [{ resource: 'warehouse', action: 'read' }] });
  if (!auth.isAuthorized) return NextResponse.json({ error: auth.error }, { status: auth.statusCode });

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'alerts';
    
    if (type === 'check') {
      await ReorderService.checkReorderLevels(auth.organizationId!);
    }
    
    const alerts = await ReorderService.getReorderAlerts(auth.organizationId!);
    const stats = await ReorderService.getReorderStats(auth.organizationId!);
    
    return NextResponse.json({ alerts, stats });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reorder data' }, { status: 500 });
  }
}
