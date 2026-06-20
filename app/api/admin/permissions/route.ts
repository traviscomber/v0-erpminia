export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import {
  grantUserPermission,
  listUserPermissions,
  revokeUserPermission,
} from '@/lib/api/admin-data';

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

    return NextResponse.json({ permissions });
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

  try {
    const body = await request.json();
    const { user_id, role, module, action, expires_at } = body;

    if (!user_id || !module || !action) {
      return NextResponse.json(
        { error: 'user_id, módulo y acción son obligatorios' },
        { status: 400 }
      );
    }

    const permission = await grantUserPermission({
      organizationId: auth.organizationId,
      userId: user_id,
      role,
      module,
      action,
      expiresAt: expires_at || null,
      grantedBy: auth.user.id,
    });

    return NextResponse.json({ permission }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo otorgar el permiso';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { permission_id } = body;

    if (!permission_id) {
      return NextResponse.json({ error: 'permission_id es obligatorio' }, { status: 400 });
    }

    await revokeUserPermission({
      organizationId: auth.organizationId,
      permissionId: permission_id,
    });

    return NextResponse.json({ message: 'Permiso revocado' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo revocar el permiso';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
