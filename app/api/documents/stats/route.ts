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
    return NextResponse.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch document stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
