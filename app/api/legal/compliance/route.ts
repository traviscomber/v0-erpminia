import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getLegalComplianceOverview } from '@/lib/api/contracts';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const compliance = await getLegalComplianceOverview(auth.organizationId);
    return NextResponse.json(compliance);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch compliance data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
