import { NextRequest, NextResponse } from 'next/server';
import { NonconformanceService } from '@/lib/services/nonconformance.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || 'default';

    const stats = await NonconformanceService.getNCStats(orgId);
    const bySeverity = await NonconformanceService.getNCsBySeverity(orgId);
    const overdue = await NonconformanceService.getOverdueNCs(orgId);

    return NextResponse.json({
      data: {
        ...stats,
        bySeverity,
        overdue: overdue.length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
