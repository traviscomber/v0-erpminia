import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getContractsReport } from '@/lib/api/contracts';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const periodo = new URL(request.url).searchParams.get('periodo') || 'mes';
    const report = await getContractsReport(auth.organizationId, periodo);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch contract reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
