import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { listContractsForOrganization } from '@/lib/api/contracts';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const search = new URL(request.url).searchParams.get('search');
    const result = await listContractsForOrganization(auth.organizationId, search);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch legal contracts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
