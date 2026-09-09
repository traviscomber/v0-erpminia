export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import { listUserPermissions } from '@/lib/api/admin-data';

const disabledMutation = () => NextResponse.json(
  {
    error: 'Los permisos individuales legacy están deshabilitados. Gestiona el acceso mediante Roles y cargos y su flujo de aprobación.',
    code: 'LEGACY_INDIVIDUAL_PERMISSIONS_DISABLED',
  },
  { status: 410 },
);

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const permissions = await listUserPermissions({
      organizationId: auth.organizationId,
      userId,
    });

    return NextResponse.json({ permissions, legacy: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los permisos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return disabledMutation();
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return disabledMutation();
}
