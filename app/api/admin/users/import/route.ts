export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: 'La importación masiva legacy está deshabilitada. Crea usuarios mediante el flujo canónico con identidad de acceso y cargo explícito.',
      code: 'LEGACY_USER_IMPORT_DISABLED',
    },
    { status: 410 },
  );
}
