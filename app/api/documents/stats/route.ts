export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { DocumentService } from '@/lib/services/document.service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const stats = await DocumentService.getDashboardStats(auth.organizationId);
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      {
        stats: {
          totalDocuments: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          avgApprovalDays: 0,
          pendingByCategory: {},
          overdue: 0,
          expiringIn30Days: 0,
        },
      },
      { status: 500 }
    );
  }
}
