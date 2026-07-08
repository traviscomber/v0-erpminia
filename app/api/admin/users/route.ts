export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/guard';
import {
  createOrganizationUser,
  deleteOrganizationUser,
  listOrganizationUsers,
  updateOrganizationUserRole,
} from '@/lib/api/admin-data';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const users = await listOrganizationUsers(auth.organizationId);
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los usuarios';
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
    const { email, password, full_name, cargo_id } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    if (!cargo_id) {
      return NextResponse.json({ error: 'Debes seleccionar un cargo' }, { status: 400 });
    }

    const user = await createOrganizationUser({
      organizationId: auth.organizationId,
      email,
      password,
      fullName: full_name,
      cargoId: cargo_id,
      assignedBy: auth.user.id,
    });

    return NextResponse.json({ message: 'Usuario creado', user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el usuario';
    const status = message === 'User already exists' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized || !auth.user || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId y role son obligatorios' }, { status: 400 });
    }

    const updated = await updateOrganizationUserRole({
      organizationId: auth.organizationId,
      userId,
      role,
      assignedBy: auth.user.id,
    });

    return NextResponse.json({ message: 'Rol actualizado', user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el rol';
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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId es obligatorio' }, { status: 400 });
    }

    await deleteOrganizationUser({
      organizationId: auth.organizationId,
      userId,
    });

    return NextResponse.json({ message: 'Usuario eliminado' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el usuario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
