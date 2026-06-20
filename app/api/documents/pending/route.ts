export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { listPendingApprovalsForUser } from '@/lib/api/documents';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId || !auth.user) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const approvals = await listPendingApprovalsForUser(auth.organizationId, auth.user.id);
    return NextResponse.json({ approvals });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudieron cargar las aprobaciones pendientes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
