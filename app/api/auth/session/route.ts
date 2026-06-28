export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);

  if (!auth?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return NextResponse.json({
    user: auth.user,
    role: auth.role || null,
    organizationId: auth.organizationId || null,
    source: auth.source,
  });
}
