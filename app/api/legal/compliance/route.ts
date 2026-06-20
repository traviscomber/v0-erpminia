export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { getLegalComplianceOverview } from '@/lib/api/contracts';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const compliance = await getLegalComplianceOverview(auth.organizationId);
    return NextResponse.json(compliance);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la información de cumplimiento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
