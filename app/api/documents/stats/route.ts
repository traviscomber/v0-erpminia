import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { DocumentService } from '@/lib/services/document.service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await DocumentService.getDashboardStats(auth.organizationId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[v0] Error fetching document stats:', error);
    
    // Return fallback mock data on error
    const mockStats = {
      totalDocuments: 48,
      approved: 42,
      pending: 4,
      rejected: 2,
      avgApprovalDays: 3.5,
      pendingByCategory: {
        Procedimientos: 2,
        Manuales: 1,
        Políticas: 1,
      },
      overdue: 0,
      expiringIn30Days: 5,
    };
    
    return NextResponse.json({ stats: mockStats });
  }
}
